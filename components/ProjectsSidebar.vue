<template>
  <div>
    <!-- Mobile toggle button - always visible on mobile -->
    <button
      v-if="isMobile"
      @click="isOpen = !isOpen"
      class="fixed left-0 top-4 z-50 bg-white border-r border-t border-b border-gray-200 rounded-r-lg p-2 shadow-lg hover:bg-gray-50 transition-all"
      :class="{ 'translate-x-0': true }"
    >
      <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path v-if="!isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Sidebar -->
    <div
      class="bg-white border-r border-gray-200 h-screen overflow-y-auto transition-transform duration-300 ease-in-out"
      :class="{
        'fixed left-0 top-0 z-40 w-64': isMobile,
        'w-64': !isMobile,
        'translate-x-0': isOpen || !isMobile,
        '-translate-x-full': !isOpen && isMobile
      }"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">{{ $t('projects.title', 'Projects') }}</h2>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="p-4 text-center text-gray-500">
        {{ $t('projects.loading', 'Loading...') }}
      </div>

      <!-- Projects list -->
      <div v-else class="p-2">
        <div v-for="project in projectTree" :key="project.id" class="mb-2">
          <!-- Project header -->
          <div
            class="flex items-center justify-between group p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
            :class="{ 'bg-blue-50': currentProjectId === project.id }"
            @click="handleProjectClick(project.id)"
          >
            <div class="flex items-center flex-1 min-w-0">
              <svg
                class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0"
                :class="{ 'rotate-90': expandedProjects.has(project.id) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span
                class="text-sm font-medium text-gray-900 truncate flex-1"
                :class="{ 'text-blue-600': currentProjectId === project.id }"
              >
                {{ project.name }}
              </span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                @click.stop="editProject(project)"
                class="p-1 hover:bg-gray-200 rounded"
                :title="$t('projects.edit', 'Edit')"
              >
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click.stop="deleteProject(project)"
                class="p-1 hover:bg-red-100 rounded"
                :title="$t('projects.delete', 'Delete')"
              >
                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Conversations list -->
          <div
            v-if="expandedProjects.has(project.id)"
            class="ml-6 mt-1 space-y-1"
          >
            <div
              v-for="conversation in project.conversations"
              :key="conversation.id"
              class="flex items-center justify-between group p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              :class="{ 'bg-blue-50': currentConversationId === conversation.id }"
              @click="handleConversationClick(conversation.id)"
            >
              <span
                class="text-sm text-gray-700 truncate flex-1"
                :class="{ 'text-blue-600 font-medium': currentConversationId === conversation.id }"
              >
                {{ conversation.name }}
              </span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click.stop="editConversation(conversation)"
                  class="p-1 hover:bg-gray-200 rounded"
                  :title="$t('conversations.edit', 'Edit')"
                >
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click.stop="deleteConversation(conversation)"
                  class="p-1 hover:bg-red-100 rounded"
                  :title="$t('conversations.delete', 'Delete')"
                >
                  <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              @click.stop="addConversation(project.id)"
              class="w-full text-left text-xs text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ $t('conversations.add', 'Add conversation') }}
            </button>
          </div>
        </div>

        <!-- Add project button -->
        <button
          @click="addProject"
          class="w-full text-left text-sm text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 mt-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('projects.add', 'Add project') }}
        </button>
      </div>
    </div>

    <!-- Overlay for mobile -->
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-30"
      @click="isOpen = false"
    ></div>

    <!-- Add/Edit dialogs -->
    <!-- Add Project Dialog -->
    <div
      v-if="addingProject"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="cancelAddProject"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ $t('projects.add', 'Add project') }}</h3>
        <input
          v-model="newProjectName"
          @keyup.enter="confirmAddProject"
          @keyup.escape="cancelAddProject"
          :ref="el => newProjectInput = el as HTMLInputElement"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('projects.name', 'Project name')"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="cancelAddProject"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {{ $t('common.cancel', 'Cancel') }}
          </button>
          <button
            @click="confirmAddProject"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            :disabled="!newProjectName.trim()"
          >
            {{ $t('common.save', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Conversation Dialog -->
    <div
      v-if="addingConversation"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="cancelAddConversation"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ $t('conversations.add', 'Add conversation') }}</h3>
        <input
          v-model="newConversationName"
          @keyup.enter="confirmAddConversation"
          @keyup.escape="cancelAddConversation"
          :ref="el => newConversationInput = el as HTMLInputElement"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('conversations.name', 'Conversation name')"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="cancelAddConversation"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {{ $t('common.cancel', 'Cancel') }}
          </button>
          <button
            @click="confirmAddConversation"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            :disabled="!newConversationName.trim()"
          >
            {{ $t('common.save', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Project Dialog -->
    <div
      v-if="editingProject"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="editingProject = null"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ $t('projects.edit', 'Edit Project') }}</h3>
        <input
          v-model="editingProject.name"
          @keyup.enter="saveProject"
          @keyup.escape="editingProject = null"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('projects.name', 'Project name')"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="editingProject = null"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {{ $t('common.cancel', 'Cancel') }}
          </button>
          <button
            @click="saveProject"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ $t('common.save', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Conversation Dialog -->
    <div
      v-if="editingConversation"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="editingConversation = null"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ $t('conversations.edit', 'Edit Conversation') }}</h3>
        <input
          v-model="editingConversation.name"
          @keyup.enter="saveConversation"
          @keyup.escape="editingConversation = null"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('conversations.name', 'Conversation name')"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="editingConversation = null"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {{ $t('common.cancel', 'Cancel') }}
          </button>
          <button
            @click="saveConversation"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ $t('common.save', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjects, type Project, type Conversation } from '~/composables/useProjects'

const { t } = useI18n()

const props = defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'project-changed', projectId: string): void
  (e: 'conversation-changed', conversationId: string): void
}>()

const {
  projectTree,
  currentProjectId,
  currentConversationId,
  isLoading,
  loadProjects,
  createProject,
  updateProject,
  deleteProject: deleteProjectAction,
  createConversation,
  updateConversation,
  deleteConversation: deleteConversationAction,
  setCurrentProject,
  setCurrentConversation
} = useProjects()

const isOpen = ref(props.isOpen ?? false)
const expandedProjects = ref<Set<string>>(new Set())
const editingProject = ref<Project | null>(null)
const editingConversation = ref<Conversation | null>(null)
const addingProject = ref(false)
const addingConversation = ref(false)
const newProjectName = ref('')
const newConversationName = ref('')
const newConversationProjectId = ref<string | null>(null)
const newProjectInput = ref<HTMLInputElement | null>(null)
const newConversationInput = ref<HTMLInputElement | null>(null)

// Detect mobile - use composable for reactivity
const isMobile = ref(false)

const updateMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768
    // On desktop, always show sidebar
    if (!isMobile.value) {
      isOpen.value = true
    }
  }
}

// Watch for prop changes
watch(() => props.isOpen, (newVal) => {
  isOpen.value = newVal ?? false
})

watch(isOpen, (newVal) => {
  emit('update:isOpen', newVal)
})

// Load projects on mount
onMounted(async () => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
  
  await loadProjects()
  // Expand current project
  if (currentProjectId.value) {
    expandedProjects.value.add(currentProjectId.value)
  }
  // On desktop, sidebar should be open by default
  if (!isMobile.value) {
    isOpen.value = true
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateMobile)
  }
})

// Handle project click
const handleProjectClick = (projectId: string) => {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId)
  } else {
    expandedProjects.value.add(projectId)
  }
  setCurrentProject(projectId)
  emit('project-changed', projectId)
  if (isMobile.value) {
    isOpen.value = false
  }
}

// Handle conversation click
const handleConversationClick = (conversationId: string) => {
  setCurrentConversation(conversationId)
  emit('conversation-changed', conversationId)
  if (isMobile.value) {
    isOpen.value = false
  }
}

// Add project
const addProject = () => {
  newProjectName.value = t('projects.defaultName', 'New Project')
  addingProject.value = true
  nextTick(() => {
    if (newProjectInput.value) {
      newProjectInput.value.focus()
      newProjectInput.value.select()
    }
  })
}

const confirmAddProject = async () => {
  const name = newProjectName.value.trim()
  if (!name) return
  
  addingProject.value = false
  const project = await createProject(name)
  if (project) {
    expandedProjects.value.add(project.id)
    await setCurrentProject(project.id)
    emit('project-changed', project.id)
  }
  newProjectName.value = ''
}

const cancelAddProject = () => {
  addingProject.value = false
  newProjectName.value = ''
}

// Edit project
const editProject = (project: Project) => {
  editingProject.value = { ...project }
}

// Save project
const saveProject = async () => {
  if (editingProject.value) {
    await updateProject(editingProject.value.id, editingProject.value.name)
    editingProject.value = null
  }
}

// Delete project
const deleteProject = async (project: Project) => {
  const message = t('projects.deleteConfirm', { name: project.name })
  if (confirm(message)) {
    await deleteProjectAction(project.id)
  }
}

// Add conversation
const addConversation = (projectId: string) => {
  newConversationName.value = t('conversations.defaultName', 'New Conversation')
  newConversationProjectId.value = projectId
  addingConversation.value = true
  nextTick(() => {
    if (newConversationInput.value) {
      newConversationInput.value.focus()
      newConversationInput.value.select()
    }
  })
}

const confirmAddConversation = async () => {
  const name = newConversationName.value.trim()
  if (!name || !newConversationProjectId.value) return
  
  addingConversation.value = false
  const projectId = newConversationProjectId.value
  const conversation = await createConversation(projectId, name)
  if (conversation) {
    expandedProjects.value.add(projectId)
    setCurrentConversation(conversation.id)
    emit('conversation-changed', conversation.id)
  }
  newConversationName.value = ''
  newConversationProjectId.value = null
}

const cancelAddConversation = () => {
  addingConversation.value = false
  newConversationName.value = ''
  newConversationProjectId.value = null
}

// Edit conversation
const editConversation = (conversation: Conversation) => {
  editingConversation.value = { ...conversation }
}

// Save conversation
const saveConversation = async () => {
  if (editingConversation.value) {
    await updateConversation(editingConversation.value.id, editingConversation.value.name)
    editingConversation.value = null
  }
}

// Delete conversation
const deleteConversation = async (conversation: Conversation) => {
  const message = t('conversations.deleteConfirm', { name: conversation.name })
  if (confirm(message)) {
    await deleteConversationAction(conversation.id)
  }
}
</script>
