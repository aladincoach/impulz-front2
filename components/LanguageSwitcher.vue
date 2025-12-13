<template>
  <div class="relative inline-block">
    <button
      @click="open = !open"
      class="px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      @mouseover="open = true"
    >
      {{ currentLocale.toUpperCase() }}
    </button>
    <ul
      v-if="open"
      class="absolute left-0 mt-2 w-16 bg-white rounded-lg shadow-lg z-10 border border-gray-100"
      @mouseleave="open = false"
    >
      <li
        v-for="locale in availableLocales"
        :key="locale.code"
        @click="switchLocale(locale.code)"
        :class="[
          'px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors',
          currentLocale === locale.code
            ? 'bg-primary-50 text-primary-600 font-medium'
            : 'text-gray-700'
        ]"
      >
        {{ locale.code.toUpperCase() }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const { locale, locales } = useI18n()

const currentLocale = computed(() => locale.value)
const availableLocales = computed(() => locales.value)

const switchLocale = (code: string) => {
  locale.value = code
  open.value = false
}
</script>

