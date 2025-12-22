import { getSupabaseClient } from '../../utils/supabase'

/**
 * Delete a conversation and its messages
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conversation ID is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    // Delete the conversation (messages will be cascade deleted due to FK constraint)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ [CONVERSATIONS] Error deleting conversation:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete conversation'
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ [CONVERSATIONS] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete conversation'
    })
  }
})

