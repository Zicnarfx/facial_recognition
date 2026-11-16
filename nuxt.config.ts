// nuxt.config.ts  (add runtimeConfig to your existing config)
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // filled automatically from NUXT_PUBLIC_GOOGLE_CLIENT_ID in .env
      googleClientId: '',
    },
  },
})