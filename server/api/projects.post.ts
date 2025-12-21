import { getSupabaseClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const { name } = await readBody(event)

    if (!name || typeof name !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project name is required'
      })
    }

    const supabase = getSupabaseClient(event)
    
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim() } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create project'
      })
    }

    return data
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error creating project'
    })
  }
})


