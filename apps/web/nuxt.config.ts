// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['base-layer'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      appName: 'Web pública',
      // Se sobrescriben con NUXT_PUBLIC_API_BASE y NUXT_PUBLIC_ADMIN_URL
      apiBase: '',
      adminUrl: 'http://localhost:3001',
    },
  },
})
