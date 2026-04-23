<script setup lang="ts">
/**
 * CategoryFilter: Allows customers to filter the menu by item category.
 * It provides a visual feedback for the currently active filter.
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
  <div class="flex flex-wrap items-center gap-2 py-4">
    <!-- "All Items" Filter -->
    <button
      @click="emit('category-selected', null)"
      class="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200"
      :class="[
        !activeCategory 
          ? 'bg-orange-600 text-white shadow-md' 
          : 'bg-white text-gray-600 hover:bg-gray-100'
      ]"
    >
      All Items
    </button>

    <!-- Specific Category Filters -->
    <button
      v-for="category in categories"
      :key="category"
      @click="emit('category-selected', category)"
      class="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 capitalize"
      :class="[
        activeCategory === category 
          ? 'bg-orange-600 text-white shadow-md' 
          : 'bg-white text-gray-600 hover:bg-gray-100'
      ]"
    >
      {{ category }}
    </button>
  </div>
</template>
