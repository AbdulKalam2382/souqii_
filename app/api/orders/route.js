import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { selectBestCourier } from '@/lib/courier'

export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, items, shipping_address, shipping_city, channel = 'website' } = body

    if (!items || items.length === 0)
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })

    const productIds = items.map(i => i.product_id)
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, price, name, stock')
      .in('id', productIds)

    if (productError)
      return NextResponse.json({ error: productError.message }, { status: 500 })

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      if (!product)
        return NextResponse.json({ error: `Product ${item.product_id} not found` }, { status: 404 })
      if (product.stock < item.quantity)
        return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 })
    }

    const total = items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id)
      return sum + (product.price * item.quantity)
    }, 0)

    // Call the exact same AI Courier logic as the Telegram Bot!
    const orderDetails = {
      destinationCity: shipping_city || 'Kuwait City',
      orderValue: total,
      packageWeight: items.length * 1.5 // Rough estimation for weight
    }
    const aiCourier = await selectBestCourier(orderDetails)

    // Estimate based on the string e.g. "X days" -> integer
    const daysStr = aiCourier.estimatedDays.match(/\d+/)
    const offsetDays = daysStr ? parseInt(daysStr[0]) : 2

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + offsetDays)
    const estimatedDelivery = deliveryDate.toISOString().split('T')[0]

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id,
        status: 'pending_payment',
        channel,
        total: total.toFixed(2),
        shipping_address,
        shipping_city,
        courier: aiCourier.courier,
        courier_cost: parseFloat(aiCourier.cost) || 2.50,
        estimated_delivery: estimatedDelivery,
        ai_courier_reason: aiCourier.reasoning
      })
      .select()
      .single()

    if (orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })

    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.product_id)
      return {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price
      }
    })

    await supabaseAdmin.from('order_items').insert(orderItems)

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      await supabaseAdmin
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('id', item.product_id)
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      courier: selected.courier,
      courier_cost: selected.cost,
      estimated_delivery: estimatedDelivery,
      total: total.toFixed(2),
      message: 'Order confirmed! Notification will be sent shortly.'
    }, { status: 201 })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const order_id = searchParams.get('order_id')

  if (!order_id)
    return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, image_url, price))')
    .eq('id', order_id)
    .single()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json(data)
}
