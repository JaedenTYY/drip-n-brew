<script setup lang="ts">
/**
 * CategoryFilter: Optimized for mobile with horizontal scrolling and premium pill styling.
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
  <div class="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mask-fade-right">
    <!-- "All Items" Pill -->
    <button
      @click="emit('category-selected', null)"
      class="whitespace-nowrap rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 border-2"
      :class="[
        !activeCategory 
          ? 'bg-gray-900 border-gray-900 text-white shadow-xl shadow-gray-200 scale-105' 
          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
      ]"
    >
      All Items
    </button>

    <!-- Category Pills -->
    <button
      v-for="category in categories"
      :key="category"
      @click="emit('category-selected', category)"
      class="whitespace-nowrap rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 border-2"
      :class="[
        activeCategory === category 
          ? 'bg-gray-900 border-gray-900 text-white shadow-xl shadow-gray-200 scale-105' 
          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
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
.mask-fade-right {
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
</style>
