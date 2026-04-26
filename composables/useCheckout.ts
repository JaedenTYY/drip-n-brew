import type { CheckoutResult, Order } from '~/types'
import { useCartStore } from '~/stores/cart'

/**
 * Composable to handle the checkout process and order submission to Supabase.
 */
export const useCheckout = () => {
  const supabase = useSupabase()
  const cartStore = useCartStore()
  const isSubmitting = ref(false)

  const submitOrder = async (details: { name: string, phone: string, email: string, promoCode?: string }): Promise<CheckoutResult> => {
    isSubmitting.value = true
    console.log('[Checkout] Starting order submission...', { details, itemsCount: cartStore.items.length })
    
    try {
      // 1. Create the main order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: details.name,
          phone: details.phone,
          email: details.email,
          promo_code: details.promoCode,
          total_price: cartStore.totalPrice,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) {
        console.error('[Checkout] Supabase Order Error:', orderError)
        throw orderError
      }

      console.log('[Checkout] Order created successfully:', order)

      // 2. Create the line items
      const orderItems = cartStore.items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        customizations: item.customizations || {}
      }))

      console.log('[Checkout] Inserting order items...', orderItems)

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('[Checkout] Supabase Items Error:', itemsError)
        throw itemsError
      }

      console.log('[Checkout] All items inserted.')

      return { success: true, order: order as Order }
    } catch (err: any) {
      console.error('[Checkout] Fatal Checkout Error:', err)
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
