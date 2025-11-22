<template>
  <div class="border-t border-orange-200 bg-transparent p-4">
    <form @submit.prevent="handleSubmit" class="max-w-4xl mx-auto">
      <div class="flex gap-3 items-center">
        <UInput
          v-model="inputText"
          :placeholder="$t('chat.inputPlaceholder')"
          size="xl"
          :ui="{ 
            base: 'flex-1',
            rounded: 'rounded-full',
          }"
          class="shadow-md"
          autocomplete="off"
          :disabled="disabled"
        />
        <UButton
          type="submit"
          :disabled="!inputText.trim() || disabled"
          icon="i-heroicons-paper-airplane"
          size="xl"
          color="orange"
          :ui="{
            rounded: 'rounded-full',
          }"
          class="shadow-md bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const inputText = ref('')

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
</script>

