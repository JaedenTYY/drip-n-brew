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
    pcoAppId: process.env.NUXT_PCO_APP_ID || process.env.PCO_APP_ID,
    pcoSecret: process.env.NUXT_PCO_SECRET || process.env.PCO_SECRET,
    pcoFieldInvitedBy: process.env.NUXT_PCO_FIELD_INVITED_BY || process.env.PCO_FIELD_INVITED_BY,
    pcoFieldLookingForChurch: process.env.NUXT_PCO_FIELD_LOOKING_FOR_CHURCH || process.env.PCO_FIELD_LOOKING_FOR_CHURCH,
    pcoFieldInterestedInJesus: process.env.NUXT_PCO_FIELD_INTERESTED_IN_JESUS || process.env.PCO_FIELD_INTERESTED_IN_JESUS,
    pcoNoteCategoryId: process.env.NUXT_PCO_NOTE_CATEGORY_ID || process.env.PCO_NOTE_CATEGORY_ID,
    gmailUser: process.env.NUXT_GMAIL_USER || process.env.GMAIL_USER,
    gmailAppPassword: process.env.NUXT_GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
    debugMode: process.env.NUXT_DEBUG_MODE === 'true' || process.env.DEBUG_MODE === 'true',

    public: {
      // Public keys (Client & Server)
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY,
    }
  },
  // If you use experimental features, you can add them here
  nitro: {
    preset: 'vercel'
  },
  typescript: {
    strict: true
  }
})
