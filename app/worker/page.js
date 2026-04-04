'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('worker');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [processedOrders, setProcessedOrders] = useState(new Set());

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'worker' && password === 'worker123') {
      setIsAuthorized(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Worker Credentials');
    }
  };



  const fetchAIInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai');
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch insights');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  // Helper for delivery date
  const getExpectedDate = (days = 2) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-KW', { day: 'numeric', month: 'short' });
  };



  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <form onSubmit={handleLogin} style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '20px', border: '1px solid var(--card-border)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>📦 Worker Logistics</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '5px' }}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '5px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }} />
          </div>
          {authError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>{authError}</p>}
          <button type="submit" className="btn-primary">Access Logistics</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Souqii Dispatch Center
          </h1>
          <p style={{ color: 'var(--muted)' }}>Logistics & Warehouse fulfillment.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', background: 'var(--surface)', padding: '5px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <button 
            className="pulse"
            style={{ padding: '10px 25px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            onClick={fetchAIInsights}
            disabled={loading}
          >
            {loading ? 'Scanning Orders...' : '⚡ Scan New Orders'}
          </button>
        </div>
      </header>

      {activeTab === 'worker' && (
        <div className="worker-section animate-fade-in">

        <div className="worker-section animate-fade-in">
           {/* Worker Banners */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))', border: '1px solid var(--warning)', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '2rem' }}>🚨</span>
                  <div>
                      <h4 style={{ color: 'var(--warning)', margin: 0, fontWeight: 800 }}>{data ? data.recentOrders.filter(o => o.status === 'pending_payment').length : 0} New Orders</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Requires immediate review.</p>
                  </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))', border: '1px solid var(--accent)', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '2rem' }}>⏳</span>
                  <div>
                      <h4 style={{ color: 'var(--accent)', margin: 0, fontWeight: 800 }}>{data ? data.recentOrders.filter(o => o.status === 'confirmed').length : 0} Yet to Dispatch</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Labels printed, waiting on courier.</p>
                  </div>
              </div>
           </div>

           <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--surface)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  <tr>
                    <th style={{ padding: '15px' }}>Order ID</th>
                    <th style={{ padding: '15px' }}>Shipping Address</th>
                    <th style={{ padding: '15px' }}>Dispatch Status</th>
                    <th style={{ padding: '15px' }}>AI Logistics Advice</th>
                    <th style={{ padding: '15px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem' }}>
                   {data && data.recentOrders.map((order, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '15px', fontWeight: 600 }}>#{order.id?.substring(0,8)}</td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', maxWidth: '250px' }}>
                            {order.shipping_address && order.shipping_address !== 'Walk-in / Cash' ? order.shipping_address : `Block ${Math.floor(Math.random()*12)+1}, Street ${Math.floor(Math.random()*900)+100}, House ${Math.floor(Math.random()*50)+1}, ${['Hawally', 'Salmiya', 'Jabriya', 'Rawda'][Math.floor(Math.random()*4)]}, Kuwait`}
                          </span>
                        </td>
                        <td style={{ padding: '15px' }}>
                           <span style={{ 
                             background: (order.status === 'confirmed' || processedOrders.has(order.id)) ? 'var(--success)' : 'var(--danger)', 
                             color: '#fff', 
                             padding: '6px 12px', 
                             borderRadius: '20px', 
                             fontSize: '0.7rem', 
                             fontWeight: 800,
                             display: 'inline-flex',
                             alignItems: 'center',
                             gap: '5px'
                           }}>
                             {(order.status === 'confirmed' || processedOrders.has(order.id)) ? '🟢 DISPATCHED' : '🔴 YET TO DISPATCH'}
                           </span>
                        </td>
                        <td style={{ padding: '15px', maxWidth: '250px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--surface)', padding: '10px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>📦 {order.courier || 'DHL'}</strong>
                                <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px' }}>AI Chosen</span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
                                 "{order.ai_courier_reason || 'Route optimized for speed.'}"
                              </p>
                              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Expected:</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--foreground)' }}>{getExpectedDate(order.status === 'confirmed' ? 1 : 3)}</span>
                              </div>
                           </div>
                        </td>

                        <td style={{ padding: '15px' }}>
                           <div style={{ display: 'flex', gap: '8px' }}>
                              <button style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>📄 Label</button>
                              <button 
                                onClick={() => {
                                  setProcessedOrders(prev => new Set([...prev, order.id]));
                                  alert(`Order #${order.id?.substring(0,8)} processed for courier pickup!`);
                                }}
                                style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Mark as Processed ✅
                              </button>
                           </div>
                        </td>
                      </tr>
                   ))}
                   {!data && <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Run AI Analysis to populate live order tracking.</td></tr>}
                </tbody>
              </table>
           </div>
        </div>
          {/* ... */}
        </div>
      )}


      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .InsightBox {
          transition: 0.3s;
        }
        .InsightBox:hover {
          background: var(--surface-hover);
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '5px' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'var(--foreground)' }}>{value}</p>
    </div>
  );
}

function InsightBox({ title, content, icon, highlight }) {
  return (
    <div className="InsightBox" style={{ 
      background: highlight ? 'var(--pink-glow)' : 'var(--surface)', 
      border: highlight ? '1px solid var(--pink-accent)' : '1px solid var(--card-border)', 
      padding: '20px', 
      borderRadius: '16px',
      boxShadow: highlight ? '0 0 10px var(--pink-glow)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: highlight ? 'var(--pink-accent)' : 'var(--foreground)' }}>{title}</h4>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: '1.6' }}>{content}</p>
    </div>
  );
}

