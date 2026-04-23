<script setup lang="ts">
import type { Product } from '~/types'
import ProductCard from './ProductCard.vue'

/**
 * ProductGrid: Orchestrates a collection of ProductCard components.
 * Optimized for mobile with a 2-column layout.
 */
defineProps<{
  products: Product[]
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', product: Product): void
}>()
</script>

<template>
  <!-- 
    Using grid-cols-2 on mobile (default) to show more items at once,
    upgrading to more columns as screen size increases.
    Reducing gap for mobile to maximize space.
  -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      @add-to-cart="emit('add-to-cart', $event)"
    />
  </div>
</template>
