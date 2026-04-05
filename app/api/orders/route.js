import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { selectBestCourier } from '@/lib/courier'

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Hardening: Prevent literal "undefined" or "null" strings from crashing DB
    const sanitize = (val) => (val === "undefined" || val === "null" || val === "guest" || !val) ? null : val;

    const { 
      user_id, items, 
      door_number, street, block, area, city, pincode, 
      shipping_address, address, // Legacy address strings
      channel = 'website',
      dummy_payment = false // Demo mode support
    } = body

    if (!items || items.length === 0)
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })

    const productIds = items
      .map(i => i.product_id || i.id)
      .filter(Boolean)
      .map(id => parseInt(id))
      .filter(id => !isNaN(id))

    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, price, name, stock')
      .in('id', productIds)

    if (productError)
      return NextResponse.json({ error: productError.message }, { status: 500 })

    for (const item of items) {
      const pId = item.product_id || item.id // Compatibility with both formats
      const product = products.find(p => p.id === parseInt(pId))
      if (!product)
        return NextResponse.json({ error: `Product ${pId} not found` }, { status: 404 })
      if (product.stock < item.quantity)
        return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 })
    }

    const total = items.reduce((sum, item) => {
      const pId = item.product_id || item.id 
      const product = products.find(p => p.id === parseInt(pId))
      const price = parseFloat(product?.price || 0)
      const quantity = parseInt(item.quantity || 1)
      return sum + (price * quantity)
    }, 0)

    // Form fallback address string for legacy row OR new format
    let finalAddressString = "";
    if (channel === 'pos') {
       finalAddressString = "Point of Sale / Walk-in";
    } else if (door_number) {
       finalAddressString = `House ${door_number}, St ${street}, Blk ${block}, ${area}`;
    } else {
       finalAddressString = shipping_address || address || "Address not provided";
    }

    // AI Courier selection - even if legacy, we attempt it with the city
    const destinationCity = city || (address?.split(',').pop()?.trim()) || 'Kuwait City'
    const orderDetails = {
      destinationCity,
      orderValue: total,
      packageWeight: items.length * 1.5 
    }
    const aiCourier = await selectBestCourier(orderDetails)

    // Estimate based on the string e.g. "X days" -> integer
    const daysStr = aiCourier.estimatedDays.match(/\d+/)
    const offsetDays = daysStr ? parseInt(daysStr[0]) : 2

    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + offsetDays)
    const estimatedDelivery = deliveryDate.toISOString().split('T')[0]

    // Form fallback address string for legacy row
    const oldFormatAddress = `House ${door_number}, St ${street}, Blk ${block}, ${area}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: sanitize(user_id),
        status: (dummy_payment || channel === 'pos') ? 'paid' : 'pending_payment',
        channel,
        total: total.toFixed(2),
        shipping_address: finalAddressString,
        shipping_city: sanitize(city || destinationCity || 'POS'),
        door_number: sanitize(door_number),
        street: sanitize(street),
        block: sanitize(block),
        area: sanitize(area),
        pincode: sanitize(pincode),
        courier: channel === 'pos' ? 'In-store Pickup' : aiCourier.courier,
        courier_cost: channel === 'pos' ? 0 : (parseFloat(aiCourier.cost) || 2.50),
        estimated_delivery: channel === 'pos' ? new Date().toISOString().split('T')[0] : estimatedDelivery,
        ai_courier_reason: channel === 'pos' ? 'Direct in-store transaction.' : aiCourier.reasoning
      })
      .select()
      .single()

    if (orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })

    const orderItems = items.map(item => {
      const pId = item.product_id || item.id 
      const product = products.find(p => p.id === parseInt(pId))
      const q = parseInt(item.quantity || 1)
      return {
        order_id: order.id,
        product_id: parseInt(pId),
        quantity: q,
        unit_price: product.price
      }
    })

    await supabaseAdmin.from('order_items').insert(orderItems)

    for (const item of items) {
      const pId = item.product_id || item.id 
      const product = products.find(p => p.id === parseInt(pId))
      const q = parseInt(item.quantity || 1)
      await supabaseAdmin
        .from('products')
        .update({ stock: product.stock - q })
        .eq('id', parseInt(pId))
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      courier: aiCourier.courier,
      courier_cost: aiCourier.cost,
      estimated_delivery: estimatedDelivery,
      total: total.toFixed(2),
      message: 'Order confirmed! Notification will be sent shortly.'
    }, { status: 201 })

  } catch (err) {
    console.error("Order processing failed:", err)
    return NextResponse.json({ 
      error: 'Server error', 
      detail: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const order_id = searchParams.get('order_id')
  const user_id = searchParams.get('user_id')

  if (order_id) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, image_url, price))')
      .eq('id', order_id)
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 404 })

    return NextResponse.json(data)
  }

  if (user_id) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, image_url, price))')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'order_id or user_id required' }, { status: 400 })
}

export async function PATCH(request) {
  try {
    const { order_id, status } = await request.json()

    if (!order_id || !status)
      return NextResponse.json({ error: 'order_id and status required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', order_id)
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, order: data })

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
