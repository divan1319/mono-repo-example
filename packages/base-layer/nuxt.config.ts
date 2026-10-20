// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // Cada app los sobrescribe (NUXT_PUBLIC_API_BASE, NUXT_PUBLIC_APP_NAME)
      apiBase: '',
      appName: 'App',
    },
  },
})
