import type { Database } from './supabase'

/**
 * Order Status types representing the lifecycle of a coffee order.
 */
export type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

/**
 * Product interface representing a menu item.
 */
export interface Product {
  /** Unique UUID for the product */
  id: string
  /** Display name of the coffee or food item */
  name: string
  /** Brief description for the customer storefront */
  description: string | null
  /** Price in the smallest currency unit (or decimal depending on DB config) */
  price: number
  /** Public URL to the product image hosted in Supabase Storage */
  image_url: string | null
  /** Category for filtering (e.g., 'Espresso', 'Cold Brew', 'Pastry') */
  category: string
  /** Allowed temperature options for this product. If omitted, defaults to ['Hot', 'Cold'] for coffee. */
  allowed_temperatures?: ('Hot' | 'Cold')[]
  /** Visibility toggle for the storefront */
  is_available: boolean
  /** ISO timestamp of creation */
  created_at: string
}

/**
 * Customization options for a specific item in an order.
 */
export interface ItemCustomizations {
  temperature?: 'Hot' | 'Cold'
  service_type?: 'Dine In' | 'Takeaway' | 'BYO Flask'
}

/**
 * Interface for an item added to the shopping cart.
 * We extend Product to ensure we have all display data, 
 * but track quantity specifically for the cart UI.
 */
export interface CartItem extends Product {
  /** Number of units added to the cart */
  quantity: number
  /** Selected options for this item */
  customizations?: ItemCustomizations
}

/**
 * Order interface representing a confirmed purchase.
 */
export interface Order {
  /** Unique UUID for the order */
  id: string
  /** Name provided by the customer at checkout */
  customer_name: string
  /** Phone number for order notifications */
  phone: string
  /** Applied promo code if any */
  promo_code?: string
  /** Current fulfillment status managed by baristas */
  status: OrderStatus
  /** Total calculated price of all items in the order */
  total_price: number
  /** ISO timestamp of when the order was placed */
  created_at: string
  /** Optional relation: items belonging to this order */
  items?: OrderItem[]
}

/**
 * OrderItem interface representing a specific line item within an Order.
 */
export interface OrderItem {
  /** Unique UUID for the line item */
  id: string
  /** Reference to the parent Order */
  order_id: string
  /** Reference to the purchased Product */
  product_id: string
  /** Number of units purchased */
  quantity: number
  /** Price per unit at the time of purchase (snapshot for historical accuracy) */
  unit_price: number
  /** Selected options for this item */
  customizations?: ItemCustomizations
  /** Optional relation: the actual product details */
  product?: Product
}

/**
 * Standard response structure for our checkout process.
 */
export interface CheckoutResult {
  /** Whether the transaction was successful */
  success: boolean
  /** The created order object if successful */
  order?: Order
  /** Error message if the transaction failed */
  error?: string
}
