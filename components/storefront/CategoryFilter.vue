<script setup lang="ts">
/**
 * CategoryFilter: Allows customers to filter the menu by item category.
 * Optimized for mobile with horizontal scrolling.
 */
defineProps<{
  categories: string[]
  activeCategory: string | null
}>()

const emit = defineEmits<{
  (e: 'category-selected', category: string | null): void
}>()
</script>

<template>
  <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 mask-fade-right">
    <!-- "All Items" Filter -->
    <button
      @click="emit('category-selected', null)"
      class="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 border-2"
      :class="[
        !activeCategory 
          ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200' 
          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
      ]"
    >
      All
    </button>

    <!-- Specific Category Filters -->
    <button
      v-for="category in categories"
      :key="category"
      @click="emit('category-selected', category)"
      class="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 border-2"
      :class="[
        activeCategory === category 
          ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200' 
          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
      ]"
    >
      {{ category }}
    </button>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
/* Subtle fade to indicate more items to the right */
.mask-fade-right {
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
</style>
