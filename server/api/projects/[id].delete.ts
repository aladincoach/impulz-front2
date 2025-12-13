import { getSupabaseClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID is required'
      })
    }

    const supabase = getSupabaseClient(event)
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting project:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete project'
      })
    }

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error deleting project'
    })
  }
})

