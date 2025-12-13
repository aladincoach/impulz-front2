import { getSupabaseClient } from '../../../utils/supabase'

/**
 * Validate a challenge
 */
export default defineEventHandler(async (event) => {
  const challengeId = getRouterParam(event, 'id')

  if (!challengeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Challenge ID is required'
    })
  }

  const supabase = getSupabaseClient(event)

  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({
        validated_at: new Date().toISOString()
      } as any)
      .eq('id', challengeId)
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('❌ [CHALLENGES] Error validating challenge:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to validate challenge'
      })
    }

    return { success: true, challenge: data }
  } catch (error: any) {
    console.error('❌ [CHALLENGES] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to validate challenge'
    })
  }
})

