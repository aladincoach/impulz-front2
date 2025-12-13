import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const { project_id, name } = await readBody(event)

    if (!project_id || typeof project_id !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID is required'
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
      .insert({ project_id, name: name.trim() } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating topic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create topic'
      })
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error creating topic'
    })
  }
})

