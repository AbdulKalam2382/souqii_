import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAccount() {
  const email = 'admin@souqii.com';
  const password = 'SouqiiAdmin123!';

  console.log(`Creating user user: ${email}...`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // bypasses email verification requirement
  });

  if (error) {
    if (error.message.includes('already exists')) {
       console.log("Account already exists! You can log in.");
    } else {
       console.error("Error creating user:", error.message);
    }
  } else {
    console.log("✅ User created successfully!");
    console.log("-----------------------------------");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log("-----------------------------------");
  }
}

createAccount();
