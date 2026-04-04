import { config } from 'dotenv';
config({ path: '.env.local' });

async function testPostOrder() {
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

  console.log("🚀 Testing POST /api/orders with payload:", payload);

  try {
    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

// Since I can't run a live web server easily to test a self-POST, 
// I'll check the logs in the conversation or simulate the logic in a local script.

// Simulating the route logic in a local script to find the bug:
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateRoute() {
    const body = {
        items: [{ product_id: 1, quantity: 1 }],
        door_number: "22",
        street: "St 10",
        block: "5",
        area: "Salmiya",
        city: "Hawalli",
        pincode: "20001",
        channel: 'website'
    };
    
    try {
        const { user_id, items, door_number, street, block, area, city, pincode, channel = 'website' } = body;
        
        const total = 100.00;
        const oldFormatAddress = `House ${door_number}, St ${street}, Blk ${block}, ${area}`;
        const aiCourier = { courier: "DHL", cost: 4.5, reasoning: "Test reasoning", estimatedDays: "1-2 days" };
        const estimatedDelivery = "2026-04-06";

        console.log("Attempting full insert...");
        
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: user_id || null,
            status: 'pending_payment',
            channel,
            total: total.toFixed(2),
            shipping_address: oldFormatAddress,
            shipping_city: city,
            door_number,
            street,
            block,
            area,
            pincode,
            courier: aiCourier.courier,
            courier_cost: parseFloat(aiCourier.cost) || 2.50,
            estimated_delivery: estimatedDelivery,
            ai_courier_reason: aiCourier.reasoning
          })
          .select()
          .single();
          
        if (orderError) {
            console.error("❌ INSERT ERROR:", orderError.message);
            console.error("Hint:", orderError.hint);
            console.error("Details:", orderError.details);
        } else {
            console.log("✅ Insert succeeded. Clearing test data...");
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
        }
    } catch (e) {
        console.error("Simulation crash:", e);
    }
}

simulateRoute();
