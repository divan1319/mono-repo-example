// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['base-layer'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Backoffice como SPA. Con `nuxt generate` queda estático (.output/public).
  // Si necesitas server/api o routeRules.proxy, usa `nuxt build` (genera servidor).
  ssr: false,
  runtimeConfig: {
    public: {
      appName: 'Backoffice',
      // Se sobrescriben con NUXT_PUBLIC_API_BASE y NUXT_PUBLIC_WEB_URL
      apiBase: '',
      webUrl: 'http://localhost:3000',
    },
  },
})
