// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  runtimeConfig: {
    // Private keys (Server-side only)
    pcoAppId: process.env.NUXT_PCO_APP_ID,
    pcoSecret: process.env.NUXT_PCO_SECRET,
    pcoFieldInvitedBy: process.env.NUXT_PCO_FIELD_INVITED_BY,
    pcoFieldLookingForChurch: process.env.NUXT_PCO_FIELD_LOOKING_FOR_CHURCH,
    pcoFieldInterestedInJesus: process.env.NUXT_PCO_FIELD_INTERESTED_IN_JESUS,
    pcoNoteCategoryId: process.env.NUXT_PCO_NOTE_CATEGORY_ID,
    gmailUser: process.env.NUXT_GMAIL_USER,
    gmailAppPassword: process.env.NUXT_GMAIL_APP_PASSWORD,
    supabaseServiceKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    whatsappToken: process.env.NUXT_WHATSAPP_TOKEN,
    whatsappPhoneId: process.env.NUXT_WHATSAPP_PHONE_ID,
    debugMode: process.env.NUXT_DEBUG_MODE === 'true',

    public: {
      // Public keys (Client & Server)
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    }
  },
  typescript: {
    strict: true
  }
})
