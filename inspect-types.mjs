import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTypes() {
  console.log("🔍 Inspecting column types for 'orders'...");
  
  // Try using RPC to query information_schema if enabled
  const { data, error } = await supabase.rpc('get_column_types', { t_name: 'orders' });
  
  if (error) {
    console.log("RPC failed (expected). Trying manual check via values...");
    // Fetch one row and check value types
    const { data: rows } = await supabase.from('orders').select('*').limit(1);
    if (rows && rows.length > 0) {
      for (const [k, v] of Object.entries(rows[0])) {
         console.log(`${k}: ${typeof v} (Value: ${v})`);
      }
    } else {
      console.log("No rows to inspect. Trying to insert and check error code...");
      // Try to insert a string into a likely integer column
      const { error: typeErr } = await supabase.from('orders').insert({ door_number: "undefined" });
      console.log("Type check error (door_number):", typeErr?.message);
    }
  } else {
    console.log("Column Types:", data);
  }
}

inspectTypes();
