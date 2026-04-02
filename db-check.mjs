import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  // Check auth table is via auth.admin.listUsers() usually, 
  // but if we have order rows we can see a user_id
  const { data: orders } = await supabase.from('orders').select('user_id').limit(1);
  console.log("Current user IDs from existing orders:", orders);
}

checkUser();
