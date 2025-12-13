<template>
  <div class="h-screen flex flex-col bg-white">
    <!-- Header -->
    <header class="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-900">{{ $t('chat.title') }}</h1>
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
    <div class="sticky bottom-0 bg-white  border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <ChatInput ref="chatInputRef" @send="handleSendMessage" :disabled="isWaitingForResponse" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

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

const handleSendMessage = async (text: string) => {
  // Clear available options when user sends a message
  availableOptions.value = []
  
  // Add user message
  const userMessage: Message = {
    id: `user-${Date.now()}`,
    text,
    isUser: true
  }
  messages.value.push(userMessage)

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

    // Appeler l'API avec streaming
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        conversationHistory: conversationHistory.slice(0, -1), // Exclure le message actuel
        locale: locale.value
      })
    })

    console.log('📥 [Frontend] Réponse API reçue, status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [Frontend] Erreur API:', errorText)
      throw new Error('Failed to get response from Claude')
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
  } catch (error) {
    console.error('❌ [Frontend] Error sending message:', error)
    isWaitingForResponse.value = false
    
    // Remplacer le message de chargement par un message d'erreur
    const loadingIndex = messages.value.findIndex(m => m.id === loadingMessage.id)
    if (loadingIndex !== -1) {
      messages.value[loadingIndex] = {
        id: `bot-error-${Date.now()}`,
        text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
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

// Internationalization
const { t, locale } = useI18n()

// Set page title (Nuxt composable)
const title = computed(() => t('chat.pageTitle'))
useHead({
  title
})
</script>

