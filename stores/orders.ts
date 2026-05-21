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

  const fetchOrderHistory = async (options: {
    search?: string,
    type?: string,
    voucher?: string,
    startDate?: string,
    endDate?: string
  } = {}) => {
    isLoading.value = true
    try {
      let query = supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('status', 'completed')

      // Dynamic Filtering
      if (options.search) {
        query = query.ilike('customer_name', `%${options.search}%`)
      }
      
      if (options.type) {
        query = query.eq('order_type', options.type)
      }

      if (options.voucher) {
        // If 'has_voucher' is passed as a string/bool, we filter for any non-null promo_code
        if (options.voucher === 'any') {
          query = query.not('promo_code', 'is', null)
        } else {
          query = query.eq('promo_code', options.voucher)
        }
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate)
      }

      if (options.endDate) {
        // We set to end of day if only date is provided
        const end = options.endDate.includes('T') ? options.endDate : `${options.endDate}T23:59:59`
        query = query.lte('created_at', end)
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      
      // Clear existing history to show only filtered results
      // Note: We only delete 'completed' orders from the local state
      Object.keys(orders.value).forEach(id => {
        if (orders.value[id].status === 'completed') delete orders.value[id]
      })

      data?.forEach(order => { orders.value[order.id] = order as Order })
    } catch (err: any) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const fetchOrderDetails = async (orderId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('id', orderId)
        .single()

      if (error) throw error

      if (data && (!data.items || data.items.length === 0) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 500
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchOrderDetails(orderId, retryCount + 1)
      }

      if (data) {
        orders.value[data.id] = data as Order
      }
    } catch (err) {
      // Log simple message to avoid DevalueError
      console.error('[Orders Store] Failed to fetch order details for', orderId)
    }
  }

  const fetchActiveOrders = async (silent = false, retryCount = 0) => {
    if (!silent && retryCount === 0) isLoading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .neq('status', 'completed')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      // BIG-TECH RELIABILITY: RLS/JOIN RACE CONDITION FIX
      // If we have orders but they have NO items (and it's not a fresh system),
      // it's likely the Supabase join hasn't fully warmed up the permissions.
      const hasOrders = data && data.length > 0
      const missingItems = hasOrders && data.some(o => (o as any).total_price > 0 && (!o.items || o.items.length === 0))
      
      if (missingItems && retryCount < 3) {
        console.warn(`[Orders Store] Items missing for active orders. Retrying fetch... (${retryCount + 1}/3)`)
        const delay = Math.pow(2, retryCount) * 500
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchActiveOrders(silent, retryCount + 1)
      }

      const normalizedOrders: Record<string, Order> = {}
      data?.forEach(order => { normalizedOrders[order.id] = order as Order })
      orders.value = normalizedOrders
    } catch (err: any) {
      error.value = err.message
      console.error('[Orders Store] Fetch active orders failed:', err)
    } finally {
      if (!silent && retryCount === 0) isLoading.value = false
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.value[orderId]
    const previousStatus = order?.status
    
    // OPTIMISTIC UPDATE: Move the UI immediately
    if (order) order.status = status

    try {
      // SCENARIO A: Marking an order as "Ready"
      // We route this through our custom Nitro endpoint to trigger notifications
      if (status === 'ready') {
        console.log(`[POS Store] Triggering "Mark Ready" workflow for ${orderId}`)
        
        const response: any = await $fetch('/api/orders/mark-ready', {
          method: 'POST',
          body: { orderId }
        })

        if (!response.success) {
          throw new Error(response.statusMessage || 'Failed to mark ready')
        }
        
        console.log('[POS Store] Mark Ready Success:', response.notified)
        // Refresh details to ensure state is in sync after the server update
        await fetchOrderDetails(orderId)
      } 
      
      // SCENARIO B: Other Status Transitions (pending -> preparing, ready -> completed)
      // Standard direct Supabase update
      else {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId)

        if (updateError) throw updateError
      }
    } catch (err: any) {
      // ROLLBACK on failure
      if (order && previousStatus) order.status = previousStatus
      console.error('[POS Store] Status update failed:', err)
      error.value = `Failed to update status: ${err.message}`
    }
  }

  const initializeRealtime = () => {
    if (ordersChannel) cleanupRealtime()
    
    console.log('[POS Store] Initializing Realtime Subscription...')
    connectionStatus.value = 'connecting'
    
    ordersChannel = supabase
      .channel('pos-orders-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
        console.log('[POS Store] Realtime INSERT received:', p.new.id)
        fetchOrderDetails(p.new.id)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => {
        console.log('[POS Store] Realtime UPDATE received:', p.new.id, p.new.status)
        if (p.new.status === 'completed') delete orders.value[p.new.id]
        else fetchOrderDetails(p.new.id)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (p) => {
        console.log('[POS Store] Realtime DELETE received:', p.old.id)
        delete orders.value[p.old.id]
      })
      .subscribe((status, err) => {
        console.log(`[POS Store] Subscription Status: ${status}`, err || '')
        if (status === 'SUBSCRIBED') {
          connectionStatus.value = 'connected'
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          connectionStatus.value = 'disconnected'
          console.warn('[POS Store] Realtime connection lost. Retrying in 5s...')
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

  const deleteOrders = async (orderIds: string[]) => {
    if (!orderIds || !orderIds.length) return { success: false, error: 'No orders selected' }
    try {
      const { error: deleteError } = await supabase.from('orders').delete().in('id', orderIds)
      if (deleteError) throw deleteError
      orderIds.forEach(id => delete orders.value[id])
      return { success: true }
    } catch (err: any) {
      console.error('Failed to delete orders:', err)
      return { success: false, error: err.message }
    }
  }

  const updateOrder = async (orderId: string, updates: Partial<Order>, items: any[]) => {
    isLoading.value = true
    try {
      // 1. Update order header (customer name, promo_code, total_price, etc.)
      const { error: orderError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)

      if (orderError) throw orderError

      // 2. Update order items
      // For simplicity, we delete existing and re-insert or use upsert if they have IDs
      // Actually, deleting and re-inserting is cleaner if we want to support adding/removing items
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (deleteItemsError) throw deleteItemsError

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(item => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customizations: item.customizations
        })))

      if (itemsError) throw itemsError

      // 3. Refresh the order in local state
      await fetchOrderDetails(orderId)
      return { success: true }
    } catch (err: any) {
      console.error('[Orders Store] Update failed:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const createOrder = async (orderData: any, items: any[]) => {
    isLoading.value = true
    try {
      // 1. Insert order header
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Insert order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customizations: item.customizations
        })))

      if (itemsError) throw itemsError

      // 3. Refresh the order in local state
      await fetchOrderDetails(order.id)
      return { success: true, order }
    } catch (err: any) {
      console.error('[Orders Store] Creation failed:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  return {
    orders, isLoading, error, connectionStatus, activeOrders, historyOrders,
    fetchActiveOrders, fetchOrderHistory, updateOrderStatus, deleteOrder, deleteOrders, updateOrder, createOrder,
    initializeRealtime, cleanupRealtime
  }
})
