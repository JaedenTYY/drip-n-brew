// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-18',
  devtools: { enabled: true },
  
  css: [
    '~/assets/css/fonts.css'
  ],

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Drip & Brew' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#ffffff' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
        { rel: 'apple-touch-icon', sizes: '152x152', href: '/logo.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/logo.png' },
        { rel: 'apple-touch-icon', sizes: '167x167', href: '/logo.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { 
          rel: 'preload', 
          href: '/fonts/outfit-latin-vf.woff2', 
          as: 'font', 
          type: 'font/woff2', 
          crossorigin: 'anonymous' 
        }
      ]
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/image'
  ],

  // Performance: SWR Caching for the storefront
  // This allows the page to be served from a cache while being updated in the background.
  routeRules: {
    '/': { swr: 3600 }, // Cache storefront for 1 hour
    '/order-confirmation': { ssr: false }, // Client-side only
    '/pos/**': { ssr: false } // POS is a dashboard, better as a pure SPA
  },

  image: {
    format: ['webp', 'avif', 'png'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
    componentIslands: true // Enable islands for potentially static parts of the UI
  },

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
    supabaseServiceKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
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
