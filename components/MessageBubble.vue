<template>
  <div :class="containerClass">
    <div :class="bubbleClass">
      <template v-if="message.isLoading">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </template>
      <template v-else>
        <span class="whitespace-pre-wrap">{{ message.text }}</span>
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

const props = defineProps<{
  message: Message
}>()

const containerClass = computed(() => {
  return props.message.isUser 
    ? 'flex justify-end mb-4 px-4'
    : 'flex justify-start mb-4 px-4'
})

const bubbleClass = computed(() => {
  const baseClass = 'max-w-[80%] md:max-w-[70%] lg:max-w-[60%] px-4 py-3 break-words shadow-md'
  
  if (props.message.isUser) {
    return `${baseClass} bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl rounded-tr-none`
  } else {
    return `${baseClass} bg-gradient-to-br from-white to-orange-50 text-gray-900 rounded-xl rounded-tl-none border border-orange-100`
  }
})
</script>

