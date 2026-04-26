
/**
 * Represents the structure of our Supabase PostgreSQL schema.
 * In a production environment, this file is typically generated via the Supabase CLI:
 * `supabase gen types typescript --project-id your-id > types/supabase.ts`
 * 
 * We define it here manually to establish the contract with our domain interfaces.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category: string
          allowed_temperatures: string[] | null
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          category: string
          allowed_temperatures?: string[] | null
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category?: string
          allowed_temperatures?: string[] | null
          is_available?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          phone: string | null
          email: string
          promo_code: string | null
          status: 'pending' | 'preparing' | 'ready' | 'completed'
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          phone?: string | null
          email: string
          promo_code?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'completed'
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          phone?: string | null
          email?: string
          promo_code?: string | null
          status?: 'pending' | 'preparing' | 'ready' | 'completed'
          total_price?: number
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          customizations: Json | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          customizations?: Json | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          customizations?: Json | null
          }
      }
    }
  }
}
