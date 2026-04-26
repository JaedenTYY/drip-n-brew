import { defineStore } from 'pinia'
import type { Order, OrderStatus } from '~/types'
import { useSupabase } from '~/composables/useSupabase'

/**
 * Orders Store: Manages the active order pipeline for the Barista POS.
 */
export const useOrdersStore = defineStore('orders', () => {
  const supabase = useSupabase()

  // --- State ---
  const orders = ref<Record<string, Order>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  
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
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      data?.forEach(order => { orders.value[order.id] = order as Order })
    } catch (err: any) {
      error.value = err.message
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
        console.log('[POS Store] Hydrated Order Details:', data)
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err)
    }
  }

  const fetchActiveOrders = async (silent = false) => {
    if (!silent) isLoading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      const normalizedOrders: Record<string, Order> = {}
      data?.forEach(order => { normalizedOrders[order.id] = order as Order })
      orders.value = normalizedOrders
    } catch (err: any) {
      error.value = err.message
    } finally {
      if (!silent) isLoading.value = false
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.value[orderId]
    const previousStatus = order?.status
    if (order) order.status = status

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Trigger Email Notification on 'ready'
      if (status === 'ready' && order && order.email) {
        // ALWAYS re-fetch details to ensure we have product names for the email
        console.log('[POS Store] Preparing email... fetching items for:', orderId)
        await fetchOrderDetails(orderId)
        
        const hydratedOrder = orders.value[orderId]
        
        // BIG-TECH DEBUG: Log the items we are about to send
        console.log('[POS Store] Email Payload Items:', hydratedOrder.items?.map(i => i.product?.name))

        $fetch('/api/send-completion-email', {
          method: 'POST',
          body: {
            customerEmail: hydratedOrder.email,
            customerName: hydratedOrder.customer_name,
            orderId: hydratedOrder.id,
            totalPrice: hydratedOrder.total_price,
            items: hydratedOrder.items?.map(item => ({
              name: item.product?.name || 'Handcrafted Drink',
              quantity: item.quantity,
              customizations: item.customizations || {}
            })) || []
          }
        }).catch(err => console.error('[POS Store] Email API Error:', err))
      }
    } catch (err: any) {
      if (order && previousStatus) order.status = previousStatus
      console.error('Failed to update status:', err)
    }
  }

  const initializeRealtime = () => {
    if (ordersChannel) cleanupRealtime()
    connectionStatus.value = 'connecting'
    ordersChannel = supabase
      .channel('pos-orders-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => fetchOrderDetails(p.new.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => {
        if (p.new.status === 'completed') delete orders.value[p.new.id]
        else fetchOrderDetails(p.new.id)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (p) => delete orders.value[p.old.id])
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') connectionStatus.value = 'connected'
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          connectionStatus.value = 'disconnected'
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
      const { error: deleteError } = await supabase.from('orders').delete().eq('id', orderId)
      if (deleteError) throw deleteError
      delete orders.value[orderId]
    } catch (err: any) {
      console.error('Failed to delete order:', err)
    }
  }

  return {
    orders, isLoading, error, connectionStatus, activeOrders, historyOrders,
    fetchActiveOrders, fetchOrderHistory, updateOrderStatus, deleteOrder,
    initializeRealtime, cleanupRealtime
  }
})
