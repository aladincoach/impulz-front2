import { getSupabaseClient } from '../utils/supabase'

/**
 * Get challenges/documents for a topic
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { topicId, projectId } = query

  if (!topicId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'topicId is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    let queryBuilder = supabase
      .from('challenges')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })

    if (projectId) {
      queryBuilder = queryBuilder.eq('project_id', projectId)
    }

    const { data, error } = await queryBuilder as { data: any[]; error: any }

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


