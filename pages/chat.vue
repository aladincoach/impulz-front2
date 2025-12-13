<template>
  <div class="h-screen flex bg-white relative">
    <!-- Sidebar -->
    <ProjectsSidebar
      v-model:is-open="sidebarOpen"
      @project-changed="handleProjectChanged"
      @topic-changed="handleTopicChanged"
    />

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden ml-0 md:ml-64">
      <!-- Header -->
      <header class="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <!-- Mobile sidebar toggle button in header -->
            <button
              v-if="isMobile"
              @click="sidebarOpen = !sidebarOpen"
              class="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              :aria-label="$t('projects.title', 'Projects')"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 class="text-xl font-semibold text-gray-900">{{ $t('chat.title') }}</h1>
            <span v-if="currentProject && currentTopic" class="hidden sm:inline text-sm text-gray-500">
              / {{ currentProject.name }} / {{ currentTopic.name }}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

    <!-- Fallback Warning Banner -->
    <div v-if="showFallbackWarning" class="bg-yellow-50 border-b border-yellow-200">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center">
          <svg class="h-5 w-5 text-yellow-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm text-yellow-800">{{ $t('chat.fallbackWarning') }}</span>
        </div>
        <button @click="showFallbackWarning = false" class="text-yellow-600 hover:text-yellow-800">
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages Container -->
    <div 
      ref="messagesContainer" 
      class="flex-1 overflow-y-auto pb-4"
    >
      <div class="max-w-4xl mx-auto pt-6">
        <!-- Welcome message when no messages -->
        <div v-if="messages.length === 0" class="flex items-center justify-center h-full px-4">
          <div class="text-center text-gray-400">
            <p class="text-lg">{{ $t('chat.welcomeMessage') }}</p>
          </div>
        </div>

        <!-- Messages -->
        <MessageBubble
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @option-click="handleOptionClick"
        />
      </div>
    </div>

      <!-- Fixed Input at Bottom -->
      <div class="sticky bottom-0 bg-white border-t border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <ChatInput ref="chatInputRef" @send="handleSendMessage" :disabled="isWaitingForResponse || !currentTopicId || projectsLoading" />
        </div>
      </div>
    </div>

    <!-- Topic change confirmation dialog -->
    <div
      v-if="showTopicChangeDialog"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="cancelTopicChange"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4">{{ $t('chat.topicChangeTitle', 'Switch to a new topic?') }}</h3>
        <p class="text-gray-600 mb-4">
          {{ $t('chat.topicChangeMessage', 'Your current conversation is about a different topic. Would you like to start a new topic thread?') }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            @click="cancelTopicChange"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {{ $t('common.cancel', 'Cancel') }}
          </button>
          <button
            @click="confirmTopicChange"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ $t('chat.startNewTopic', 'Start New Topic') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Documents Panel -->
    <DocumentsPanel
      v-model:is-open="documentsPanelOpen"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjects } from '~/composables/useProjects'

interface Message {
  id: string
  text: string
  isUser: boolean
  isLoading?: boolean
}

const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement | null>(null)
const chatInputRef = ref()
const isWaitingForResponse = ref(false)
const availableOptions = ref<string[]>([])
const showFallbackWarning = ref(false)
const sidebarOpen = ref(false)
const documentsPanelOpen = ref(false)

// Project and topic management
const {
  currentProject,
  currentTopic,
  currentProjectId,
  currentTopicId,
  loadProjects,
  isLoading: projectsLoading,
  createTopic,
  createProject,
  setCurrentTopic
} = useProjects()

// Topic change detection
const pendingTopicId = ref<string | null>(null)
const showTopicChangeDialog = ref(false)
const lastMessageTopic = ref<string | null>(null)

// Detect if we're on mobile
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
})

// Watch sidebar state for mobile
watch(sidebarOpen, (newVal) => {
  // Prevent body scroll when sidebar is open on mobile
  if (typeof document !== 'undefined' && isMobile.value) {
    if (newVal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

// Watch for topic changes
watch(currentTopicId, (newTopicId, oldTopicId) => {
  if (oldTopicId && newTopicId && oldTopicId !== newTopicId && messages.value.length > 0) {
    // Topic changed and we have messages - load conversation for new topic
    loadConversationForTopic(newTopicId)
  }
})

// Internationalization
const { t, locale } = useI18n()

// Ensure a topic exists for the session
const ensureTopicExists = async () => {
  // If no project exists, create one
  if (!currentProjectId.value && currentProject.value === null) {
    const defaultProjectName = t('projects.defaultName', 'New Project')
    const newProject = await createProject(defaultProjectName)
    if (newProject) {
      console.log('✅ [Frontend] Created default project:', newProject.id)
    }
  }

  // If no topic exists, create one
  if (!currentTopicId.value && currentProjectId.value) {
    const defaultTopicName = t('topics.defaultName', 'New Topic')
    const newTopic = await createTopic(currentProjectId.value, defaultTopicName)
    if (newTopic) {
      setCurrentTopic(newTopic.id)
      console.log('✅ [Frontend] Created default topic:', newTopic.id)
      return newTopic.id
    }
  }

  return currentTopicId.value
}

// Load projects on mount
onMounted(async () => {
  try {
    await loadProjects()
    
    // Ensure a topic exists - create one if needed
    const topicId = await ensureTopicExists()
    
    // Load conversation for current topic if it exists
    if (topicId) {
      await loadConversationForTopic(topicId)
    } else {
      console.warn('⚠️ [Frontend] Could not ensure topic exists')
    }
  } catch (error) {
    console.error('❌ [Frontend] Failed to load projects:', error)
    // Try to create default project and topic as fallback
    try {
      await ensureTopicExists()
    } catch (fallbackError) {
      console.error('❌ [Frontend] Failed to create fallback topic:', fallbackError)
    }
  }
})

// Extract options from the last bot message
const updateAvailableOptions = () => {
  const lastBotMessage = [...messages.value].reverse().find(m => !m.isUser && !m.isLoading)
  if (lastBotMessage) {
    // Parse options from the message text - look for ordered lists starting with "1. "
    const lines = lastBotMessage.text.split('\n')
    const options: string[] = []
    let foundStart = false
    let expectedNum = 1
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine && new RegExp(`^${expectedNum}\\.\\s+`).test(trimmedLine)) {
        foundStart = true
        options.push(trimmedLine.replace(/^\d+\.\s+/, '').trim())
        expectedNum++
      } else if (foundStart && trimmedLine === '') {
        // Empty line - check if list continues
        continue
      } else if (foundStart && options.length >= 2) {
        // Non-empty, non-numbered line after we have options - stop
        break
      }
    }
    
    // Only set options if we have at least 2
    availableOptions.value = options.length >= 2 ? options : []
  } else {
    availableOptions.value = []
  }
}

// Handle keyboard shortcuts for options
const handleKeyPress = (event: KeyboardEvent) => {
  // Only handle number keys when there are options available and not waiting for response
  if (availableOptions.value.length > 0 && !isWaitingForResponse.value) {
    const key = event.key
    const num = parseInt(key)
    if (!isNaN(num) && num >= 1 && num <= availableOptions.value.length) {
      // Check if user is not typing in the input field
      const activeElement = document.activeElement
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'
      
      if (!isInputFocused) {
        event.preventDefault()
        const selectedOption = availableOptions.value[num - 1]
        handleSendMessage(selectedOption)
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})

// Load conversation history for a topic
const loadConversationForTopic = async (topicId: string) => {
  try {
    // Clear current messages
    messages.value = []
    
    // Load conversation history from API
    const response = await fetch(`/api/conversations?topic_id=${topicId}`)
    if (response.ok) {
      const data = await response.json()
      if (data.messages && Array.isArray(data.messages)) {
        messages.value = data.messages.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          text: msg.content || msg.text || '',
          isUser: msg.role === 'user'
        }))
        nextTick(() => {
          scrollToBottom()
        })
      }
    }
  } catch (error) {
    console.error('Error loading conversation:', error)
  }
}

// Detect topic change from message content
const detectTopicChange = (message: string): boolean => {
  // Simple heuristic: if message is very different from last messages, might be topic change
  // This is a basic implementation - you might want to use AI to detect this
  if (messages.value.length === 0) return false
  
  // For now, we'll rely on explicit topic switching via sidebar
  // But we can add more sophisticated detection later
  return false
}

// Handle project change
const handleProjectChanged = async (projectId: string) => {
  // Project changed - messages will be cleared when topic loads
  console.log('Project changed to:', projectId)
}

// Handle topic change
const handleTopicChanged = async (topicId: string) => {
  if (messages.value.length > 0 && lastMessageTopic.value && lastMessageTopic.value !== topicId) {
    // We have messages and topic changed - ask for confirmation
    pendingTopicId.value = topicId
    showTopicChangeDialog.value = true
  } else {
    // No messages or first topic - just switch
    await loadConversationForTopic(topicId)
    lastMessageTopic.value = topicId
  }
}

// Confirm topic change
const confirmTopicChange = async () => {
  if (pendingTopicId.value) {
    messages.value = []
    await loadConversationForTopic(pendingTopicId.value)
    lastMessageTopic.value = pendingTopicId.value
    pendingTopicId.value = null
    showTopicChangeDialog.value = false
  }
}

// Cancel topic change
const cancelTopicChange = () => {
  pendingTopicId.value = null
  showTopicChangeDialog.value = false
  // Revert to previous topic if needed
  // This would require storing previous topic ID
}

const handleSendMessage = async (text: string) => {
  // Check if projects are still loading
  if (projectsLoading.value) {
    console.warn('⏳ [Frontend] Projects are still loading, please wait...')
    return
  }

  // Check if we have a current topic (capture value to prevent race conditions)
  const topicIdToSend = currentTopicId.value
  if (!topicIdToSend) {
    console.error('❌ [Frontend] No topic selected')
    alert('Please select or create a topic first')
    return
  }

  // Detect if this might be a topic change
  if (detectTopicChange(text) && messages.value.length > 0) {
    // Could prompt user here, but for now we'll just send
  }

  // Clear available options when user sends a message
  availableOptions.value = []
  
  // Add user message
  const userMessage: Message = {
    id: `user-${Date.now()}`,
    text,
    isUser: true
  }
  messages.value.push(userMessage)
  lastMessageTopic.value = topicIdToSend

  // Scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })

  // Add loading message
  isWaitingForResponse.value = true
  const loadingMessage: Message = {
    id: `bot-loading-${Date.now()}`,
    text: '',
    isUser: false,
    isLoading: true
  }
  messages.value.push(loadingMessage)

  nextTick(() => {
    scrollToBottom()
  })

  try {
    // Préparer l'historique de conversation (exclure le message de chargement)
    const conversationHistory = messages.value
      .filter(msg => !msg.isLoading && msg.id !== loadingMessage.id)
      .map(msg => ({ text: msg.text, isUser: msg.isUser }))

    console.log('🔵 [Frontend] Envoi du message:', text)
    console.log('🔵 [Frontend] Historique:', conversationHistory.length - 1, 'messages')
    console.log('🔵 [Frontend] Project ID:', currentProjectId.value)
    console.log('🔵 [Frontend] Topic ID:', topicIdToSend)

    // Appeler l'API avec streaming
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        conversationHistory: conversationHistory.slice(0, -1), // Exclure le message actuel
        projectId: currentProjectId.value,
        topicId: topicIdToSend,
        locale: locale.value
      })
    })

    console.log('📥 [Frontend] Réponse API reçue, status:', response.status)

    if (!response.ok) {
      // Try to parse as JSON first, fallback to text
      let errorData: any
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json()
        console.error('❌ [Frontend] Erreur API:', errorData)
      } else {
        const errorText = await response.text()
        console.error('❌ [Frontend] Erreur API:', errorText)
        errorData = { message: errorText }
      }
      
      // Show user-friendly error message
      const errorMessage = errorData.message || errorData.statusMessage || 'Failed to get response from Claude'
      throw new Error(errorMessage)
    }

    // Remplacer le message de chargement par un message vide
    const botMessageIndex = messages.value.findIndex(m => m.id === loadingMessage.id)
    if (botMessageIndex !== -1) {
      messages.value[botMessageIndex] = {
        id: `bot-${Date.now()}`,
        text: '',
        isUser: false,
        isLoading: false
      }
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (reader) {
      let buffer = ''
      let receivedChunks = 0
      
      console.log('🟢 [Frontend] Début de la lecture du stream')
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('✅ [Frontend] Stream terminé,', receivedChunks, 'chunks reçus')
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              console.log('✅ [Frontend] Signal [DONE] reçu')
              isWaitingForResponse.value = false
              // Update available options after bot response
              nextTick(() => {
                updateAvailableOptions()
                chatInputRef.value?.focus()
                // Trigger memory refresh after response completes
                // Small delay to ensure memory is updated on server
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('memory-refresh'))
                }, 1000)
              })
              break
            }
            
            try {
              const parsed = JSON.parse(data)
              
              // Handle metadata (like fallback warning)
              if (parsed.metadata) {
                if (parsed.metadata.usedFallback) {
                  showFallbackWarning.value = true
                  console.log('⚠️ [Frontend] Fallback prompt detected')
                }
              }
              
              // Handle text chunks
              if (parsed.text) {
                receivedChunks++
                if (receivedChunks === 1) {
                  console.log('🟢 [Frontend] Premier chunk de texte reçu!')
                }
                const currentBotMessageIndex = messages.value.findIndex(
                  m => m.id === messages.value[botMessageIndex].id
                )
                if (currentBotMessageIndex !== -1) {
                  messages.value[currentBotMessageIndex].text += parsed.text
                  
                  // Auto-scroll pendant le streaming
                  nextTick(() => {
                    scrollToBottom()
                  })
                }
              }
            } catch (e) {
              console.error('❌ [Frontend] Error parsing SSE data:', e)
            }
          }
        }
      }
    }
    
    isWaitingForResponse.value = false
    // Update available options and focus input after bot response completes
    nextTick(() => {
      updateAvailableOptions()
      chatInputRef.value?.focus()
    })
  } catch (error: any) {
    console.error('❌ [Frontend] Error sending message:', error)
    isWaitingForResponse.value = false
    
    // Get user-friendly error message
    let errorMessage = "Désolé, une erreur s'est produite. Veuillez réessayer."
    if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    // Remplacer le message de chargement par un message d'erreur
    const loadingIndex = messages.value.findIndex(m => m.id === loadingMessage.id)
    if (loadingIndex !== -1) {
      messages.value[loadingIndex] = {
        id: `bot-error-${Date.now()}`,
        text: errorMessage,
        isUser: false,
        isLoading: false
      }
    }
    // Focus input after error
    nextTick(() => {
      chatInputRef.value?.focus()
    })
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const handleOptionClick = (option: string) => {
  // Send the selected option as a new message
  handleSendMessage(option)
}

// Set page title (Nuxt composable)
const title = computed(() => t('chat.pageTitle'))
useHead({
  title
})
</script>

