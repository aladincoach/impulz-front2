<template>
  <div class="h-screen flex flex-col bg-white">
    <!-- Header -->
    <header class="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-900">{{ $t('chat.title') }}</h1>
        <LanguageSwitcher />
      </div>
    </header>

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
        conversationHistory: conversationHistory.slice(0, -1) // Exclure le message actuel
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
const { t } = useI18n()

// Set page title (Nuxt composable)
const title = computed(() => t('chat.pageTitle'))
useHead({
  title
})
</script>

