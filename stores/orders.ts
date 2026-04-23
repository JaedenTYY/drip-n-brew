import { defineStore } from 'pinia'
import type { Order, OrderStatus } from '~/types'
import { useSupabase } from '~/composables/useSupabase'

/**
 * Orders Store: Manages the active order pipeline for the Barista POS.
 * Uses a normalized state (Object map) for O(1) lookups and updates.
 */
export const useOrdersStore = defineStore('orders', () => {
  const supabase = useSupabase()

  // --- State ---
  // We use a Record (Object) instead of an Array to store orders.
  // This allows us to instantly find and update an order by its ID.
  const orders = ref<Record<string, Order>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Realtime channel reference for cleanup
  let ordersChannel: any = null

  // --- Getters ---
  
  /**
   * Returns orders as a sorted array for the UI components.
   * Filtered to exclude 'completed' orders by default for the dashboard.
   */
  const activeOrders = computed(() => {
    return Object.values(orders.value)
      .filter(order => order.status !== 'completed')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  /**
   * Returns all 'completed' orders sorted by most recent first.
   */
  const historyOrders = computed(() => {
    return Object.values(orders.value)
      .filter(order => order.status === 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  })

  // --- Actions ---

  /**
   * Fetches the last 100 completed orders for history.
   */
  const fetchOrderHistory = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError

      // Merge into state (preserve existing active orders)
      data?.forEach(order => {
        orders.value[order.id] = order as Order
      })
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching order history:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetches an individual order with its items and product details.
   * Useful for hydrating real-time 'INSERT' events.
   */
  const fetchOrderDetails = async (orderId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .eq('id', orderId)
      .single()

    if (error) throw error
    if (data) {
      orders.value[data.id] = data as Order
    }
  }

  /**
   * Initial fetch of all non-completed orders.
   */
  const fetchActiveOrders = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      // Transform array to normalized object
      const normalizedOrders: Record<string, Order> = {}
      data?.forEach(order => {
        normalizedOrders[order.id] = order as Order
      })
      orders.value = normalizedOrders
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching orders:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Updates an order's status in Supabase and the local state.
   */
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    // 1. Optimistic Update: Update UI immediately
    const previousStatus = orders.value[orderId]?.status
    if (orders.value[orderId]) {
      orders.value[orderId].status = status
    }

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError
    } catch (err: any) {
      // 2. Rollback on failure
      if (orders.value[orderId] && previousStatus) {
        orders.value[orderId].status = previousStatus
      }
      console.error('Failed to update status:', err)
      alert('Failed to update order status. Please try again.')
    }
  }

  /**
   * Sets up real-time listeners for the orders table.
   */
  const initializeRealtime = () => {
    if (ordersChannel) return // Prevent duplicate listeners

    ordersChannel = supabase
      .channel('pos-orders-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // A new order was placed! Fetch its full details (with items) and add to state.
          fetchOrderDetails(payload.new.id)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          // An order was updated (possibly by another barista).
          const updatedOrder = payload.new as Order
          
          if (updatedOrder.status === 'completed') {
            // Remove from active view if completed
            delete orders.value[updatedOrder.id]
          } else if (orders.value[updatedOrder.id]) {
            // Update existing order status
            orders.value[updatedOrder.id].status = updatedOrder.status
          } else {
            // If it's an update for an order we don't have (rare), fetch it
            fetchOrderDetails(updatedOrder.id)
          }
        }
      )
      .subscribe()
  }

  const cleanupRealtime = () => {
    if (ordersChannel) {
      supabase.removeChannel(ordersChannel)
      ordersChannel = null
    }
  }

  /**
   * Deletes an order and its associated items.
   * Supabase should handle cascading deletes if foreign keys are setup, 
   * but we also update local state.
   */
  const deleteOrder = async (orderId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (deleteError) throw deleteError

      // Remove from local state
      delete orders.value[orderId]
    } catch (err: any) {
      console.error('Failed to delete order:', err)
      alert('Failed to delete order. Please try again.')
    }
  }

  return {
    orders,
    isLoading,
    error,
    activeOrders,
    historyOrders,
    fetchActiveOrders,
    fetchOrderHistory,
    updateOrderStatus,
    deleteOrder,
    initializeRealtime,
    cleanupRealtime
  }
})
