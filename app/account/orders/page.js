'use client';

import { useState, useEffect } from 'react';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const localUser = localStorage.getItem('souqii_user');
    if (!localUser) {
      window.location.href = '/login';
      return;
    }
    const parsedUser = JSON.parse(localUser);
    setUser(parsedUser);

    fetch(`/api/orders?user_id=${parsedUser.id}`)
      .then(res => res.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load orders', err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
         <a href="/" style={{ textDecoration: 'none', color: 'var(--muted)', fontSize: '1.2rem' }}>←</a>
         <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>My Order History</h1>
      </header>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>📦</span>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>You haven't placed any orders yet.</p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>Start Shopping</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)', transition: '0.3s' }} className="order-card">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--card-border)' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>ORDER ID</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 800, color: 'var(--accent)' }}>#{order.id.substring(0, 8)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>STATUS</p>
                    <span style={{ 
                      display: 'inline-block',
                      marginTop: '4px',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800,
                      background: order.status === 'paid' ? 'var(--success)' : (order.status === 'dispatched' ? 'var(--accent)' : 'var(--warning)'),
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      {order.status}
                    </span>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '10px' }}>ITEMS</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {order.order_items.map((item, i) => (
                           <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <img src={item.products?.image_url} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt={item.products?.name} />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{item.products?.name.substring(0, 30)}...</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>Qty: {item.quantity}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL AMOUNT</p>
                     <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800 }}>KD {order.total}</p>
                     <a href={`/track?order_id=${order.id}`} style={{ display: 'inline-block', marginTop: '15px', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>Track Order →</a>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .order-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  );
}
