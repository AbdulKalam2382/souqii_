import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Supabase handles the actual secure password hashing and user creation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ''
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      user: data.user,
      message: 'Signup successful! You can now log in.'
    });

  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: 'Server error during signup' }, { status: 500 });
  }
}
