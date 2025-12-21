<template>
  <div>
    <!-- Mobile toggle button - always visible on mobile -->
    <button
      v-if="isMobile"
      @click="isOpen = !isOpen"
      class="fixed right-0 top-4 z-50 bg-white border-l border-t border-b border-gray-200 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 transition-all"
    >
      <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path v-if="!isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- Documents Panel -->
    <div
      class="bg-white border-l border-gray-200 h-screen overflow-y-auto transition-transform duration-300 ease-in-out flex-shrink-0"
      :class="{
        'fixed right-0 top-0 z-40 w-full sm:w-96': isMobile,
        'w-96': !isMobile,
        'translate-x-0': isOpen || !isMobile,
        'translate-x-full': !isOpen && isMobile,
        'hidden': !isMobile && !isOpen
      }"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-gray-900">{{ $t('documents.title', 'Documents') }}</h2>
          <button
            v-if="isMobile"
            @click="isOpen = false"
            class="p-1 hover:bg-gray-100 rounded"
          >
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Project Info Section -->
      <div v-if="projectMemory && currentTopicId" class="p-4 border-b border-gray-200 bg-gray-50">
        <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ $t('documents.projectInfo', 'Project Information') }}
        </h3>
        
        <!-- Known Information -->
        <div v-if="knownFields.length > 0" class="mb-3">
          <h4 class="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {{ $t('documents.known', 'Known') }}
          </h4>
          <div class="space-y-2">
            <div v-for="field in knownFields" :key="field.key" class="text-xs">
              <span class="font-medium text-gray-700">{{ field.label }}:</span>
              <span class="text-gray-600 ml-1">{{ field.value }}</span>
            </div>
          </div>
        </div>

        <!-- Unknown Information -->
        <div v-if="unknownFields.length > 0">
          <h4 class="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ $t('documents.unknown', 'Unknown') }}
          </h4>
          <div class="space-y-1">
            <div v-for="field in unknownFields" :key="field.key" class="text-xs text-gray-500 italic">
              {{ field.label }}
            </div>
          </div>
        </div>

        <!-- Empty state for project info -->
        <div v-if="knownFields.length === 0 && unknownFields.length === 0" class="text-xs text-gray-400 italic">
          {{ $t('documents.noProjectInfo', 'No project information available yet') }}
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="p-4 text-center text-gray-500">
        {{ $t('documents.loading', 'Loading...') }}
      </div>

      <!-- Empty state -->
      <div v-else-if="challenges.length === 0" class="p-4 text-center text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm">{{ $t('documents.empty', 'No documents yet') }}</p>
      </div>

      <!-- Documents list -->
      <div v-else class="p-2">
        <!-- Selected document content -->
        <div v-if="selectedDocument" class="space-y-4">
          <!-- Document header with dropdown -->
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <!-- Document title with dropdown -->
                <div class="relative">
                  <button
                    v-if="challenges.length > 1"
                    @click="showDocumentDropdown = !showDocumentDropdown"
                    class="flex items-center gap-2 font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors group"
                  >
                    <span>{{ selectedDocument.title }}</span>
                    <svg 
                      class="w-4 h-4 transition-transform"
                      :class="{ 'rotate-180': showDocumentDropdown }"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <h3 v-else class="font-semibold text-gray-900 mb-1">{{ selectedDocument.title }}</h3>
                  
                  <!-- Dropdown menu -->
                  <div
                    v-if="showDocumentDropdown && challenges.length > 1"
                    class="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                    @click.stop
                  >
                    <div class="py-1">
                      <button
                        v-for="challenge in challenges"
                        :key="challenge.id"
                        @click="selectDocument(challenge.id)"
                        class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center justify-between"
                        :class="selectedDocumentId === challenge.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
                      >
                        <div class="flex-1">
                          <div class="font-medium">{{ challenge.title }}</div>
                          <div class="text-xs text-gray-500 mt-0.5">
                            {{ getDocumentTypeLabel(challenge.document_type) }}
                          </div>
                        </div>
                        <svg
                          v-if="selectedDocumentId === challenge.id"
                          class="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p class="text-xs text-gray-500">
                  {{ $t('documents.type', 'Type') }}: {{ getDocumentTypeLabel(selectedDocument.document_type) }}
                </p>
              </div>
              <span
                v-if="selectedDocument.validated_at"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {{ $t('documents.validated', 'Validated') }}
              </span>
            </div>

            <!-- Expiration date -->
            <div class="flex items-center text-xs text-gray-600">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {{ $t('documents.expires', 'Expires') }}: {{ formatDate(selectedDocument.expires_at) }}
              </span>
              <span
                v-if="isExpired(selectedDocument.expires_at)"
                class="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
              >
                {{ $t('documents.expired', 'Expired') }}
              </span>
            </div>

            <!-- Validation button -->
            <button
              v-if="!selectedDocument.validated_at && !isExpired(selectedDocument.expires_at)"
              @click="validateChallenge(selectedDocument.id)"
              :disabled="isValidating"
              class="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg v-if="!isValidating" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isValidating ? $t('documents.validating', 'Validating...') : $t('documents.validate', 'Validate Challenge') }}
            </button>
          </div>

          <!-- Document content -->
          <div class="prose prose-sm max-w-none p-4 bg-white rounded-lg border border-gray-200">
            <div v-html="formatContent(selectedDocument.content)"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay for mobile -->
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-30"
      @click="isOpen = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjects } from '~/composables/useProjects'

const { t } = useI18n()

interface Challenge {
  id: string
  topic_id: string
  project_id: string | null
  document_type: 'action_plan' | 'flash_diagnostic' | 'other'
  title: string
  content: string
  expires_at: string
  validated_at: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

const props = defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const { currentTopicId } = useProjects()

const isOpen = ref(props.isOpen ?? false)
const challenges = ref<Challenge[]>([])
const selectedDocumentId = ref<string | null>(null)
const isLoading = ref(false)
const isValidating = ref(false)
const projectMemory = ref<any>(null)
const isLoadingMemory = ref(false)
const showDocumentDropdown = ref(false)

// Detect mobile
const isMobile = ref(false)

const updateMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768
    // On desktop, always show panel
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

// Watch for topic changes to reload challenges and memory
watch(currentTopicId, async (newTopicId) => {
  if (newTopicId) {
    await Promise.all([
      loadChallenges(newTopicId),
      loadProjectMemory(newTopicId)
    ])
  } else {
    challenges.value = []
    selectedDocumentId.value = null
    projectMemory.value = null
  }
}, { immediate: true })

// Refresh when panel opens or topic changes
watch([currentTopicId, isOpen], async ([topicId, open]) => {
  if (topicId && open) {
    // Refresh immediately when panel opens or topic changes
    await Promise.all([
      loadChallenges(topicId),
      loadProjectMemory(topicId)
    ])
  }
})

// Computed
const selectedDocument = computed(() => {
  if (!selectedDocumentId.value) return null
  return challenges.value.find(c => c.id === selectedDocumentId.value) || null
})

// Project memory fields configuration
const memoryFields = [
  { key: 'project.name', label: t('documents.fields.projectName', 'Project Name'), category: 'project' },
  { key: 'project.description', label: t('documents.fields.description', 'Description'), category: 'project' },
  { key: 'project.phase', label: t('documents.fields.phase', 'Phase'), category: 'project' },
  { key: 'project.target_segment', label: t('documents.fields.targetSegment', 'Target Segment'), category: 'project' },
  { key: 'project.problem', label: t('documents.fields.problem', 'Problem'), category: 'project' },
  { key: 'project.solution', label: t('documents.fields.solution', 'Solution'), category: 'project' },
  { key: 'project.market_category', label: t('documents.fields.marketCategory', 'Market Category'), category: 'project' },
  { key: 'progress.activities', label: t('documents.fields.activities', 'Activities'), category: 'progress', isArray: true },
  { key: 'progress.milestones', label: t('documents.fields.milestones', 'Milestones'), category: 'progress', isArray: true },
  { key: 'user.skills', label: t('documents.fields.skills', 'Skills'), category: 'user', isArray: true },
  { key: 'user.assets', label: t('documents.fields.assets', 'Assets'), category: 'user', isArray: true },
  { key: 'user.constraints.time', label: t('documents.fields.timeConstraint', 'Time Available'), category: 'constraints' },
  { key: 'user.constraints.budget', label: t('documents.fields.budget', 'Budget'), category: 'constraints' },
  { key: 'user.constraints.geography', label: t('documents.fields.geography', 'Geography'), category: 'constraints' },
  { key: 'user.constraints.lacking', label: t('documents.fields.lacking', 'Lacking'), category: 'constraints', isArray: true }
]

// Get value from nested object path
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Format field value for display
const formatFieldValue = (value: any, isArray: boolean = false): string => {
  if (value === undefined || value === null || value === '') return ''
  if (isArray && Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : ''
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

// Computed: Known fields
const knownFields = computed(() => {
  if (!projectMemory.value) return []
  
  return memoryFields
    .map(field => {
      const value = getNestedValue(projectMemory.value, field.key)
      const formattedValue = formatFieldValue(value, field.isArray)
      
      if (formattedValue && formattedValue.trim() !== '') {
        return {
          ...field,
          value: formattedValue
        }
      }
      return null
    })
    .filter((field): field is NonNullable<typeof field> => field !== null)
})

// Computed: Unknown fields
const unknownFields = computed(() => {
  if (!projectMemory.value) return memoryFields
  
  return memoryFields
    .map(field => {
      const value = getNestedValue(projectMemory.value, field.key)
      const formattedValue = formatFieldValue(value, field.isArray)
      
      if (!formattedValue || formattedValue.trim() === '') {
        return field
      }
      return null
    })
    .filter((field): field is NonNullable<typeof field> => field !== null)
})

// Load project memory for current topic
const loadProjectMemory = async (topicId: string) => {
  isLoadingMemory.value = true
  try {
    const response = await fetch(`/api/memory/${topicId}`)
    if (response.ok) {
      const data = await response.json()
      projectMemory.value = data.memory || null
      console.log('📊 [DocumentsPanel] Memory loaded:', {
        projectName: projectMemory.value?.project?.name,
        projectPhase: projectMemory.value?.project?.phase,
        knownFields: knownFields.value.length,
        unknownFields: unknownFields.value.length
      })
    } else {
      console.error('❌ [DocumentsPanel] Failed to load memory:', response.status, response.statusText)
      projectMemory.value = null
    }
  } catch (error) {
    console.error('❌ [DocumentsPanel] Error loading project memory:', error)
    projectMemory.value = null
  } finally {
    isLoadingMemory.value = false
  }
}

// Load challenges for current topic
const loadChallenges = async (topicId: string) => {
  isLoading.value = true
  try {
    const response = await fetch(`/api/challenges?topicId=${topicId}`)
    if (response.ok) {
      const data = await response.json()
      const previousCount = challenges.value.length
      challenges.value = data.challenges || []
      
      // Select the latest document (most recently created) if available
      if (challenges.value.length > 0) {
        // Challenges are already sorted by created_at DESC from the API
        // Always select the first one (latest) to show the most recent document
        // This ensures new documents are automatically displayed
        const latestDocumentId = challenges.value[0].id
        const isNewDocument = previousCount < challenges.value.length
        
        // Switch to latest if: no selection, current doesn't exist, or a new document was added
        if (!selectedDocumentId.value || 
            !challenges.value.some(c => c.id === selectedDocumentId.value) ||
            isNewDocument) {
          selectedDocumentId.value = latestDocumentId
          console.log('📄 [DocumentsPanel] Selected latest document:', challenges.value[0].title, isNewDocument ? '(NEW)' : '')
        }
      } else {
        selectedDocumentId.value = null
      }
    }
  } catch (error) {
    console.error('Error loading challenges:', error)
  } finally {
    isLoading.value = false
  }
}

// Validate challenge
const validateChallenge = async (challengeId: string) => {
  isValidating.value = true
  try {
    const response = await fetch(`/api/challenges/${challengeId}/validate`, {
      method: 'POST'
    })
    
    if (response.ok) {
      const data = await response.json()
      // Update the challenge in the list
      const index = challenges.value.findIndex(c => c.id === challengeId)
      if (index !== -1) {
        challenges.value[index] = data.challenge
      }
    }
  } catch (error) {
    console.error('Error validating challenge:', error)
    alert(t('documents.validationError', 'Failed to validate challenge. Please try again.'))
  } finally {
    isValidating.value = false
  }
}

// Format content (convert markdown-like formatting to HTML)
const formatContent = (content: string): string => {
  // Simple markdown to HTML conversion
  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>')
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li.*?<\/li>)/g, '<ul class="list-disc ml-6 mb-2">$1</ul>')
  
  return html
}

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Check if expired
const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date()
}

// Get document type label
const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'action_plan': t('documents.types.actionPlan', 'Action Plan'),
    'flash_diagnostic': t('documents.types.diagnostic', 'Diagnostic'),
    'other': t('documents.types.other', 'Other')
  }
  return labels[type] || type
}

// Select document from dropdown
const selectDocument = (documentId: string) => {
  selectedDocumentId.value = documentId
  showDocumentDropdown.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showDocumentDropdown.value = false
  }
}

// Listen for memory refresh events
const handleMemoryRefresh = async () => {
  if (currentTopicId.value && isOpen.value) {
    console.log('🔄 [DocumentsPanel] Refreshing memory after message')
    await loadProjectMemory(currentTopicId.value)
  }
}

// Load challenges on mount
onMounted(async () => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
  window.addEventListener('memory-refresh', handleMemoryRefresh)
  document.addEventListener('click', handleClickOutside)
  
  // On desktop, panel should be open by default
  if (!isMobile.value) {
    isOpen.value = true
  }
  
  if (currentTopicId.value) {
    await Promise.all([
      loadChallenges(currentTopicId.value),
      loadProjectMemory(currentTopicId.value)
    ])
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateMobile)
    window.removeEventListener('memory-refresh', handleMemoryRefresh)
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<style scoped>
.prose {
  color: #374151;
}

.prose h1, .prose h2, .prose h3 {
  color: #111827;
}

.prose strong {
  font-weight: 600;
  color: #111827;
}

.prose ul {
  list-style-type: disc;
  padding-left: 1.5rem;
}

.prose li {
  margin: 0.25rem 0;
}
</style>

