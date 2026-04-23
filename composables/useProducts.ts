import type { Product } from '~/types'

/**
 * Composable for managing and fetching the product catalog.
 * Optimized to serve both the POS (all items) and the Storefront (available items).
 */
export const useProducts = () => {
  const supabase = useSupabase()

  /**
   * Fetch ALL products from the database.
   * We no longer filter by 'is_available' in the query so that the POS
   * can see and manage all items.
   */
  const { data: allProducts, pending, error, refresh } = useAsyncData<Product[]>(
    'products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Product[]
    },
    {
      default: () => []
    }
  )

  /**
   * Computed property for the POS/Manager.
   * Returns all items.
   */
  const products = computed(() => allProducts.value)

  /**
   * Computed property for the Storefront.
   * Filters out unavailable items and sorts available ones to the top.
   */
  const availableProducts = computed(() => {
    return [...allProducts.value]
      .filter(p => p.is_available)
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * Groups ONLY available products by their category.
   * Used for the main Storefront navigation.
   */
  const productsByCategory = computed(() => {
    const groups: Record<string, Product[]> = {}
    
    availableProducts.value.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = []
      }
      groups[product.category].push(product)
    })
    
    return groups
  })

  /**
   * Returns categories from available products.
   */
  const categories = computed(() => {
    return Object.keys(productsByCategory.value).sort()
  })

  return {
    products,
    allProducts,
    availableProducts,
    productsByCategory,
    categories,
    pending,
    error,
    refresh
  }
}
