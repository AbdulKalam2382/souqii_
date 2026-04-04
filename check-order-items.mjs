import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrderItemsSchema() {
  console.log("🔍 Checking 'order_items' table columns...");
  
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error("❌ Error fetching order_items:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("✅ Columns found from existing records:", Object.keys(data[0]));
  } else {
    console.log("📦 No order_items found. Testing insert...");
    // Let's try to fetch columns by inserting a dummy
    // But we need a valid order_id if it has a FK
  }
}

checkOrderItemsSchema();
