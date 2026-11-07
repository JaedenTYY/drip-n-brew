import { defineEventHandler, readBody, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { ShopStatusConfig } from '~/types'

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

    const body = await readBody<ShopStatusConfig>(event)
    if (!body || !Array.isArray(body.schedule)) {
      return { success: false, error: 'Invalid shop status payload.' }
    }

    const updatedValue: ShopStatusConfig = {
      manual_override: body.manual_override ?? null,
      schedule: body.schedule,
      updated_at: new Date().toISOString()
    }

    const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({
        key: 'shop_status',
        value: updatedValue as any,
        updated_at: updatedValue.updated_at
      }, { onConflict: 'key' })

    if (upsertError) {
      throw new Error('Failed to save shop status: ' + upsertError.message)
    }

    return { success: true, data: updatedValue }
  } catch (err: any) {
    console.error('[Shop Status API] Error:', err.message)
    return { success: false, error: err.message }
  }
})
