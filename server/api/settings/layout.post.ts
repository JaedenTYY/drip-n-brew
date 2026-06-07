import { defineEventHandler, readBody, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      return { success: false, error: 'Unauthorized: Active session required.' }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(config.public.supabaseUrl, config.public.supabaseKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Invalid or expired session.' }
    }

    const body = await readBody(event)
    const { categoryOrder, productUpdates } = body

    if (!categoryOrder || !productUpdates) {
      return { success: false, error: 'Missing payload' }
    }

    // Use service role key to completely bypass RLS policies
    const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

    // 1. Update Category Order
    const { error: catError } = await supabase
      .from('settings')
      .upsert({
        key: 'category_order',
        value: categoryOrder,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    if (catError) throw new Error('Category Order update failed: ' + catError.message)

    // 2. Update Products
    // Do it in parallel chunks
    const promises = Object.entries(productUpdates).map(([id, display_order]) => 
      supabase.from('products').update({ display_order }).eq('id', id)
    )
    
    const responses = await Promise.all(promises)
    const errors = responses.filter(r => r.error).map(r => r.error)
    
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} products. First error: ${errors[0]?.message}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Layout API] Error:', err.message)
    return { success: false, error: err.message }
  }
})
