'use client';

import { useState, useEffect } from 'react';

export default function TrackPage() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-load last order if coming from checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromCheckout = params.get('success') === 'true';
    const urlOrderId = params.get('order_id');
    const lastOrder = localStorage.getItem('souqii_last_order');

    if (urlOrderId) {
      setOrderId(urlOrderId);
      fetchOrder(urlOrderId);
    } else if (fromCheckout && lastOrder) {
      setOrderId(lastOrder);
      fetchOrder(lastOrder);
    }
  }, []);

  const fetchOrder = async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/orders?order_id=${id}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setOrder(data);
      }
    } catch {
      setError('Failed to fetch order. Please try again.');
    }
    setLoading(false);
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'pending_payment': return '⏳';
      case 'paid': return '💳';
      case 'confirmed': return '📦';
      case 'dispatched': return '🚀';
      case 'shipped': return '🚚';
      default: return '📦';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_payment': return 'Awaiting Payment';
      case 'paid': return 'Processing';
      case 'confirmed': return 'Confirmed';
      case 'dispatched': return 'Dispatched & On the way';
      case 'shipped': return 'Delivered';
      default: return status;
    }
  };

  // Check if this is a success return from Stripe
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isSuccess = params?.get('success') === 'true';
  const isCanceled = params?.get('canceled') === 'true';

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <a href="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          ⚡ Souqii
        </a>
        <div className="navbar-links">
          <a href="/">🛒 Shop</a>
          <a href="/track" style={{ color: 'var(--accent)' }}>📍 Track Order</a>
        </div>
      </nav>

      <div className="track-container">
        {isSuccess && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#22c55e',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            🎉 Payment successful! Your order is being processed.
          </div>
        )}

        {isCanceled && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#f59e0b',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            ⚠️ Payment was canceled. You can try again or contact support.
          </div>
        )}

        <h1>📍 Track Your Order</h1>
        <p>Enter your order ID to check the current status and delivery details.</p>

        <div className="track-search">
          <input
            placeholder="Paste your Order ID (UUID format)"
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrder(orderId)}
            id="track-input"
          />
          <button onClick={() => fetchOrder(orderId)} disabled={loading} id="track-btn">
            {loading ? '...' : 'Track'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            ❌ {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Looking up your order...</p>
          </div>
        )}

        {order && (
          <div className="order-result">
            <div className="order-result-header">
              <div>
                <h2>{getStatusEmoji(order.status)} Order Details</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0' }}>
                  ID: <code style={{ color: 'var(--accent)', fontWeight: 700 }}>{order.id}</code>
                  <button onClick={() => { navigator.clipboard.writeText(order.id); alert('ID Copied!'); }}
                    style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.65rem', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--card-border)', cursor: 'pointer' }}>
                    Copy
                  </button>
                </p>
              </div>
              <span className={`status-badge status-${order.status}`} style={{
                background: order.status === 'dispatched' ? 'var(--success)' : (order.status === 'paid' ? 'var(--accent)' : 'var(--danger)'),
                color: '#fff', padding: '6px 15px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem'
              }}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="order-details">
              <div className="order-detail-row">
                <span>Channel</span>
                <span>{order.channel === 'telegram' ? '🤖 Telegram Bot' : '🌐 Website'}</span>
              </div>
              <div className="order-detail-row">
                <span>Total</span>
                <span style={{ color: '#22c55e', fontWeight: 800 }}>KD {order.total}</span>
              </div>
              <div className="order-detail-row">
                <span>Courier</span>
                <span>{order.courier || 'Pending'}</span>
              </div>
              <div className="order-detail-row">
                <span>Courier Cost</span>
                <span>KD {order.courier_cost || '—'}</span>
              </div>
              <div className="order-detail-row">
                <span>Estimated Delivery</span>
                <span>{order.estimated_delivery || 'TBD'}</span>
              </div>
              <div className="order-detail-row">
                <span>Shipping Address</span>
                <span>{order.shipping_address || '—'}</span>
              </div>
              <div className="order-detail-row">
                <span>City</span>
                <span>{order.shipping_city || '—'}</span>
              </div>
              {order.ai_courier_reason && (
                <div className="order-detail-row" style={{ borderBottom: 'none' }}>
                  <span>AI Reasoning</span>
                  <span style={{ maxWidth: '300px', textAlign: 'right', color: 'var(--accent)' }}>
                    {order.ai_courier_reason}
                  </span>
                </div>
              )}
            </div>

            {order.order_items && order.order_items.length > 0 && (
              <div className="order-items-list">
                <h3>📦 Items</h3>
                {order.order_items.map((item, i) => (
                  <div className="order-item-row" key={i}>
                    <span>{item.products?.name || `Product #${item.product_id}`} × {item.quantity}</span>
                    <span>KD {(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {order.status === 'pending_payment' && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--card-border)' }}>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const res = await fetch('/api/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: order.id, return_url: window.location.origin + '/track' })
                    });
                    const data = await res.json();
                    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
                  }}
                  id="pay-now-btn"
                >
                  💳 Pay Now — KD {order.total}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
