import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const projectId = query.project_id as string | undefined

    const supabase = getSupabaseClient(event)
    
    let queryBuilder = supabase
      .from('topics')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      queryBuilder = queryBuilder.eq('project_id', projectId)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching topics:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch topics'
      })
    }

    return data || []
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error fetching topics'
    })
  }
})

