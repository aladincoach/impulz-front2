import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const topicId = query.topic_id as string | undefined
    const projectId = query.project_id as string | undefined
    const sessionId = query.session_id as string | undefined

    if (!topicId && !projectId && !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'topic_id, project_id, or session_id is required'
      })
    }

    const supabase = getSupabaseClient(event)
    
    // Find conversation
    let queryBuilder = supabase
      .from('conversations')
      .select('id')
      .limit(1)

    if (topicId) {
      queryBuilder = queryBuilder.eq('topic_id', topicId)
    }
    if (projectId) {
      queryBuilder = queryBuilder.eq('project_id', projectId)
    }
    if (sessionId) {
      queryBuilder = queryBuilder.eq('session_id', sessionId)
    }

    const { data: conversation, error: convError } = await queryBuilder.single() as { data: { id: string } | null; error: any }

    if (convError || !conversation) {
      // No conversation found - return empty messages
      return { messages: [] }
    }

    // Load messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch messages'
      })
    }

    return {
      conversation_id: conversation.id,
      messages: (messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        text: msg.content,
        role: msg.role,
        created_at: msg.created_at
      }))
    }
  } catch (error: any) {
    if (error.statusCode === 400) {
      throw error
    }
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error fetching conversation'
    })
  }
})


