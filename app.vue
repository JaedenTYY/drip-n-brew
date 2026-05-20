<script setup lang="ts">
import SuccessPopup from '~/components/storefront/SuccessPopup.vue'

const { isDark } = useTheme()

useHead({
  titleTemplate: (titleChunk) => {
    return titleTitle(titleChunk)
  },
  title: 'Drip & Brew',
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})

function titleTitle(titleChunk: string | undefined) {
  return titleChunk ? `${titleChunk} | Drip & Brew` : 'Drip & Brew'
}
</script>

<template>
  <div :class="{ 'dark': isDark }" class="min-h-screen text-gray-900 dark:text-white">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <BrandedUI />
    </ClientOnly>
  </div>
</template>

<style>
/* 
  ROOT RESET
  Optimized for mobile scrolling and PWA (Home Screen) behavior.
*/
html, body {
  margin: 0;
  padding: 0;
  /* 
    HCI TIP: Avoid height: 100% on root when standard scrolling is desired.
    This prevents 'stuck' scrolling in iOS Standalone mode.
  */
  min-height: 100%;
  width: 100%;
  -webkit-text-size-adjust: 100%;
  /* Support for smooth momentum scrolling on older iOS */
  -webkit-overflow-scrolling: touch;
  /* Encourage vertical pan gestures */
  touch-action: pan-y;
}

html {
  @apply bg-white transition-colors duration-300;
  scroll-behavior: smooth;
}

html.dark {
  @apply bg-black;
}

body {
  @apply bg-transparent text-gray-900 transition-colors duration-300;
  position: relative;
  /* Ensure the body can grow with content */
  min-height: 100vh;
}

.dark body {
  @apply text-white;
}

#__nuxt {
  min-height: 100vh;
  width: 100%;
}

/* Base transitions for all theme-aware elements */
* {
  @apply transition-colors duration-200;
}
</style>
