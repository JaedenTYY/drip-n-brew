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
    pcoAppId: process.env.PCO_APP_ID,
    pcoSecret: process.env.PCO_SECRET,
    // Add these to your .env file once you get the IDs from PCO Settings
    pcoFieldInvitedBy: process.env.PCO_FIELD_INVITED_BY,
    pcoFieldLookingForChurch: process.env.PCO_FIELD_LOOKING_FOR_CHURCH,
    pcoFieldInterestedInJesus: process.env.PCO_FIELD_INTERESTED_IN_JESUS,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    }
  },
  // If you use experimental features, you can add them here
  typescript: {
    strict: true
  }
})
