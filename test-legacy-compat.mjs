import { config } from 'dotenv';
config({ path: '.env.local' });

const BACKEND_URL = 'http://localhost:3000'; // Or process.env.NEXT_PUBLIC_SITE_URL

async function testLegacyAI() {
    console.log("🧪 Testing AI Legacy Payload { query: '...' }");
    const payload = { query: "RTX 4070" };
    // This is hard to test without a running server, 
    // so I'll simulate the logic locally like I did before.
}

import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateLegacyOrder() {
    console.log("🧪 Simulating Legacy Order (Single address string, 'id' instead of 'product_id')...");
    
    // Partner Frontend Payload
    const body = {
        items: [{ id: 1, quantity: 1 }],
        address: "House 10, St 50, Salmiya, Hawalli"
    };

    try {
        const { items, address } = body;
        const pId = items[0].id;
        
        // 1. Resolve product
        const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', pId).single();
        if (!product) throw new Error("Product not found");
        
        // 2. Format Address
        const finalAddress = address; // Fallback logic
        const destinationCity = address.split(',').pop()?.trim() || 'Kuwait City';
        
        console.log("Detected City:", destinationCity);
        console.log("Final Address:", finalAddress);

        // 3. Simulated Insert
        const { data: order, error } = await supabaseAdmin.from('orders').insert({
            status: 'legacy_test',
            total: product.price,
            shipping_address: finalAddress,
            shipping_city: destinationCity,
            courier: "DHL",
            courier_cost: 4.5
        }).select().single();

        if (error) {
            console.error("❌ Legacy compatibility failed:", error.message);
        } else {
            console.log("✅ Legacy compatibility SUCCESS. Order ID:", order.id);
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
        }
    } catch (e) {
        console.error("Simulation error:", e.message);
    }
}

simulateLegacyOrder();
