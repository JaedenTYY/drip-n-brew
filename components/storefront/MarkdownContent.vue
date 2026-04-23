<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{
  content: string | null
}>()

const renderedHtml = computed(() => {
  if (!props.content) return ''
  // marked.parse returns a Promise or string depending on options, 
  // but by default with simple usage it's synchronous-like for strings.
  return marked.parse(props.content, { async: false })
})
</script>

<template>
  <div class="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:my-1" v-html="renderedHtml"></div>
</template>

<style>
/* 
  We use a minimal set of prose-like styles if tailwind typography isn't installed,
  or just let Tailwind's prose handle it if it is. 
  Adding some basic overrides for safety.
*/
.prose-sm {
  font-size: 0.875rem;
}
.prose-sm p {
  margin-bottom: 0.5rem;
}
.prose-sm ul {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.prose-sm strong {
  font-weight: 700;
  @apply text-gray-900 dark:text-white;
}
</style>
