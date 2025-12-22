import { getSupabaseClient } from '../../utils/supabase'

/**
 * Get project memory for a project
 * Memory is loaded directly from Supabase for cross-device sync
 */
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'projectId is required'
    })
  }

  try {
    const supabase = getSupabaseClient(event)
    
    // Load memory directly from Supabase
    const { data, error } = await supabase
      .from('project_memory')
      .select('memory, questions, updated_at')
      .eq('project_id', projectId)
      .single() as { data: any; error: any }
    
    if (error) {
      // If not found, return empty default memory
      if (error.code === 'PGRST116') {
        console.log('📊 [MEMORY] No memory found for project, returning defaults:', projectId)
        return {
          memory: {
            project: {},
            progress: { activities: [], milestones: [] },
            user: { skills: [], assets: [], constraints: {} }
          },
          questions: []
        }
      }
      
      console.error('❌ [MEMORY] Error loading from Supabase:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch memory'
      })
    }
    
    console.log('📊 [MEMORY] Memory retrieved from Supabase:', {
      projectName: data.memory?.project?.name,
      projectPhase: data.memory?.project?.phase,
      activitiesCount: data.memory?.progress?.activities?.length || 0,
      skillsCount: data.memory?.user?.skills?.length || 0,
      updatedAt: data.updated_at
    })
    
    return {
      memory: data.memory || {
        project: {},
        progress: { activities: [], milestones: [] },
        user: { skills: [], assets: [], constraints: {} }
      },
      questions: data.questions || []
    }
  } catch (error: any) {
    console.error('❌ [MEMORY] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch memory'
    })
  }
})
