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
  const orders = ref<Record<string, Order>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  
  // Realtime channel reference for cleanup
  let ordersChannel: any = null

  // --- Getters ---
  const activeOrders = computed(() => {
    return Object.values(orders.value)
      .filter(order => order.status !== 'completed')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  const historyOrders = computed(() => {
    return Object.values(orders.value)
      .filter(order => order.status === 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  })

  // --- Actions ---

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

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('id', orderId)
        .single()

      if (error) throw error
      if (data) {
        orders.value[data.id] = data as Order
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err)
    }
  }

  const fetchActiveOrders = async (silent = false) => {
    if (!silent) isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      const normalizedOrders: Record<string, Order> = {}
      data?.forEach(order => {
        normalizedOrders[order.id] = order as Order
      })
      orders.value = normalizedOrders
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching orders:', err)
    } finally {
      if (!silent) isLoading.value = false
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
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
      if (orders.value[orderId] && previousStatus) {
        orders.value[orderId].status = previousStatus
      }
      console.error('Failed to update status:', err)
      alert('Failed to update order status. Please try again.')
    }
  }

  /**
   * Sets up resilient real-time listeners.
   */
  const initializeRealtime = () => {
    if (ordersChannel) {
      console.log('[POS Store] Cleaning up existing channel before re-init...')
      cleanupRealtime()
    }

    connectionStatus.value = 'connecting'
    console.log('[POS Store] Initializing real-time sync...')

    ordersChannel = supabase
      .channel('pos-orders-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[POS Store] New Order Inserted:', payload.new.id)
          fetchOrderDetails(payload.new.id)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new as Order
          console.log('[POS Store] Order Updated:', updatedOrder.id, updatedOrder.status)
          
          if (updatedOrder.status === 'completed') {
            delete orders.value[updatedOrder.id]
          } else if (orders.value[updatedOrder.id]) {
            orders.value[updatedOrder.id].status = updatedOrder.status
          } else {
            fetchOrderDetails(updatedOrder.id)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[POS Store] Order Deleted:', payload.old.id)
          delete orders.value[payload.old.id]
        }
      )
      .subscribe((status) => {
        console.log('[POS Store] Channel Status:', status)
        if (status === 'SUBSCRIBED') {
          connectionStatus.value = 'connected'
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          connectionStatus.value = 'disconnected'
          // Exponential backoff or simple retry
          setTimeout(initializeRealtime, 5000)
        }
      })
  }

  const cleanupRealtime = () => {
    if (ordersChannel) {
      supabase.removeChannel(ordersChannel)
      ordersChannel = null
      connectionStatus.value = 'disconnected'
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (deleteError) throw deleteError
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
    connectionStatus,
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
