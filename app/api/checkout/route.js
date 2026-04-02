import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request) {
  try {
    const { order_id, return_url } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Fetch the order total from Supabase
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, status')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'paid' || order.status === 'confirmed') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    // Generate Stripe Session
    const fallbackUrl = 'https://souqii-one.vercel.app';
    const checkoutUrl = await createCheckoutSession(order.id, parseFloat(order.total), return_url || fallbackUrl)

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl
    })

  } catch (err) {
    console.error("Stripe Checkout Error:", err)
    return NextResponse.json({ error: err.message || 'Payment generation failed' }, { status: 500 })
  }
}
