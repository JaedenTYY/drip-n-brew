import type { CheckoutResult, Order, PCOSurveyData } from '~/types'
import { useCartStore } from '~/stores/cart'

/**
 * Composable to handle the checkout process.
 * Refactored to use the server-side proxy for security and integration.
 */
export const useCheckout = () => {
  const cartStore = useCartStore()
  const isSubmitting = ref(false)

  const submitOrder = async (details: { 
    name: string, 
    phone: string, 
    email: string, 
    promoCode?: string,
    survey?: PCOSurveyData
  }): Promise<CheckoutResult> => {
    isSubmitting.value = true
    
    try {
      // We call our server API instead of Supabase directly.
      // This ensures PCO integration is handled securely on the backend.
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: {
            ...details,
            totalPrice: cartStore.totalPrice
          },
          items: cartStore.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customizations: item.customizations
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.statusMessage || 'Checkout failed')
      }

      if (data.success && data.order) {
        // Clear the cart on success
        cartStore.clearCart()
        return { success: true, order: data.order as Order }
      } else {
        throw new Error(data.error || 'An unexpected error occurred.')
      }

    } catch (err: any) {
      console.error('[useCheckout] Fatal Error:', err)
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred during checkout.' 
      }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    submitOrder,
    isSubmitting
  }
}
