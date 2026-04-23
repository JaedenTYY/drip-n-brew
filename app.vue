<script setup lang="ts">
const { isDark } = useTheme()
</script>

<template>
  <div :class="{ 'dark': isDark }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Global styles if needed */
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

/* Ensure background color transitions smoothly */
body {
  @apply bg-white text-gray-900 transition-colors duration-300;
}

.dark body {
  @apply bg-black text-white;
}
</style>
