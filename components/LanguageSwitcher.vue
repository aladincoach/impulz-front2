<template>
  <div class="flex gap-2">
    <button
      v-for="locale in availableLocales"
      :key="locale.code"
      @click="switchLocale(locale.code)"
      :class="[
        'px-3 py-1 rounded-md text-sm font-medium transition-all shadow-sm',
        currentLocale === locale.code
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
          : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200'
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

