import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: data.user,
      session: data.session 
    });

  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json({ error: 'Server error during signin' }, { status: 500 });
  }
}
