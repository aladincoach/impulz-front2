import Anthropic from '@anthropic-ai/sdk'
import { getSystemPromptFromNotion } from '../utils/notion'
import { getBaseSystemPrompt } from '../utils/basePrompt'
import { 
  getConversationState, 
  setConversationState, 
  generateSessionId 
} from '../utils/conversationStateManager'
import { 
  getStagePrompt, 
  updateConversationState, 
  parseAssistantResponse 
} from '../utils/workflowEngine'

export default defineEventHandler(async (event) => {
  const { message, conversationHistory, sessionId: providedSessionId } = await readBody(event)

  console.log('🔵 [API] Message reçu:', message)
  console.log('🔵 [API] Historique:', conversationHistory?.length || 0, 'messages')

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  const config = useRuntimeConfig(event)
  const useWorkflow = config.public?.useWorkflow !== false // Default to true
  const useCache = config.systemPromptCache
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { statusCode: 500, body: 'Missing ANTHROPIC_API_KEY' }

  console.log('✅ [API] API Key présente (length:', apiKey.length, ')')
  console.log('⚙️  [CONFIG] Workflow mode:', useWorkflow ? 'activé (stage-based)' : 'désactivé (monolithic)')
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

    // Construire le system prompt selon le mode
    let systemPrompt: string
    
    if (useWorkflow) {
      // Mode workflow: utiliser base prompt + stage prompt
      const sessionId = providedSessionId || generateSessionId(conversationHistory)
      const conversationState = getConversationState(sessionId)
      
      console.log('🔄 [WORKFLOW] Session:', sessionId)
      console.log('🔄 [WORKFLOW] Current stage:', conversationState.currentStage)
      console.log('🔄 [WORKFLOW] Completed stages:', conversationState.completedStages.join(', '))
      
      // Load prompts (async - tries Notion first, falls back to hardcoded)
      const basePrompt = await getBaseSystemPrompt(useCache)
      const stagePrompt = await getStagePrompt(conversationState, useCache)
      
      systemPrompt = `${basePrompt}\n\n---\n\n${stagePrompt}`
      
      console.log('📝 [DEBUG] Using workflow-based system prompt')
      console.log('📝 [DEBUG] Stage:', conversationState.currentStage)
    } else if (useCache) {
      // Mode legacy avec cache
      const { getWorkflowPrompt } = await import('../utils/systemPrompt')
      systemPrompt = getWorkflowPrompt()
      console.log('📝 [DEBUG] Using hardcoded system prompt from system-prompt.md')
    } else {
      // Mode legacy depuis Notion
      systemPrompt = await getSystemPromptFromNotion(useCache)
      console.log('📝 [DEBUG] System prompt fetched from Notion')
    }
    
    console.log('📝 [DEBUG] System prompt type:', typeof systemPrompt)
    console.log('📝 [DEBUG] System prompt length:', systemPrompt.length, 'chars')
    console.log('📝 [DEBUG] System prompt preview:', systemPrompt.substring(0, 100))

    // Créer le stream avec Claude - Utilisation du modèle correct  
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      temperature: 0.0,
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
    let fullResponse = '' // Accumuler la réponse pour le parsing
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              chunkCount++
              if (chunkCount === 1) {
                console.log('🟢 [API] Premier chunk reçu de Claude!')
              }
              // Envoyer le texte en format SSE
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          console.log('✅ [API] Streaming terminé -', chunkCount, 'chunks envoyés')
          
          // Post-traitement: mettre à jour l'état de la conversation si en mode workflow
          if (useWorkflow) {
            const sessionId = providedSessionId || generateSessionId(conversationHistory)
            const conversationState = getConversationState(sessionId)
            
            // Parser la réponse pour extraire les données structurées
            const extractedData = parseAssistantResponse(fullResponse, conversationState.currentStage)
            
            // Mettre à jour l'état de la conversation
            const updatedState = updateConversationState(conversationState, extractedData)
            setConversationState(sessionId, updatedState)
            
            console.log('🔄 [WORKFLOW] State updated')
            console.log('🔄 [WORKFLOW] New stage:', updatedState.currentStage)
            console.log('🔄 [WORKFLOW] Extracted data:', JSON.stringify(extractedData, null, 2))
          }
          
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

