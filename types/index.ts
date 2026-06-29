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
  /** Primary category for legacy support and DB constraints */
  category: string
  /** Categories for filtering (e.g., ['Espresso', 'Cold Brew', 'Pastry']) */
  categories: string[]
  /** Allowed temperature options for this product. If omitted, defaults to ['Hot', 'Cold'] for coffee. */
  allowed_temperatures?: ('Hot' | 'Cold')[]
  /** Visibility toggle for the storefront */
  is_available: boolean
  /** ISO timestamp of creation */
  created_at: string
  /** Global sort order for menu layout */
  display_order?: number
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
  /** Email for receipt and notifications */
  email: string
  /** Applied promo code if any */
  promo_code?: string
  /** Human-readable short ID (e.g., #001) */
  order_number?: string
  /** Order type: Dine In, Takeaway, etc. */
  order_type: 'Dine In' | 'Takeaway' | 'BYO Flask'
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
 * Inventory item representing stock levels and state.
 */
export interface InventoryItem {
  id: string
  name: string
  unopened_count: number
  opened_state_notes: string | null
  nearest_expiry_date: string | null
  unit: string
  created_at: string
  updated_at: string
}

/**
 * Promo code details for discount logic.
 */
export interface PromoCode {
  id: string
  code: string
  discount_type: string
  discount_value: number
  is_active: boolean
  requires_survey: boolean
}

/**
 * Survey data captured for Newcomer flow (PCO Integration).
 */
export interface PCOSurveyData {
  invitedBy?: string
  lookingForChurch: boolean
  knowMoreAboutJesus: boolean
  newcomerPhone?: string
  useNewcomerPhoneAsPrimary: boolean
  newcomerName?: string
  useNewcomerNameAsPrimary: boolean
}

/**
 * Audit log entry for inventory adjustments.
 */
export interface InventoryLog {
  id: string
  item_id: string
  adjustment_amount: number
  reason: string | null
  created_at: string
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
