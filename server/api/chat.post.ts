import Anthropic from '@anthropic-ai/sdk'
import { 
  getProjectSession, 
  parseMemoryUpdates,
  parseQuestionBacklog,
  updateMemory,
  updateQuestionBacklog
} from '../utils/memory'
import { buildSystemPrompt, shouldTriggerCapability, processResponse } from '../utils/reasoningEngine'
import { getCapabilityPrompt } from '../utils/capabilities'
import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const { message, conversationHistory, projectId, conversationId, locale } = await readBody(event)

  console.log('🔵 [API] Message received:', message)
  console.log('🔵 [API] History:', conversationHistory?.length || 0, 'messages')
  console.log('🔵 [API] Project ID:', projectId)
  console.log('🔵 [API] Conversation ID:', conversationId)

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conversation ID is required. Please select or create a conversation.'
    })
  }

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required. Please select a project.'
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
    // Load session from Supabase (or cache) - now async
    // Uses projectId as the key to ensure all conversations in a project share memory
    const session = await getProjectSession(projectId, event)
    
    console.log('🔄 [SESSION] Project ID:', projectId)
    console.log('🔄 [SESSION] Memory:', JSON.stringify(session.memory.project, null, 2))
    console.log('🔄 [SESSION] Questions pending:', session.questions.filter(q => q.status === 'pending').length)

    // Get or create conversation in Supabase
    const supabase = getSupabaseClient(event)
    let dbConversationId: string = conversationId
    let isFirstMessage = false
    
    try {
      // Check if conversation exists and get its details
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('id, name')
        .eq('id', conversationId)
        .single() as { data: { id: string; name: string | null } | null; error: any }

      if (findError || !existingConversation) {
        console.error('❌ [SUPABASE] Conversation not found:', conversationId)
        throw createError({
          statusCode: 404,
          statusMessage: 'Conversation not found'
        })
      }

      dbConversationId = existingConversation.id
      console.log('💾 [SUPABASE] Found existing conversation:', dbConversationId)

      // Check if this is the first message in the conversation
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', dbConversationId)

      isFirstMessage = !countError && count === 0
      console.log('💾 [SUPABASE] Is first message:', isFirstMessage)

      // Save user message to Supabase
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: dbConversationId,
          content: message,
          role: 'user'
        } as any)

      if (messageError) {
        console.error('❌ [SUPABASE] Error saving user message:', messageError)
      } else {
        console.log('💾 [SUPABASE] Saved user message')
      }

      // Auto-name conversation based on first message (first 50 chars)
      if (isFirstMessage && existingConversation.name === 'New Conversation') {
        const autoName = message.substring(0, 50).trim() + (message.length > 50 ? '...' : '')
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ name: autoName } as any)
          .eq('id', dbConversationId)

        if (updateError) {
          console.error('❌ [SUPABASE] Error auto-naming conversation:', updateError)
        } else {
          console.log('💾 [SUPABASE] Auto-named conversation:', autoName)
        }
      }
    } catch (supabaseError: any) {
      // Re-throw if it's a 404 error
      if (supabaseError.statusCode === 404) {
        throw supabaseError
      }
      // Don't fail the request if other Supabase operations fail, just log it
      console.error('❌ [SUPABASE] Error in Supabase operations:', supabaseError)
    }

    // Check if a capability should be triggered
    const capabilityCheck = shouldTriggerCapability(projectId, message)
    console.log('🎯 [CAPABILITY]', capabilityCheck.reason)

    // Build system prompt
    let systemPrompt = await buildSystemPrompt(projectId, useCache, locale || 'en', event)
    
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
          // Send project ID as metadata at the start
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: { projectId } })}\n\n`))
          
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
          const { cleanResponse, memoryUpdated, backlogUpdated } = await processResponse(projectId, fullResponse, event)
          
          if (memoryUpdated) {
            console.log('🧠 [SESSION] Memory updated from response')
          }
          if (backlogUpdated) {
            console.log('📝 [SESSION] Question backlog updated')
          }

          // Save assistant response to Supabase
          if (dbConversationId && fullResponse) {
            try {
              const { error: assistantMessageError } = await supabase
                .from('messages')
                .insert({
                  conversation_id: dbConversationId,
                  content: fullResponse,
                  role: 'assistant'
                } as any)

              if (assistantMessageError) {
                console.error('❌ [SUPABASE] Error saving assistant message:', assistantMessageError)
              } else {
                console.log('💾 [SUPABASE] Saved assistant message')
              }
            } catch (supabaseError) {
              console.error('❌ [SUPABASE] Error saving assistant message:', supabaseError)
            }
          }

          // Create challenge if a capability was triggered (action plan or diagnostic)
          if (capabilityCheck.capability && fullResponse && projectId) {
            try {
              // Check if this is an action plan or diagnostic capability
              const isActionPlan = capabilityCheck.capability === 'action_plan'
              const isDiagnostic = capabilityCheck.capability === 'flash_diagnostic'

              if (isActionPlan || isDiagnostic) {
                // Extract title from response (look for markdown headers first)
                let title = ''
                const h2Match = fullResponse.match(/^##\s+(.+)$/m)
                const h1Match = fullResponse.match(/^#\s+(.+)$/m)
                
                if (h2Match) {
                  title = h2Match[1].trim()
                } else if (h1Match) {
                  title = h1Match[1].trim()
                } else {
                  // Fallback: use first non-empty line or default title
                  const firstLine = fullResponse.split('\n').find(line => line.trim().length > 0 && !line.trim().startsWith('<'))
                  title = firstLine ? firstLine.trim().substring(0, 100) : 
                    (isActionPlan ? 'Action Plan' : 'Flash Diagnostic')
                }

                // Calculate expiration date (7 days from now)
                const expiresAt = new Date()
                expiresAt.setDate(expiresAt.getDate() + 7)

                console.log('📄 [CHALLENGES] Creating document:', {
                  type: isActionPlan ? 'action_plan' : 'flash_diagnostic',
                  title: title.substring(0, 50),
                  projectId
                })

                // Create challenge directly using Supabase (linked to project only)
                const { data: newChallenge, error: challengeError } = await supabase
                  .from('challenges')
                  .insert({
                    project_id: projectId,
                    document_type: isActionPlan ? 'action_plan' : 'flash_diagnostic',
                    title,
                    content: fullResponse,
                    expires_at: expiresAt.toISOString()
                  } as any)
                  .select()
                  .single() as { data: any; error: any }

                if (challengeError) {
                  console.error('❌ [CHALLENGES] Failed to create challenge:', challengeError)
                } else {
                  console.log('✅ [CHALLENGES] Created challenge:', newChallenge?.id)
                  // Trigger refresh event for DocumentsPanel
                  // Note: This will be picked up by the auto-refresh mechanism
                }
              }
            } catch (challengeError) {
              // Don't fail the request if challenge creation fails
              console.error('❌ [CHALLENGES] Error creating challenge:', challengeError)
            }
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
