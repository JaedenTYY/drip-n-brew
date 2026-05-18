import { defineStore } from 'pinia'
import type { InventoryItem } from '~/types'
import { useSupabase } from '~/composables/useSupabase'

/**
 * Inventory Store: Manages coffee shop supplies and manual stock adjustments.
 */
export const useInventoryStore = defineStore('inventory', () => {
  const supabase = useSupabase()

  // --- State ---
  const items = ref<Record<string, InventoryItem>>({})
  const settings = ref<{ mailing_list: string }>({ mailing_list: '' })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- Getters ---
  const allItems = computed(() => {
    return Object.values(items.value).sort((a, b) => a.name.localeCompare(b.name))
  })

  // --- Actions ---

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'inventory_config')
        .single()

      if (data) {
        settings.value = data.value
      }
    } catch (err) {
      console.error('[Inventory Store] Settings Fetch Error:', err)
    }
  }

  const updateSettings = async (newSettings: { mailing_list: string }) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'inventory_config',
          value: newSettings
        })

      if (error) throw error
      settings.value = newSettings
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetches the current inventory state from Supabase.
   */
  const fetchInventory = async () => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      // Normalize into Record for O(1) lookup
      const normalized: Record<string, InventoryItem> = {}
      data?.forEach(item => {
        normalized[item.id] = item as InventoryItem
      })
      items.value = normalized
    } catch (err: any) {
      error.value = err.message
      console.error('[Inventory Store] Fetch Error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Updates an item's details and records the change in inventory_logs.
   */
  const updateStock = async (
    itemId: string, 
    newCount: number, 
    notes: string, 
    expiryDate: string | null,
    name?: string,
    unit?: string
  ) => {
    const originalItem = items.value[itemId]
    if (!originalItem) return { success: false, error: 'Item not found' }

    const delta = newCount - originalItem.unopened_count
    
    try {
      isLoading.value = true

      // 1. Update the item state
      const updates: any = {
        unopened_count: newCount,
        opened_state_notes: notes,
        nearest_expiry_date: expiryDate
      }
      if (name) updates.name = name
      if (unit) updates.unit = unit

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', itemId)

      if (updateError) throw updateError

      // 2. Create the audit trail log if there was a delta
      if (delta !== 0) {
        // Get the current user for the audit trail
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error: logError } = await supabase
          .from('inventory_logs')
          .insert({
            item_id: itemId,
            adjustment_amount: delta,
            reason: 'Manual Dashboard Adjustment',
            created_by: user?.id // Record who made the change
          })

        if (logError) {
          console.warn('[Inventory Store] Stock updated but log failed:', logError)
        }

        // Trigger Alert if mailing list is set
        if (settings.value.mailing_list) {
          sendInventoryAlert({
            itemName: name || originalItem.name,
            previousQty: originalItem.unopened_count,
            newQty: newCount,
            delta,
            notes,
            expiryDate,
            updatedBy: user?.email || 'System'
          })
        }
      }

      // 3. Update local state
      items.value[itemId] = {
        ...originalItem,
        ...updates,
        updated_at: new Date().toISOString()
      }

      return { success: true }
    } catch (err: any) {
      console.error('[Inventory Store] Update Stock Error:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Adds a new item to the inventory and records the initial state.
   */
  const addItem = async (item: { 
    name: string, 
    unopened_count: number, 
    unit: string, 
    nearest_expiry_date: string | null 
  }) => {
    try {
      isLoading.value = true
      
      // 1. Insert the new item
      const { data: newItem, error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          name: item.name,
          unopened_count: item.unopened_count,
          unit: item.unit,
          nearest_expiry_date: item.nearest_expiry_date,
          opened_state_notes: ''
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Initial Audit Log
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('inventory_logs').insert({
        item_id: newItem.id,
        adjustment_amount: item.unopened_count,
        reason: 'Initial Stock Entry',
        created_by: user?.id
      })

      // Trigger Alert if mailing list is set
      if (settings.value.mailing_list) {
        sendInventoryAlert({
          itemName: item.name,
          previousQty: 0,
          newQty: item.unopened_count,
          delta: item.unopened_count,
          notes: 'Initial Stock Entry',
          expiryDate: item.nearest_expiry_date,
          updatedBy: user?.email || 'System'
        })
      }

      // 3. Update local state
      items.value[newItem.id] = newItem as InventoryItem
      
      return { success: true }
    } catch (err: any) {
      console.error('[Inventory Store] Add Item Error:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const sendInventoryAlert = async (data: any) => {
    if (!settings.value.mailing_list) return

    $fetch('/api/send-inventory-alert', {
      method: 'POST',
      body: {
        recipients: settings.value.mailing_list,
        ...data
      }
    }).catch(err => console.error('[Inventory Store] Alert Email Error:', err))
  }

  const sendStatusReport = async () => {
    if (!settings.value.mailing_list) return { success: false, error: 'Mailing list not configured' }
    
    try {
      isLoading.value = true
      const { data: { user } } = await supabase.auth.getUser()
      
      const result = await $fetch('/api/send-inventory-report', {
        method: 'POST',
        body: {
          recipients: settings.value.mailing_list,
          items: allItems.value,
          senderEmail: user?.email || 'Barista'
        }
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  return {
    items,
    settings,
    isLoading,
    error,
    allItems,
    fetchInventory,
    fetchSettings,
    updateSettings,
    updateStock,
    addItem,
    sendStatusReport
  }
})
