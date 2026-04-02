import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { sendDispatchNotification } from '@/lib/notify'

export async function POST(req) {
  const payload = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event;
  try {
    // If testing without a webhook secret temporarily, we can bypass verify
    // But in production you MUST set STRIPE_WEBHOOK_SECRET in .env.local
    if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
        event = JSON.parse(payload);
    }
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.order_id;
    
    // Update order status in Supabase
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .select('*, order_items(*, products(*))')
      .single()

    if (error) {
      console.error("Failed to update order status:", error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Now that they PAID, we can securely send the dispatch notification!
    try {
        const itemNames = order.order_items.map(oi => ({ name: oi.products.name }));
        await sendDispatchNotification(
            orderId, 
            "Valued Customer", 
            itemNames, 
            order.courier, 
            order.estimated_delivery
        );
    } catch(e) {
        console.error("Dispatch notification failed:", e)
    }
  }

  return NextResponse.json({ received: true })
}
