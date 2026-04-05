import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminBriefing } from '@/lib/ai';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  try {
    // 1. Fetch ALL orders to aggregate
    const { data: allOrders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('total, status, created_at');
    
    if (ordersErr) throw ordersErr;

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // Filter by requested range or default to last 30 days
    const rangeEnd = endParam ? new Date(endParam) : new Date();
    const rangeStart = startParam ? new Date(startParam) : new Date(now.getTime() - (30 * oneDay));

    const dailyRevenueTotal = allOrders
        .filter(o => (now - new Date(o.created_at)) < oneDay && (o.status === 'paid' || o.status === 'dispatched'))
        .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
    
    // Calculate History for Graphing
    const dailyHistory = [];
    let current = new Date(rangeStart);
    while (current <= rangeEnd) {
        const dateStr = current.toISOString().split('T')[0];
        const dayTotal = allOrders
            .filter(o => o.created_at.startsWith(dateStr) && (o.status === 'paid' || o.status === 'dispatched'))
            .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
        
        dailyHistory.push({ date: dateStr, kd: dayTotal });
        current.setDate(current.getDate() + 1);
    }

    // 2. Fetch low stock
    const { data: lowStock, error: stockErr } = await supabaseAdmin
      .from('products')
      .select('name, stock')
      .lt('stock', 10);
    
    if (stockErr) throw stockErr;

    // 3. Fetch recent order context
    const { data: recentOrders, error: recentErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, courier, ai_courier_reason, shipping_address, channel', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentErr) throw recentErr;

    // 4. Compute aggregate stats
    const stats = {
        daily: dailyRevenueTotal.toFixed(2),
        weekly: allOrders
            .filter(o => (now - new Date(o.created_at)) < (7 * oneDay) && (o.status === 'paid' || o.status === 'dispatched'))
            .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0).toFixed(2),
        monthly: allOrders
            .filter(o => (now - new Date(o.created_at)) < (30 * oneDay) && (o.status === 'paid' || o.status === 'dispatched'))
            .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0).toFixed(2),
        countDay: allOrders.filter(o => (now - new Date(o.created_at)) < oneDay).length,
    };

    // 5. AI Diagnostic
    const briefing = await getAdminBriefing({
        inventory: lowStock.map(p => ({ n: p.name, s: p.stock })),
        recentOrders: recentOrders.map(o => ({ t: o.total, s: o.status })),
        stats: stats
    });

    return NextResponse.json({
        success: true,
        stats,
        lowStock,
        recentOrders,
        briefing,
        dailyHistory
    });

  } catch (err) {
    console.error("Admin AI API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
