import { getSession } from '../../utils/memory'

/**
 * Get project memory for a project
 * Memory is scoped per project and shared across all conversations
 * The session ID is simply `project_{projectId}` to ensure consistency
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
    // Session ID is directly derived from projectId
    // This ensures all conversations in a project share the same memory
    const sessionId = `project_${projectId}`
    console.log('🔍 [MEMORY] Fetching memory for session:', sessionId)
    
    // Get session - this will return existing session or create a new one
    const session = getSession(sessionId)
    
    console.log('📊 [MEMORY] Memory retrieved:', {
      projectName: session.memory.project?.name,
      projectPhase: session.memory.project?.phase,
      activitiesCount: session.memory.progress?.activities?.length || 0,
      skillsCount: session.memory.user?.skills?.length || 0
    })
    
    return {
      memory: session.memory,
      questions: session.questions
    }
  } catch (error: any) {
    console.error('❌ [MEMORY] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch memory'
    })
  }
})
