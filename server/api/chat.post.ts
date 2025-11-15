import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Cache global pour le system prompt (si activé)
let systemPromptCache: string | null = null

// Fonction pour charger le system prompt
async function getSystemPrompt(useCache: boolean): Promise<string> {
  // Si le cache est désactivé, recharger le fichier à chaque fois
  if (!useCache) {
    try {
      const prompt = await loadPromptFile()
      console.log('🔄 [RELOAD] System prompt rechargé (cache désactivé)')
      console.log('📝 [DEBUG] Prompt length:', prompt.length)
      return prompt
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      throw error
    }
  }

  // Si le cache est activé, charger une seule fois
  if (systemPromptCache === null) {
    try {
      systemPromptCache = await loadPromptFile()
      console.log('✅ [CACHE] System prompt chargé et mis en cache')
      console.log('📝 [DEBUG] Prompt length:', systemPromptCache.length)
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      throw error
    }
  }
  return systemPromptCache
}

// Fonction pour charger le fichier prompt depuis différents emplacements
async function loadPromptFile(): Promise<string> {
  // Essayer d'abord avec useStorage (pour le dev local et si serverAssets fonctionne)
  try {
    const storage = useStorage('assets:prompts')
    const prompt = await storage.getItem('system-prompt.md')
    if (prompt && typeof prompt === 'string') {
      console.log('✅ [LOAD] Prompt chargé via useStorage')
      return prompt
    }
  } catch (error) {
    console.log('⚠️  [LOAD] useStorage failed, trying file system...')
  }

  // Fallback: essayer de lire directement depuis le système de fichiers
  const possiblePaths = [
    join(process.cwd(), 'prompts', 'system-prompt.md'),
    join(process.cwd(), '..', '..', 'prompts', 'system-prompt.md'),
    join(__dirname, '..', '..', 'prompts', 'system-prompt.md'),
  ]

  for (const path of possiblePaths) {
    try {
      if (existsSync(path)) {
        const prompt = readFileSync(path, 'utf8')
        console.log('✅ [LOAD] Prompt chargé depuis:', path)
        return prompt
      }
    } catch (error) {
      console.log('⚠️  [LOAD] Path failed:', path)
    }
  }

  throw new Error('Unable to load system prompt from any location')
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

    // Charger le system prompt
    const systemPrompt = await getSystemPrompt(useCache)
    console.log('📝 [DEBUG] System prompt type:', typeof systemPrompt)
    console.log('📝 [DEBUG] System prompt preview:', systemPrompt.substring(0, 100))

    // Créer le stream avec Claude - Utilisation du modèle correct
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
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

