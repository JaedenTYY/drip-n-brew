import type { Product } from '~/types'
import { useRoute } from 'vue-router'

/**
 * Normalizes a category string to Title Case.
 */
const normalizeCategory = (cat: string) => {
  return cat.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Composable for managing and fetching the product catalog.
 * Optimized to serve both the POS (all items) and the Storefront (available items).
 * 
 * Features:
 * - Centralized data fetching with useAsyncData
 * - Parallel loading of products and global settings
 * - Reactive grouping and sorting by "Natural Menu Order"
 */
export const useProducts = () => {
  const supabase = useSupabase()
  const route = useRoute()
  
  // Isolate cache keys so the POS and Storefront don't corrupt each other's state
  const cacheKey = route.path.startsWith('/pos') ? 'pos-products' : 'storefront-products'

  /**
   * Core Data Fetcher
   * Retrieves products and the dynamic category sort order from the DB.
   */
    const { data: catalog, pending, error, refresh } = useAsyncData(
    cacheKey,
    async () => {
      const [productsRes, categoryOrderArray] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, description, price, image_url, category, categories, allowed_temperatures, is_available, created_at, display_order')
          .order('display_order', { ascending: true })
          .order('name'),
        $fetch<string[]>('/api/settings/category-order').catch(() => [])
      ])

      if (productsRes.error) throw productsRes.error
      
      const normalizedProducts = (productsRes.data || []).map(p => ({
        ...p,
        categories: (p.categories || []).map(normalizeCategory)
      }))

      return {
        products: normalizedProducts as Product[],
        categoryOrder: categoryOrderArray || []
      }
    },
    {
      default: () => ({ products: [], categoryOrder: [] })
    }
  )

  // --- Reactive State ---

  /** All items in the catalog (for POS) */
  const allProducts = computed(() => catalog.value?.products || [])
  
  /** Preferred display order for categories */
  const categoryOrder = computed(() => catalog.value?.categoryOrder || [])

  /** Filtered items for the customer view */
  const availableProducts = computed(() => {
    return allProducts.value.filter(p => p.is_available)
  })

  /**
   * Groups products by their normalized categories.
   * Note: A product appearing in multiple categories will be included in each group.
   */
  const productsByCategory = computed(() => {
    const groups: Record<string, Product[]> = {}
    availableProducts.value.forEach((product) => {
      product.categories.forEach((category) => {
        if (!groups[category]) groups[category] = []
        groups[category].push(product)
      })
    })
    return groups
  })

  /**
   * Returns a sorted list of unique categories.
   * Sorting priority:
   * 1. Position in the database-defined 'category_order'
   * 2. Alphabetical (for any categories not explicitly ranked)
   */
  const categories = computed(() => {
    const order = categoryOrder.value
    return Object.keys(productsByCategory.value).sort((a, b) => {
      const indexA = order.indexOf(a)
      const indexB = order.indexOf(b)
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    })
  })

  return {
    // State
    products: allProducts,      // alias kept for POS components (NewOrderModal, OrderEditModal, ProductManager)
    allProducts,
    availableProducts,
    productsByCategory,
    categories,
    categoryOrder,
    
    // Status
    pending,
    error,
    
    // Actions
    refresh
  }
}
