import Anthropic from '@anthropic-ai/sdk'

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

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('❌ [API] ANTHROPIC_API_KEY not configured')
    throw createError({
      statusCode: 500,
      statusMessage: 'ANTHROPIC_API_KEY not configured'
    })
  }

  console.log('✅ [API] API Key présente (length:', apiKey.length, ')')

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
    // Modèles disponibles: claude-3-5-sonnet-20240620, claude-3-opus-20240229, claude-3-sonnet-20240229
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
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

