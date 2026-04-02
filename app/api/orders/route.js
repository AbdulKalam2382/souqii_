import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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

    const couriers = [
      { courier: 'DHL Express', cost: 3.5, days: 1 },
      { courier: 'FedEx Priority', cost: 4.2, days: 1 },
      { courier: 'Aramex', cost: 2.8, days: 2 }
    ]
    const selected = total > 300 ? couriers[0] : couriers[2]
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + selected.days)
    const estimatedDelivery = deliveryDate.toISOString().split('T')[0]

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id,
        status: 'confirmed',
        channel,
        total: total.toFixed(2),
        shipping_address,
        shipping_city,
        courier: selected.courier,
        courier_cost: selected.cost,
        estimated_delivery: estimatedDelivery,
        ai_courier_reason: total > 300
          ? 'High value order — DHL selected for reliability'
          : 'Aramex selected — most cost efficient for this order'
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
