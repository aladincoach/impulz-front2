<template>
  <div :class="containerClass">
    <div :class="bubbleClass">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  id: string
  text: string
  isUser: boolean
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
  const baseClass = 'max-w-[80%] md:max-w-[70%] lg:max-w-[60%] px-4 py-3 break-words'
  
  if (props.message.isUser) {
    return `${baseClass} bg-[#FFA07A] text-gray-900 rounded-xl rounded-tr-none`
  } else {
    return `${baseClass} bg-gray-100 text-gray-900 rounded-xl rounded-tl-none`
  }
})
</script>

