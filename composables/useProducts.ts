import type { Product } from '~/types'

/**
 * Composable for managing and fetching the product catalog.
 * Optimized to serve both the POS (all items) and the Storefront (available items).
 */
export const useProducts = () => {
  const supabase = useSupabase()

  /**
   * Fetch ALL products from the database.
   * Optimized: Only select the fields necessary for the catalog display.
   */
  const { data: allProducts, pending, error, refresh } = useAsyncData<Product[]>(
    'products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, categories, allowed_temperatures, is_available, created_at')
        .order('name')

      if (error) throw error
      
      // Normalize categories to Title Case for consistent UI filtering and grouping
      const normalizedData = (data || []).map(p => ({
        ...p,
        categories: (p.categories || []).map(cat => 
          cat.trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        )
      }))

      return normalizedData as Product[]
    },
    {
      default: () => [] as Product[]
    }
  )

  /**
   * Computed property for the POS/Manager.
   * Returns all items.
   */
  const products = computed(() => allProducts.value || [])

  /**
   * Computed property for the Storefront.
   * Filters out unavailable items and sorts available ones to the top.
   */
  const availableProducts = computed(() => {
    return (allProducts.value || [])
      .filter(p => p.is_available)
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * Groups ONLY available products by their category.
   * Used for the main Storefront navigation.
   * Categories are already normalized in the fetch step.
   */
  const productsByCategory = computed(() => {
    const groups: Record<string, Product[]> = {}
    
    availableProducts.value.forEach((product) => {
      product.categories.forEach((category) => {
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(product)
      })
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
