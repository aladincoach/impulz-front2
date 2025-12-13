import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface Topic {
  id: string
  project_id: string
  name: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

const projects = ref<Project[]>([])
const topics = ref<Topic[]>([])
const currentProjectId = ref<string | null>(null)
const currentTopicId = ref<string | null>(null)
const isLoading = ref(false)

export const useProjects = () => {
  const { t } = useI18n()
  
  // Load all projects with their topics
  const loadProjects = async () => {
    isLoading.value = true
    try {
      // Load projects
      const projectsResponse = await $fetch<Project[]>('/api/projects').catch(() => [])
      projects.value = projectsResponse || []

      // Load topics for all projects
      const topicsResponse = await $fetch<Topic[]>('/api/topics').catch(() => [])
      topics.value = topicsResponse || []

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

      // If current project has no topics, create a default topic
      if (currentProjectId.value) {
        const projectTopics = getTopicsForProject(currentProjectId.value)
        if (projectTopics.length === 0) {
          const defaultName = t('topics.defaultName', 'New Topic')
          const defaultTopic = await createTopic(currentProjectId.value, defaultName)
          if (defaultTopic) {
            topics.value.push(defaultTopic)
            currentTopicId.value = defaultTopic.id
          }
        } else if (!currentTopicId.value) {
          // Set first topic as current if none selected
          currentTopicId.value = projectTopics[0].id
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
            const defaultTopicName = t('topics.defaultName', 'New Topic')
            const defaultTopic = await createTopic(defaultProject.id, defaultTopicName)
            if (defaultTopic) {
              topics.value.push(defaultTopic)
              currentTopicId.value = defaultTopic.id
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
      topics.value = topics.value.filter(t => t.project_id !== id)
      
      // If deleted project was current, switch to first available
      if (currentProjectId.value === id) {
        currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
        if (currentProjectId.value) {
          const projectTopics = getTopicsForProject(currentProjectId.value)
          currentTopicId.value = projectTopics.length > 0 ? projectTopics[0].id : null
        } else {
          currentTopicId.value = null
        }
      }
      return true
    } catch (error) {
      console.error('Error deleting project:', error)
      return false
    }
  }

  // Create a new topic
  const createTopic = async (projectId: string, name: string): Promise<Topic | null> => {
    try {
      const topic = await $fetch<Topic>('/api/topics', {
        method: 'POST',
        body: { project_id: projectId, name }
      })
      topics.value.push(topic)
      return topic
    } catch (error) {
      console.error('Error creating topic:', error)
      return null
    }
  }

  // Update topic name
  const updateTopic = async (id: string, name: string): Promise<boolean> => {
    try {
      const updated = await $fetch<Topic>(`/api/topics/${id}`, {
        method: 'PATCH',
        body: { name }
      })
      const index = topics.value.findIndex(t => t.id === id)
      if (index !== -1) {
        topics.value[index] = updated
      }
      return true
    } catch (error) {
      console.error('Error updating topic:', error)
      return false
    }
  }

  // Delete topic
  const deleteTopic = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/topics/${id}`, {
        method: 'DELETE'
      })
      topics.value = topics.value.filter(t => t.id !== id)
      
      // If deleted topic was current, switch to first available in project
      if (currentTopicId.value === id && currentProjectId.value) {
        const projectTopics = getTopicsForProject(currentProjectId.value)
        currentTopicId.value = projectTopics.length > 0 ? projectTopics[0].id : null
      }
      return true
    } catch (error) {
      console.error('Error deleting topic:', error)
      return false
    }
  }

  // Get topics for a project
  const getTopicsForProject = (projectId: string): Topic[] => {
    return topics.value.filter(t => t.project_id === projectId)
  }

  // Set current project
  const setCurrentProject = async (projectId: string) => {
    const { t } = useI18n()
    currentProjectId.value = projectId
    const projectTopics = getTopicsForProject(projectId)
    
    // If no topics exist, create a default one
    if (projectTopics.length === 0) {
      const defaultName = t('topics.defaultName', 'New Topic')
      const defaultTopic = await createTopic(projectId, defaultName)
      if (defaultTopic) {
        currentTopicId.value = defaultTopic.id
      }
    } else {
      // Set first topic as current
      currentTopicId.value = projectTopics[0].id
    }
  }

  // Set current topic
  const setCurrentTopic = (topicId: string) => {
    const topic = topics.value.find(t => t.id === topicId)
    if (topic) {
      currentTopicId.value = topicId
      currentProjectId.value = topic.project_id
    }
  }

  // Get current project
  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })

  // Get current topic
  const currentTopic = computed(() => {
    return topics.value.find(t => t.id === currentTopicId.value) || null
  })

  // Get project tree structure
  const projectTree = computed(() => {
    return projects.value.map(project => ({
      ...project,
      topics: getTopicsForProject(project.id)
    }))
  })

  return {
    projects: computed(() => projects.value),
    topics: computed(() => topics.value),
    currentProjectId: computed(() => currentProjectId.value),
    currentTopicId: computed(() => currentTopicId.value),
    currentProject,
    currentTopic,
    projectTree,
    isLoading: computed(() => isLoading.value),
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    createTopic,
    updateTopic,
    deleteTopic,
    setCurrentProject,
    setCurrentTopic,
    getTopicsForProject
  }
}

