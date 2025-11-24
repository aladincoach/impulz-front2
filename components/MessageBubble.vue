<template>
  <div :class="containerClass">
    <div :class="bubbleClass">
      <template v-if="message.isLoading">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </template>
      <template v-else>
        <div v-for="(part, index) in parsedContent" :key="index">
          <template v-if="part.type === 'text'">
            <span class="whitespace-pre-wrap">{{ part.content }}</span>
          </template>
          <template v-else-if="part.type === 'thinking'">
            <details class="border-l-2 border-gray-300 pl-3">
              <summary class="cursor-pointer text-sm text-gray-500 font-light select-none hover:text-gray-700">
                Thinking :
              </summary>
              <div class="text-sm text-gray-500 font-light whitespace-pre-wrap">
                {{ part.content }}
              </div>
            </details>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  id: string
  text: string
  isUser: boolean
  isLoading?: boolean
}

interface ContentPart {
  type: 'text' | 'thinking'
  content: string
}

const props = defineProps<{
  message: Message
}>()

const containerClass = computed(() => {
  return props.message.isUser 
    ? 'flex justify-end mb-4 px-4'
    : 'flex justify-start mb-4 px-4'
})

const bubbleClass = computed(() => {
  const baseClass = 'max-w-[80%] px-4 py-3 break-words'
  
  if (props.message.isUser) {
    return `${baseClass} bg-[#FAECE0] text-gray-900 rounded-xl rounded-tr-none`
  } else {
    return `${baseClass} text-gray-900 rounded-xl rounded-tl-none`
  }
})

const parsedContent = computed(() => {
  const parts: ContentPart[] = []
  const text = props.message.text
  
  // Regex to match <thinking>...</thinking> tags (including incomplete ones during streaming)
  const thinkingRegex = /<thinking>([\s\S]*?)(?:<\/thinking>|$)/g
  
  let lastIndex = 0
  let match
  
  while ((match = thinkingRegex.exec(text)) !== null) {
    // Add text before the thinking block
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index)
      if (beforeText) {
        parts.push({ type: 'text', content: beforeText })
      }
    }
    
    // Add thinking block
    parts.push({ type: 'thinking', content: match[1] })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text after last thinking block
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText })
    }
  }
  
  // If no thinking blocks found, return the whole text as a single text part
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text })
  }
  
  return parts
})
</script>

