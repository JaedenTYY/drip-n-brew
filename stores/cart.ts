import { defineStore } from 'pinia'
import type { Product, CartItem, ItemCustomizations } from '~/types'
import { useSupabase } from '~/composables/useSupabase'

/**
 * Cart Store: Manages the state of the customer's shopping cart.
 * Uses the Composition API pattern for better type safety and logic reuse.
 */
export const useCartStore = defineStore('cart', () => {
  const supabase = useSupabase()

  // --- State ---
  const items = ref<CartItem[]>([])
  const appliedPromoCode = ref<string | null>(null)
  const discountPercent = ref(0)
  const requiresSurvey = ref(false)

  // --- Persistence ---
  // Load initial state from localStorage if available
  onMounted(() => {
    if (process.client) {
      const savedCart = localStorage.getItem('dnb_cart_items')
      if (savedCart) {
        try {
          items.value = JSON.parse(savedCart)
        } catch (e) {
          console.error('[Cart Store] Failed to restore cart:', e)
        }
      }
    }
  })

  // Watch for changes and sync to localStorage
  watch(items, (newItems) => {
    if (process.client) {
      localStorage.setItem('dnb_cart_items', JSON.stringify(newItems))
    }
  }, { deep: true })

  // --- Getters (Computed) ---
  
  /**
   * Total number of individual items in the cart.
   */
  const totalItems = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  /**
   * Total price of all items in the cart.
   * Includes the -0.50 discount for 'BYO Flask'.
   * Handles dynamic discount if a valid promo code is applied.
   */
  const totalPrice = computed(() => {
    const subtotal = items.value.reduce((total, item) => {
      let itemPrice = item.price
      if (item.customizations?.service_type === 'BYO Flask') {
        itemPrice = Math.max(0, itemPrice - 0.50)
      }
      return total + (itemPrice * item.quantity)
    }, 0)

    if (discountPercent.value > 0) {
      const discount = subtotal * (discountPercent.value / 100)
      return Math.max(0, subtotal - discount)
    }

    return subtotal
  })

  /**
   * Formatted total price in RM (MYR).
   */
  const formattedTotalPrice = computed(() => {
    if (totalPrice.value === 0 && items.value.length > 0) {
      return 'FREE'
    }
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(totalPrice.value)
  })

  // --- Actions ---

  /**
   * Validates and applies a promo code from the database.
   */
  const applyPromoCode = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase()
    
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        appliedPromoCode.value = null
        discountPercent.value = 0
        requiresSurvey.value = false
        return { success: false, message: 'Invalid or expired promo code.' }
      }

      appliedPromoCode.value = data.code
      discountPercent.value = data.discount_value
      requiresSurvey.value = data.requires_survey
      return { success: true, message: `Promo applied! ${data.discount_value}% discount.` }
      
    } catch (err) {
      return { success: false, message: 'Could not verify promo code.' }
    }
  }

  /**
   * Adds a product to the cart with customizations.
   */
  const addItem = (product: Product, customizations?: ItemCustomizations) => {
    const existingItem = items.value.find(item => 
      item.id === product.id && 
      JSON.stringify(item.customizations) === JSON.stringify(customizations)
    )
    
    if (existingItem) {
      existingItem.quantity++
    } else {
      items.value.push({
        ...product,
        quantity: 1,
        customizations: customizations ? { ...customizations } : undefined
      })
    }
  }

  /**
   * Removes a product entirely from the cart.
   */
  const removeItem = (productId: string) => {
    const index = items.value.findIndex(item => item.id === productId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }

  /**
   * Updates the quantity of a specific item.
   */
  const updateQuantity = (productId: string, quantity: number) => {
    const item = items.value.find(item => item.id === productId)
    if (!item) return

    if (quantity <= 0) {
      removeItem(productId)
    } else {
      item.quantity = quantity
    }
  }

  /**
   * Resets the cart to an empty state.
   */
  const clearCart = () => {
    items.value = []
    appliedPromoCode.value = null
    discountPercent.value = 0
    requiresSurvey.value = false
  }

  return {
    items,
    appliedPromoCode,
    discountPercent,
    requiresSurvey,
    totalItems,
    totalPrice,
    formattedTotalPrice,
    applyPromoCode,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  }
})
