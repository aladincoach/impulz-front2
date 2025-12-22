import { getSupabaseClient } from '../../utils/supabase'

/**
 * Update a conversation (e.g., rename)
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { name } = body

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conversation ID is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('❌ [CONVERSATIONS] Error updating conversation:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update conversation'
      })
    }

    return data
  } catch (error: any) {
    console.error('❌ [CONVERSATIONS] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update conversation'
    })
  }
})

