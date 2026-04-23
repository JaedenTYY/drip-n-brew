<script setup lang="ts">
import type { Product } from '~/types'
import ProductCard from './ProductCard.vue'

/**
 * ProductGrid: Orchestrates a collection of ProductCard components.
 * It manages the layout and bubbles up interaction events.
 */
defineProps<{
  products: Product[]
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', product: Product): void
}>()
</script>

<template>
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
      @add-to-cart="emit('add-to-cart', $event)"
    />
  </div>
</template>
