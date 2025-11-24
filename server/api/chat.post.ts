import Anthropic from '@anthropic-ai/sdk'
import { getSystemPromptFromNotion } from '../utils/notion'
import { getWorkflowPrompt } from '../utils/systemPrompt'

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
  const apiKey = process.env.ANTHROPIC_API_KEY // ✅ lu à l'exécution, pas au build
  if (!apiKey) return { statusCode: 500, body: 'Missing ANTHROPIC_API_KEY' }

  console.log('✅ [API] API Key présente (length:', apiKey.length, ')')
  console.log('⚙️  [CONFIG] Cache system prompt:', useCache ? 'activé (hardcoded)' : 'désactivé (from Notion)')

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

    // Charger le system prompt (hardcoded si cache activé, sinon depuis Notion)
    let systemPrompt: string
    if (useCache) {
      // Utiliser le system prompt hardcodé depuis system-prompt.md
      systemPrompt = getWorkflowPrompt()
      console.log('📝 [DEBUG] Using hardcoded system prompt from system-prompt.md')
    } else {
      // Charger le system prompt depuis Notion
      systemPrompt = await getSystemPromptFromNotion(useCache)
      console.log('📝 [DEBUG] System prompt fetched from Notion')
    }
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

