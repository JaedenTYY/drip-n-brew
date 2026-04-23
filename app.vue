<script setup lang="ts">
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
  <div :class="{ 'dark': isDark }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Global styles */
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

/* 
  We apply the background to both html and body to ensure 
  there are no white flashes or "islands" of the wrong color.
*/
html {
  @apply bg-white transition-colors duration-300;
}

html.dark {
  @apply bg-black;
}

body {
  @apply bg-transparent text-gray-900 transition-colors duration-300;
}

.dark body {
  @apply text-white;
}

/* Base transitions for all theme-aware elements */
* {
  @apply transition-colors duration-200;
}
</style>
