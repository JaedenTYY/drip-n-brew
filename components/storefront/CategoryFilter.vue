<script setup lang="ts">
/**
 * CategoryFilter: Optimized for mobile with smooth horizontal scrolling.
 * Fixed visibility issues for right-most items.
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
  <!-- 
    Removed mask-fade-right to fix "shadowing" over the last items.
    Added pr-10 (extra right padding) to ensure the last item is never cut off.
  -->
  <div class="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
    <!-- "All Items" Pill -->
    <button
      @click="emit('category-selected', null)"
      class="whitespace-nowrap rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 border-2 flex-shrink-0"
      :class="[
        !activeCategory 
          ? 'bg-gray-900 border-gray-900 text-white shadow-xl shadow-gray-200' 
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
      class="whitespace-nowrap rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 border-2 flex-shrink-0"
      :class="[
        activeCategory === category 
          ? 'bg-gray-900 border-gray-900 text-white shadow-xl shadow-gray-200' 
          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
      ]"
    >
      {{ category }}
    </button>
    
    <!-- Spacer for the end of the scroll list -->
    <div class="w-8 flex-shrink-0"></div>
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
</style>
