import type { CheckoutResult, Order } from '~/types'
import { useCartStore } from '~/stores/cart'

/**
 * Composable to handle the checkout process and order submission to Supabase.
 */
export const useCheckout = () => {
  const supabase = useSupabase()
  const cartStore = useCartStore()
  const isSubmitting = ref(false)

  /**
   * Submits the current cart as a new order.
   * 
   * @param details - Customer contact and checkout details
   */
  const submitOrder = async (details: { name: string, phone: string, promoCode?: string }): Promise<CheckoutResult> => {
    if (!details.name.trim() || !details.phone.trim()) {
      return { success: false, error: 'Name and Phone are required.' }
    }

    if (cartStore.items.length === 0) {
      return { success: false, error: 'Your cart is empty.' }
    }

    isSubmitting.value = true

    try {
      // 1. Insert the parent Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: details.name,
          phone: details.phone,
          promo_code: details.promoCode,
          status: 'pending',
          total_price: cartStore.totalPrice
        })
        .select()
        .single()

      if (orderError) throw orderError
      const newOrder = orderData as Order

      // 2. Prepare the OrderItems payload
      const orderItemsPayload = cartStore.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        customizations: item.customizations
      }))

      // 3. Insert all OrderItems
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

      if (itemsError) {
        // NOTE: In a production app, you might want to implement a "rollback" 
        // logic here if the items fail but the order was created.
        throw itemsError
      }

      // Success: Clear cart and return the order
      cartStore.clearCart()
      return { success: true, order: newOrder }

    } catch (err: any) {
      console.error('Checkout error:', err)
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
