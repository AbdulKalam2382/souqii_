import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFK() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'orders' }).select('*');
  // If get_table_info doesn't exist, use a direct query
  if (error) {
    const { data: schema, error: schemaError } = await supabase.from('orders').select('*').limit(0);
    console.log("Schema columns (no data):", Object.keys(schema?.[0] || {}));
    
    const { data: fkData } = await supabase.rpc('get_foreign_keys', { table_name: 'orders' });
    console.log("Foreign keys:", fkData || "Check manually in dashboard");
  } else {
    console.log("Table info:", data);
  }
}

checkFK();
