import type { CheckoutResult, Order, PCOSurveyData } from '~/types'
import { useCartStore } from '~/stores/cart'

/**
 * Composable to handle the checkout process.
 * Invokes the Supabase Edge Function 'checkout' to handle 
 * DB writes, PCO sync, and Gmail notifications.
 */
export const useCheckout = () => {
  const supabase = useSupabase()
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
      // Extract the order-level service type from the first item in the cart
      const firstItem = cartStore.items[0]
      const orderType = firstItem?.customizations?.service_type || 'Dine In'

      // Invoke the Supabase Edge Function 'checkout'
      // This bypasses Vercel Hobby plan outbound request restrictions.
      const { data, error } = await supabase.functions.invoke('checkout', {
        body: {
          details: {
            ...details,
            totalPrice: cartStore.totalPrice,
            orderType // Pass the extracted type
          },
          items: cartStore.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customizations: item.customizations
          }))
        }
      })

      if (error) {
        throw new Error(error.message || 'Edge Function execution failed')
      }

      if (data.success && data.order) {
        cartStore.clearCart()
        return { success: true, order: data.order as Order }
      } else {
        throw new Error(data.error || 'An unexpected error occurred during checkout.')
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
