import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  project_id: string
  name: string
  session_id: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

const projects = ref<Project[]>([])
const conversations = ref<Conversation[]>([])
const currentProjectId = ref<string | null>(null)
const currentConversationId = ref<string | null>(null)
const isLoading = ref(false)

export const useProjects = () => {
  const { t } = useI18n()
  
  // Load all projects with their conversations
  const loadProjects = async () => {
    isLoading.value = true
    try {
      // Load projects
      const projectsResponse = await $fetch<Project[]>('/api/projects').catch(() => [])
      projects.value = projectsResponse || []

      // Load conversations for all projects
      if (projects.value.length > 0) {
        const allConversations: Conversation[] = []
        for (const project of projects.value) {
          const convResponse = await $fetch<{ conversations: Conversation[] }>(`/api/conversations?project_id=${project.id}&list=true`).catch(() => ({ conversations: [] }))
          allConversations.push(...(convResponse.conversations || []))
        }
        conversations.value = allConversations
      }

      // If no projects exist, create a default one
      if (projects.value.length === 0) {
        const defaultName = t('projects.defaultName', 'New Project')
        const defaultProject = await createProject(defaultName)
        if (defaultProject) {
          projects.value = [defaultProject]
          currentProjectId.value = defaultProject.id
        }
      } else if (!currentProjectId.value) {
        // Set first project as current if none selected
        currentProjectId.value = projects.value[0].id
      }

      // If current project has no conversations, create a default conversation
      if (currentProjectId.value) {
        const projectConversations = getConversationsForProject(currentProjectId.value)
        if (projectConversations.length === 0) {
          const defaultName = t('conversations.defaultName', 'New Conversation')
          const defaultConversation = await createConversation(currentProjectId.value, defaultName)
          if (defaultConversation) {
            conversations.value.push(defaultConversation)
            currentConversationId.value = defaultConversation.id
          }
        } else if (!currentConversationId.value) {
          // Set first conversation as current if none selected
          currentConversationId.value = projectConversations[0].id
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      // Fallback: create a default project if loading fails
      if (projects.value.length === 0) {
        try {
          const defaultProjectName = t('projects.defaultName', 'New Project')
          const defaultProject = await createProject(defaultProjectName)
          if (defaultProject) {
            projects.value = [defaultProject]
            currentProjectId.value = defaultProject.id
            const defaultConversationName = t('conversations.defaultName', 'New Conversation')
            const defaultConversation = await createConversation(defaultProject.id, defaultConversationName)
            if (defaultConversation) {
              conversations.value.push(defaultConversation)
              currentConversationId.value = defaultConversation.id
            }
          }
        } catch (createError) {
          console.error('Error creating default project:', createError)
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  // Create a new project
  const createProject = async (name: string): Promise<Project | null> => {
    try {
      const project = await $fetch<Project>('/api/projects', {
        method: 'POST',
        body: { name }
      })
      projects.value.push(project)
      return project
    } catch (error) {
      console.error('Error creating project:', error)
      return null
    }
  }

  // Update project name
  const updateProject = async (id: string, name: string): Promise<boolean> => {
    try {
      const updated = await $fetch<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: { name }
      })
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updated
      }
      return true
    } catch (error) {
      console.error('Error updating project:', error)
      return false
    }
  }

  // Delete project
  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      })
      projects.value = projects.value.filter(p => p.id !== id)
      conversations.value = conversations.value.filter(c => c.project_id !== id)
      
      // If deleted project was current, switch to first available
      if (currentProjectId.value === id) {
        currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
        if (currentProjectId.value) {
          const projectConversations = getConversationsForProject(currentProjectId.value)
          currentConversationId.value = projectConversations.length > 0 ? projectConversations[0].id : null
        } else {
          currentConversationId.value = null
        }
      }
      return true
    } catch (error) {
      console.error('Error deleting project:', error)
      return false
    }
  }

  // Create a new conversation
  const createConversation = async (projectId: string, name?: string): Promise<Conversation | null> => {
    try {
      const conversation = await $fetch<Conversation>('/api/conversations', {
        method: 'POST',
        body: { project_id: projectId, name: name || 'New Conversation' }
      })
      conversations.value.push(conversation)
      return conversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  // Update conversation name
  const updateConversation = async (id: string, name: string): Promise<boolean> => {
    try {
      const updated = await $fetch<Conversation>(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: { name }
      })
      const index = conversations.value.findIndex(c => c.id === id)
      if (index !== -1) {
        conversations.value[index] = updated
      }
      return true
    } catch (error) {
      console.error('Error updating conversation:', error)
      return false
    }
  }

  // Delete conversation
  const deleteConversation = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      })
      conversations.value = conversations.value.filter(c => c.id !== id)
      
      // If deleted conversation was current, switch to first available in project
      if (currentConversationId.value === id && currentProjectId.value) {
        const projectConversations = getConversationsForProject(currentProjectId.value)
        currentConversationId.value = projectConversations.length > 0 ? projectConversations[0].id : null
      }
      return true
    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }

  // Get conversations for a project
  const getConversationsForProject = (projectId: string): Conversation[] => {
    return conversations.value.filter(c => c.project_id === projectId)
  }

  // Set current project
  const setCurrentProject = async (projectId: string) => {
    const { t } = useI18n()
    currentProjectId.value = projectId
    const projectConversations = getConversationsForProject(projectId)
    
    // If no conversations exist, create a default one
    if (projectConversations.length === 0) {
      const defaultName = t('conversations.defaultName', 'New Conversation')
      const defaultConversation = await createConversation(projectId, defaultName)
      if (defaultConversation) {
        currentConversationId.value = defaultConversation.id
      }
    } else {
      // Set first conversation as current
      currentConversationId.value = projectConversations[0].id
    }
  }

  // Set current conversation
  const setCurrentConversation = (conversationId: string) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      currentConversationId.value = conversationId
      currentProjectId.value = conversation.project_id
    }
  }

  // Get current project
  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })

  // Get current conversation
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value) || null
  })

  // Get project tree structure
  const projectTree = computed(() => {
    return projects.value.map(project => ({
      ...project,
      conversations: getConversationsForProject(project.id)
    }))
  })

  return {
    projects: computed(() => projects.value),
    conversations: computed(() => conversations.value),
    currentProjectId: computed(() => currentProjectId.value),
    currentConversationId: computed(() => currentConversationId.value),
    currentProject,
    currentConversation,
    projectTree,
    isLoading: computed(() => isLoading.value),
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    createConversation,
    updateConversation,
    deleteConversation,
    setCurrentProject,
    setCurrentConversation,
    getConversationsForProject
  }
}
