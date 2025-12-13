import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const { name } = await readBody(event)

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    if (!name || typeof name !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic name is required'
      })
    }

    const supabase = getSupabaseClient(event)
    
    const { data, error } = await supabase
      .from('topics')
      .update({ name: name.trim() } as any)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating topic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update topic'
      })
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error updating topic'
    })
  }
})

