
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('Verifying RPC get_daily_analytics...');
  const { data, error } = await supabase.rpc('get_daily_analytics', { days_limit: 30 });
  
  if (error) {
    console.error('Error calling RPC:', error);
  } else {
    console.log('RPC Result:', data);
    console.log('Result count:', data ? data.length : 0);
  }

  console.log('\nChecking orders table...');
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error checking orders:', countError);
  } else {
    console.log('Total orders:', count);
  }

  const { data: completedOrders, error: completedError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'completed');
  
  if (completedError) {
    console.error('Error checking completed orders:', completedError);
  } else {
    console.log('Completed orders:', completedOrders.length);
  }
}

verify();
