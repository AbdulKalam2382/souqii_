import { config } from 'dotenv';
config({ path: '.env.local' });

// Mock request
const payload = {
    items: [{ product_id: 1, quantity: 1 }],
    door_number: "22",
    street: "St 10",
    block: "5",
    area: "Salmiya",
    city: "Hawalli",
    pincode: "20001",
    channel: 'website'
};

async function checkLocalRoute() {
    try {
        console.log("Loading route.js...");
        // This might fail if Next.js specific imports like '@/lib/...' are not resolved 
        // by standard Node.js.
        // Let's use a dynamic import and handle aliases if needed.
        // But simpler: just inspect the route for things that crash in Node.
        
        // Actually, let's just look at the route code again and find THE CRASH.
    } catch (e) {
        console.error("Test failed:", e);
    }
}

// SIMPLIFIED TRACE:
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function traceableInsert() {
    const total = 100.00;
    const aiCourier = { courier: "DHL", cost: 4.5, reasoning: "reason", estimatedDays: "1-2 days" };
    
    // Potential crash: parseFloat(aiCourier.cost) || 2.50
    // Actually, if aiCourier.cost is a number, it works.
    
    // Potential crash: total.toFixed(2)
    // If total is computed incorrectly?
    
    // Potential crash: aiCourier.estimatedDays.match(...)
    // If match is null?
    
    console.log("Traceable insert starting...");
    const { data, error } = await supabaseAdmin.from('orders').insert({
        user_id: null,
        status: 'pending_payment',
        channel: 'website',
        total: total.toFixed(2),
        // ... all fields
        shipping_address: "Address",
        shipping_city: "City",
        door_number: "22",
        street: "St 10",
        block: "5",
        area: "Salmiya",
        pincode: "20001",
        courier: "DHL",
        courier_cost: 4.5,
        estimated_delivery: "2026-05-05",
        ai_courier_reason: "Reason"
    }).select().single();
    
    if (error) {
        console.error("Trace Error:", error.message);
    } else {
        console.log("Trace OK");
        await supabaseAdmin.from('orders').delete().eq('id', data.id);
    }
}

traceableInsert();
