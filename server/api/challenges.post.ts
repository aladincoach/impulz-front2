import { getSupabaseClient } from '../utils/supabase'

/**
 * Create a challenge/document when a capability is generated
 */
export default defineEventHandler(async (event) => {
  const { topicId, projectId, documentType, title, content } = await readBody(event)

  if (!topicId || !documentType || !title || !content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: topicId, documentType, title, content'
    })
  }

  // Validate document type
  const validTypes = ['action_plan', 'flash_diagnostic', 'other']
  if (!validTypes.includes(documentType)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid documentType. Must be one of: ${validTypes.join(', ')}`
    })
  }

  const supabase = getSupabaseClient(event)

  // Calculate expiration date (7 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  try {
    const { data, error } = await supabase
      .from('challenges')
      .insert({
        topic_id: topicId,
        project_id: projectId || null,
        document_type: documentType,
        title,
        content,
        expires_at: expiresAt.toISOString()
      } as any)
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('❌ [CHALLENGES] Error creating challenge:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create challenge'
      })
    }

    return { success: true, challenge: data }
  } catch (error: any) {
    console.error('❌ [CHALLENGES] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create challenge'
    })
  }
})


