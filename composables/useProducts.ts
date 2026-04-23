import type { Product } from '~/types'

/**
 * Composable for managing and fetching the product catalog.
 * 
 * It handles the initial fetch of all available products and provides
 * a computed property to group them by category for the storefront UI.
 */
export const useProducts = () => {
  const supabase = useSupabase()

  /**
   * We use useAsyncData to fetch products. This ensures that the data is 
   * fetched on the server during SSR and hydrated on the client without 
   * duplicate network calls.
   */
  const { data: products, pending, error, refresh } = useAsyncData<Product[]>(
    'products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('name')

      if (error) throw error
      return data as Product[]
    },
    {
      // We can use transform to pre-process data if needed, but here we keep it simple
      default: () => []
    }
  )

  /**
   * Groups products by their category.
   * This is a reactive computed property that will update if the products list changes.
   */
  const productsByCategory = computed(() => {
    const groups: Record<string, Product[]> = {}
    
    products.value.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = []
      }
      groups[product.category].push(product)
    })
    
    return groups
  })

  /**
   * Returns a unique list of categories for filter UI.
   */
  const categories = computed(() => {
    return Object.keys(productsByCategory.value).sort()
  })

  return {
    products,
    productsByCategory,
    categories,
    pending,
    error,
    refresh
  }
}
