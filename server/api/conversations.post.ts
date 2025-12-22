import { getSupabaseClient } from '../utils/supabase'

/**
 * Create a new conversation
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { project_id, name } = body

  if (!project_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'project_id is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    // Generate a unique session_id for this conversation
    const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        project_id,
        name: name || 'New Conversation',
        session_id: sessionId
      } as any)
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('❌ [CONVERSATIONS] Error creating conversation:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create conversation'
      })
    }

    return data
  } catch (error: any) {
    console.error('❌ [CONVERSATIONS] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create conversation'
    })
  }
})

