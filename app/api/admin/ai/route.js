import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminBriefing } from '@/lib/ai';

export async function GET(request) {
  try {
    // 1. Fetch sales stats with temporal filtering
    const { data: allOrders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('total, status, created_at');
    
    if (ordersErr) throw ordersErr;

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const dailyRevenue = allOrders
        .filter(o => (now - new Date(o.created_at)) < oneDay && (o.status === 'paid' || o.status === 'dispatched'))
        .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
    
    const weeklyRevenue = allOrders
        .filter(o => (now - new Date(o.created_at)) < oneWeek && (o.status === 'paid' || o.status === 'dispatched'))
        .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
        
    const monthlyRevenue = allOrders
        .filter(o => (now - new Date(o.created_at)) < oneMonth && (o.status === 'paid' || o.status === 'dispatched'))
        .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);

    // 2. Fetch low stock items (< 10)
    const { data: lowStock, error: stockErr } = await supabaseAdmin
      .from('products')
      .select('name, stock')
      .lt('stock', 10);
    
    if (stockErr) throw stockErr;

    // 3. Fetch recent order context (Last 10)
    const { data: recentOrders, error: recentErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, courier, ai_courier_reason, shipping_address', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentErr) throw recentErr;

    // 4. Compute aggregate stats
    const totalOrderCount = allOrders.length;
    const stats = {
        daily: dailyRevenue.toFixed(2),
        weekly: weeklyRevenue.toFixed(2),
        monthly: monthlyRevenue.toFixed(2),
        countDay: allOrders.filter(o => (now - new Date(o.created_at)) < oneDay).length,
        totalRevenue: allOrders.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0).toFixed(2)
    };

    // 5. Call AI Diagnostic
    // We summarize keys (n=name, s=stock, t=total) to stay compact
    const briefing = await getAdminBriefing({
        inventory: lowStock.map(p => ({ name: p.name, stock: p.stock })),
        recentOrders: recentOrders.map(o => ({ total: o.total, status: o.status, courier: o.courier })),
        stats: stats
    });

    return NextResponse.json({
        success: true,
        stats,
        lowStock,
        recentOrders,
        briefing
    });

  } catch (err) {
    console.error("Admin AI API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
