<template>
  <div class="flex gap-2">
    <button
      v-for="locale in availableLocales"
      :key="locale.code"
      @click="switchLocale(locale.code)"
      :class="[
        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
        currentLocale === locale.code
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      ]"
    >
      {{ locale.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()

const currentLocale = computed(() => locale.value)
const availableLocales = computed(() => locales.value)

const switchLocale = (code: string) => {
  locale.value = code
}
</script>

