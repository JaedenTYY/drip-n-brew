import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // A simple query to 'touch' the database and keep it from pausing
    const { error } = await supabase.from('products').select('id').limit(1)
    
    if (error) throw error

    return new Response("Project is Awake", { status: 200 })
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})
