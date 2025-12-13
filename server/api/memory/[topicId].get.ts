import { getSession } from '../../utils/memory'
import { getSupabaseClient } from '../../utils/supabase'

/**
 * Get project memory for a topic
 */
export default defineEventHandler(async (event) => {
  const topicId = getRouterParam(event, 'topicId')

  if (!topicId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'topicId is required'
    })
  }

  try {
    const supabase = getSupabaseClient(event)
    
    // Get session_id from conversations table - this is the source of truth
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('session_id')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { session_id: string } | null; error: any }

    // If no conversation exists yet, return empty memory
    if (!conversation?.session_id) {
      console.log('⚠️ [MEMORY] No conversation found for topic:', topicId)
      return {
        memory: {
          project: {},
          progress: {
            activities: [],
            milestones: []
          },
          user: {
            skills: [],
            assets: [],
            constraints: {}
          }
        },
        questions: []
      }
    }

    // Use the exact session_id from the conversation
    const sessionId = conversation.session_id
    console.log('🔍 [MEMORY] Fetching memory for session:', sessionId)
    
    // Get session - this will return existing session or create a new one
    // But since we have a conversation, the session should already exist
    const session = getSession(sessionId)
    
    console.log('📊 [MEMORY] Memory retrieved:', {
      projectName: session.memory.project?.name,
      projectPhase: session.memory.project?.phase,
      activitiesCount: session.memory.progress?.activities?.length || 0,
      skillsCount: session.memory.user?.skills?.length || 0
    })
    
    return {
      memory: session.memory,
      questions: session.questions
    }
  } catch (error: any) {
    console.error('❌ [MEMORY] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch memory'
    })
  }
})

