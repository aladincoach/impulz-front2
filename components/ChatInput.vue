<template>
  <form @submit.prevent="handleSubmit">
    <div class="flex gap-2 sm:gap-3 items-end justify-center">
      <UTextarea
        ref="inputRef"
        v-model="inputText"
        :placeholder="$t('chat.inputPlaceholder')"
        :rows="1"
        :cols="80"
        autoresize
        :ui="{ 
          base: 'flex-1',
          rounded: 'rounded-2xl',
          size: {
            default: 'text-sm sm:text-base'
          }
        }"
        autocomplete="off"
        :disabled="disabled"
        @keydown.enter.exact.prevent="handleSubmit"
      />
      <UButton
        type="submit"
        :disabled="!inputText.trim() || disabled"
        icon="i-heroicons-paper-airplane"
        size="lg"
        :ui="{
          rounded: 'rounded-full',
          size: {
            lg: 'h-10 w-10 sm:h-12 sm:w-12'
          }
        }"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const inputText = ref('')
const inputRef = ref()

defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const handleSubmit = () => {
  const text = inputText.value.trim()
  if (text) {
    emit('send', text)
    inputText.value = ''
  }
}

// Expose focus method to parent
const focus = () => {
  nextTick(() => {
    inputRef.value?.$el?.querySelector('textarea')?.focus()
  })
}

defineExpose({
  focus
})
</script>

