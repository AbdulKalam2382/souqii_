import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET — Fetch user profile + cart + order history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id)
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    // 1. Get user profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle()

    if (profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })

    // 2. Get user's cart items
    const { data: cart, error: cartErr } = await supabaseAdmin
      .from('user_cart')
      .select('*, products(id, name, price, image_url, specs)')
      .eq('user_id', user_id)

    if (cartErr)
      return NextResponse.json({ error: cartErr.message }, { status: 500 })

    // 3. Get order history (non-draft orders)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, price, image_url))')
      .eq('user_id', user_id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (ordersErr)
      return NextResponse.json({ error: ordersErr.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      profile: profile || { user_id, name: '', email: '', phone: '', address: {} },
      cart: cart || [],
      orderHistory: orders || []
    })

  } catch (err) {
    console.error('UserDetails GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST — Create or update user profile
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, name, email, phone, address } = body

    if (!user_id)
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    // Upsert: create if not exists, update if exists
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id,
        name: name || '',
        email: email || '',
        phone: phone || '',
        address: address || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, profile: data })

  } catch (err) {
    console.error('UserDetails POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT — Add/update cart items
export async function PUT(request) {
  try {
    const body = await request.json()
    const { user_id, product_id, quantity } = body

    if (!user_id || !product_id)
      return NextResponse.json({ error: 'user_id and product_id are required' }, { status: 400 })

    if (quantity <= 0) {
      // Remove from cart
      await supabaseAdmin
        .from('user_cart')
        .delete()
        .eq('user_id', user_id)
        .eq('product_id', product_id)

      return NextResponse.json({ success: true, message: 'Item removed from cart' })
    }

    // Upsert cart item
    const { data, error } = await supabaseAdmin
      .from('user_cart')
      .upsert({
        user_id,
        product_id,
        quantity,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,product_id' })
      .select('*, products(id, name, price)')
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, cartItem: data })

  } catch (err) {
    console.error('UserDetails PUT error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE — Clear entire cart
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id)
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('user_cart')
      .delete()
      .eq('user_id', user_id)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Cart cleared' })

  } catch (err) {
    console.error('UserDetails DELETE error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
