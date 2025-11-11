<template>
  <div class="border-t border-gray-200 bg-white p-4">
    <form @submit.prevent="handleSubmit" class="max-w-4xl mx-auto">
      <div class="flex gap-3 items-center">
        <UInput
          v-model="inputText"
          placeholder="Message..."
          size="xl"
          :ui="{ 
            base: 'flex-1',
            rounded: 'rounded-full',
          }"
          autocomplete="off"
        />
        <UButton
          type="submit"
          :disabled="!inputText.trim()"
          icon="i-heroicons-paper-airplane"
          size="xl"
          :ui="{
            rounded: 'rounded-full',
          }"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const inputText = ref('')

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

