import { getSupabaseClient } from '../utils/supabase'

/**
 * Get challenges/documents for a project
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { projectId } = query

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'projectId is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }) as { data: any[]; error: any }

    if (error) {
      console.error('❌ [CHALLENGES] Error fetching challenges:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch challenges'
      })
    }

    return { challenges: data || [] }
  } catch (error: any) {
    console.error('❌ [CHALLENGES] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch challenges'
    })
  }
})
