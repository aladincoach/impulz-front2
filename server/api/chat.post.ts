import Anthropic from '@anthropic-ai/sdk'
import type { Handler } from '@netlify/functions'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

// Cache global pour le system prompt (si activé)
let systemPromptCache: string | null = null
//
// Obtenir le chemin du fichier actuel
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Fonction pour charger le system prompt
function getSystemPrompt(useCache: boolean): string {
  const promptPath = join(__dirname, '..', '..', 'prompts', 'system-prompt.md')
  
  // Si le cache est désactivé, recharger le fichier à chaque fois
  if (!useCache) {
    try {
      const prompt = readFileSync(promptPath, 'utf8')
      console.log('🔄 [RELOAD] System prompt rechargé (cache désactivé)')
      return prompt
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      console.error('❌ [ERROR] Chemin tenté:', promptPath)
      throw error
    }
  }

  // Si le cache est activé, charger une seule fois
  if (systemPromptCache === null) {
    try {
      systemPromptCache = readFileSync(promptPath, 'utf8')
      console.log('✅ [CACHE] System prompt chargé et mis en cache')
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      console.error('❌ [ERROR] Chemin tenté:', promptPath)
      throw error
    }
  }
  return systemPromptCache
}

export default defineEventHandler(async (event) => {
  const { message, conversationHistory } = await readBody(event)

  console.log('🔵 [API] Message reçu:', message)
  console.log('🔵 [API] Historique:', conversationHistory?.length || 0, 'messages')

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  const config = useRuntimeConfig(event)
  const useCache = config.systemPromptCache
  const apiKey = process.env.ANTHROPIC_API_KEY // ✅ lu à l’exécution, pas au build
  if (!apiKey) return { statusCode: 500, body: 'Missing ANTHROPIC_API_KEY' }

  console.log('✅ [API] API Key présente (length:', apiKey.length, ')')
  console.log('⚙️  [CONFIG] Cache system prompt:', useCache ? 'activé' : 'désactivé')

  const client = new Anthropic({
    apiKey: apiKey
  })

  try {
    // Construire l'historique de conversation pour Claude
    const messages: Anthropic.MessageParam[] = []
    
    // Ajouter l'historique si présent
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { text: string; isUser: boolean }) => {
        messages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        })
      })
    }
    
    // Ajouter le nouveau message utilisateur
    messages.push({
      role: 'user',
      content: message
    })

    console.log('📤 [API] Envoi à Claude avec', messages.length, 'messages')

    // Créer le stream avec Claude - Utilisation du modèle correct
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: getSystemPrompt(useCache),
      messages: messages
    })

    console.log('✅ [API] Stream créé avec succès, début du streaming...')

    // Configurer la réponse pour le streaming
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // Créer un stream de réponse
    const encoder = new TextEncoder()
    let chunkCount = 0
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              chunkCount++
              if (chunkCount === 1) {
                console.log('🟢 [API] Premier chunk reçu de Claude!')
              }
              // Envoyer le texte en format SSE
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          console.log('✅ [API] Streaming terminé -', chunkCount, 'chunks envoyés')
          // Envoyer le signal de fin
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('❌ [API] Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return readableStream
  } catch (error: any) {
    console.error('❌ [API] Claude API error:', error)
    console.error('❌ [API] Error status:', error.status)
    console.error('❌ [API] Error message:', error.message)
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Error communicating with Claude'
    })
  }
})

