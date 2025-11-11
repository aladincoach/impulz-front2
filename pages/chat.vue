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
        />
      </div>
    </div>

    <!-- Fixed Input at Bottom -->
    <div class="sticky bottom-0 bg-white">
      <ChatInput @send="handleSendMessage" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  id: string
  text: string
  isUser: boolean
}

const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement | null>(null)

const handleSendMessage = (text: string) => {
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

  // Simulate bot response (parrot mode - repeats user input)
  setTimeout(() => {
    const botMessage: Message = {
      id: `bot-${Date.now()}`,
      text,
      isUser: false
    }
    messages.value.push(botMessage)

    // Scroll to bottom again
    nextTick(() => {
      scrollToBottom()
    })
  }, 300)
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Internationalization
const { t } = useI18n()

// Set page title
useHead({
  title: t('chat.pageTitle')
})
</script>

