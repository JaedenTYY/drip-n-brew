<script setup lang="ts">
import SuccessPopup from '~/components/storefront/SuccessPopup.vue'

const { isDark } = useTheme()

useHead({
  titleTemplate: (titleChunk) => {
    return titleTitle(titleChunk)
  },
  title: 'Drip & Brew'
})

function titleTitle(titleChunk: string | undefined) {
  return titleChunk ? `${titleChunk} | Drip & Brew` : 'Drip & Brew'
}
</script>

<template>
  <div :class="{ 'dark': isDark }" class="min-h-full">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* 
  ROOT RESET
  Ensuring html and body fill the entire viewport 100% of the time.
  Using h-dvh for modern mobile browser address bar handling.
*/
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

html {
  @apply bg-white transition-colors duration-300;
  /* Prevent browser-level overscroll bounce on desktop which can cause layout shifts */
  overscroll-behavior: none;
}

html.dark {
  @apply bg-black;
}

body {
  @apply bg-transparent text-gray-900 transition-colors duration-300;
  min-height: 100%;
}

.dark body {
  @apply text-white;
}

#__nuxt {
  height: 100%;
  width: 100%;
}

/* Base transitions for all theme-aware elements */
* {
  @apply transition-colors duration-200;
}
</style>
