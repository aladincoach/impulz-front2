// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  
  // Client-side rendering for all pages (SPA-like behavior)
  ssr: false,
  
  colorMode: {
    preference: 'light'
  },
  runtimeConfig: {
    systemPromptCache: process.env.SYSTEM_PROMPT_CACHE,
    public: {
      useWorkflow: process.env.USE_WORKFLOW !== 'false' // Default to true
    }
  },
  nitro: {
    preset: 'netlify',
    serverAssets: [
      {
        baseName: 'prompts',
        dir: './prompts'
      }
    ]
  },
  i18n: {
    locales: [
      {
        code: 'fr',
        iso: 'fr-FR',
        file: 'fr.json',
        name: 'Français'
      },
      {
        code: 'en',
        iso: 'en-US',
        file: 'en.json',
        name: 'English'
      }
    ],
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'fr'
    },
    lazy: true
  }
})

