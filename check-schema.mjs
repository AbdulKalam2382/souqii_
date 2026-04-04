import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log("🔍 Checking 'orders' table columns...");
  
  // Try to fetch one row
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error("❌ Error fetching orders:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("✅ Columns found from existing records:", Object.keys(data[0]));
  } else {
    console.log("📦 No orders found to inspect columns. Trying one record fetch with error inspect...");
    // Let's try to fetch columns names by inserting and catching failure
    const { error: insertErr } = await supabase
      .from('orders')
      .insert({
        status: 'dry_run_test',
        total: 0
      })
      .select();
      
    if (insertErr) {
       console.log("❌ Insert failed (likely missing columns or constraints):", insertErr.message);
    } else {
       console.log("✅ Basic insert worked.");
       // Clean up
       await supabase.from('orders').delete().eq('status', 'dry_run_test');
    }
  }
}

checkSchema();
