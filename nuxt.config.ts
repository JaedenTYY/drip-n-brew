// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  runtimeConfig: {
    // These will be overridden by NUXT_PCO_APP_ID, NUXT_PCO_SECRET, etc.
    pcoAppId: '',
    pcoSecret: '',
    pcoFieldInvitedBy: '',
    pcoFieldLookingForChurch: '',
    pcoFieldInterestedInJesus: '',
    public: {
      supabaseUrl: '',
      supabaseKey: '',
    }
  },
  // If you use experimental features, you can add them here
  typescript: {
    strict: true
  }
})
