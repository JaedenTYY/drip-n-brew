<script setup lang="ts">
import type { Product } from '~/types'
import MarkdownContent from './MarkdownContent.vue'

/**
 * ProductCard: The smallest reusable unit for displaying a menu item.
 * It is a "Presentational" component that receives data via props
 * and communicates interactions via emits.
 */
const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', product: Product): void
}>()

/**
 * Formatter for the price.
 * Coffee shops often use a simple RM X.XX format.
 */
const formattedPrice = computed(() => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(props.product.price)
})
</script>

<template>
  <div 
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 shadow-sm"
    :class="[
      product.is_available 
        ? 'hover:shadow-xl hover:shadow-gray-200/50' 
        : 'opacity-70 grayscale-[0.5]'
    ]"
  >
    <!-- Image Container -->
    <div class="relative aspect-square overflow-hidden bg-gray-50">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-500"
        :class="{'group-hover:scale-110': product.is_available}"
        loading="lazy"
      />
      <!-- Placeholder if no image -->
      <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
        <span class="text-sm font-medium">No Image</span>
      </div>

      <!-- Sold Out Badge Overlay -->
      <div v-if="!product.is_available" class="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div class="bg-gray-900/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl border border-white/20">
          Sold Out
        </div>
      </div>
      
      <!-- Overlay Add Button (Only if available) -->
      <button
        v-if="product.is_available"
        @click="emit('add-to-cart', product)"
        class="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-all duration-300 hover:bg-orange-700 active:scale-90 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        aria-label="Add to cart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>

    <!-- Product Info -->
    <div class="flex flex-1 flex-col p-4">
      <div class="mb-2 flex items-start justify-between">
        <h3 
          class="text-lg font-bold text-gray-900 transition-colors uppercase italic tracking-tight"
          :class="{'group-hover:text-orange-600': product.is_available}"
        >
          {{ product.name }}
        </h3>
        <span class="text-lg font-black text-orange-600 tracking-tighter" :class="{'opacity-50': !product.is_available}">
          {{ formattedPrice }}
        </span>
      </div>
      
      <div class="mb-4 line-clamp-3 text-sm text-gray-500 flex-1">
        <MarkdownContent :content="product.description || 'No description available for this item.'" />
      </div>

      <!-- Category Badge -->
      <div class="mt-auto flex items-center justify-between">
        <span class="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-700">
          {{ product.category }}
        </span>
        <span v-if="!product.is_available" class="text-[9px] font-black text-red-500 uppercase tracking-tighter">Unavailable</span>
      </div>
    </div>
  </div>
</template>
