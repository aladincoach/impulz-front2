import Anthropic from '@anthropic-ai/sdk'
import { 
  getSession, 
  generateSessionId,
  parseMemoryUpdates,
  parseQuestionBacklog,
  updateMemory,
  updateQuestionBacklog
} from '../utils/memory'
import { buildSystemPrompt, shouldTriggerCapability, processResponse } from '../utils/reasoningEngine'
import { getCapabilityPrompt } from '../utils/capabilities'

export default defineEventHandler(async (event) => {
  const { message, conversationHistory, sessionId: providedSessionId } = await readBody(event)

  console.log('🔵 [API] Message received:', message)
  console.log('🔵 [API] History:', conversationHistory?.length || 0, 'messages')

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  const config = useRuntimeConfig(event)
  const useCache = config.systemPromptCache
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { statusCode: 500, body: 'Missing ANTHROPIC_API_KEY' }

  console.log('✅ [API] API Key present (length:', apiKey.length, ')')

  const client = new Anthropic({
    apiKey: apiKey
  })

  try {
    // Get or create session
    const sessionId = providedSessionId || generateSessionId(conversationHistory)
    const session = getSession(sessionId)
    
    console.log('🔄 [SESSION] ID:', sessionId)
    console.log('🔄 [SESSION] Memory:', JSON.stringify(session.memory.project, null, 2))
    console.log('🔄 [SESSION] Questions pending:', session.questions.filter(q => q.status === 'pending').length)

    // Check if a capability should be triggered
    const capabilityCheck = shouldTriggerCapability(sessionId, message)
    console.log('🎯 [CAPABILITY]', capabilityCheck.reason)

    // Build system prompt
    let systemPrompt = await buildSystemPrompt(sessionId, useCache)
    
    // Add capability-specific instructions if triggered
    if (capabilityCheck.capability) {
      const capabilityPrompt = getCapabilityPrompt(capabilityCheck.capability, session.memory)
      systemPrompt = `${systemPrompt}\n\n${capabilityPrompt}`
      console.log('🎯 [CAPABILITY] Added prompt for:', capabilityCheck.capability)
    }

    console.log('📝 [DEBUG] System prompt length:', systemPrompt.length, 'chars')

    // Build conversation messages for Claude
    const messages: Anthropic.MessageParam[] = []
    
    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { text: string; isUser: boolean }) => {
        messages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        })
      })
    }
    
    // Add the new user message
    messages.push({
      role: 'user',
      content: message
    })

    console.log('📤 [API] Sending to Claude with', messages.length, 'messages')

    // Create stream with Claude
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    })

    console.log('✅ [API] Stream created, starting streaming...')

    // Set up response headers for SSE
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // Create response stream
    const encoder = new TextEncoder()
    let chunkCount = 0
    let fullResponse = ''
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID at the start
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: { sessionId } })}\n\n`))
          
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              chunkCount++
              if (chunkCount === 1) {
                console.log('🟢 [API] First chunk received from Claude!')
              }
              // Send text in SSE format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          console.log('✅ [API] Streaming complete -', chunkCount, 'chunks sent')
          
          // Post-process: update session state from response
          const { cleanResponse, memoryUpdated, backlogUpdated } = processResponse(sessionId, fullResponse)
          
          if (memoryUpdated) {
            console.log('🧠 [SESSION] Memory updated from response')
          }
          if (backlogUpdated) {
            console.log('📝 [SESSION] Question backlog updated')
          }
          
          // Send done signal
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
