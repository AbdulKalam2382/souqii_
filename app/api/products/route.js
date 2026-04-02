import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const id = searchParams.get('id')

  try {
    let query = supabase
      .from('products')
      .select('*, categories(name, slug)')

    if (id) {
      const { data, error } = await query.eq('id', id).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json(data)
    }

    if (category) {
      query = query.eq('categories.slug', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`)
    }

    const { data, error } = await query.order('id', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ products: data, count: data.length })

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
