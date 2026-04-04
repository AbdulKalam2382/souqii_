'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('owner'); // 'owner', 'worker', 'pos'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // POS State
  const [posProducts, setPosProducts] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCart, setPosCart] = useState([]);


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

  // Initial load of basic stats (can be non-AI if we wanted, but we'll use the same endpoint)
  useEffect(() => {
    // We don't auto-fetch AI to save tokens, but we could fetch raw stats here
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setPosProducts(d.products || []))
      .catch(e => console.error("Could not fetch catalog for POS."));
  }, []);

  const addToPosCart = (product) => {
    const existing = posCart.find(i => i.id === product.id);
    if (existing) {
      setPosCart(posCart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setPosCart([...posCart, { ...product, qty: 1 }]);
    }
  };
  const removeFromPosCart = (id) => {
      setPosCart(posCart.filter(i => i.id !== id));
  };
  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);


  return (
    <div className="admin-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Souqii Command Center
          </h1>
          <p style={{ color: 'var(--muted)' }}>Manage your empire with AI-driven precision.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', background: 'var(--surface)', padding: '5px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <button 
            onClick={() => setActiveTab('owner')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'owner' ? 'var(--accent)' : 'transparent', color: activeTab === 'owner' ? '#fff' : 'var(--foreground)', cursor: 'pointer', fontWeight: 600, transition: '0.3s' }}
          >
            Owner View
          </button>
          <button 
            onClick={() => setActiveTab('worker')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'worker' ? 'var(--accent)' : 'transparent', color: activeTab === 'worker' ? '#fff' : 'var(--foreground)', cursor: 'pointer', fontWeight: 600, transition: '0.3s' }}
          >
            Worker View
          </button>
          <button 
            onClick={() => setActiveTab('pos')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'pos' ? 'var(--accent)' : 'var(--surface-hover)', color: activeTab === 'pos' ? '#fff' : 'var(--success)', cursor: 'pointer', fontWeight: 800, transition: '0.3s', border: '1px solid var(--success)' }}
          >
            💳 POS
          </button>
        </div>
      </header>

      {activeTab === 'owner' ? (
        <div className="owner-section animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <StatCard label="Total Revenue" value={data ? `KD ${data.stats.revenue}` : '—'} color="var(--success)" />
            <StatCard label="Total Orders" value={data ? data.stats.count : '—'} />
            <StatCard label="Health Score" value={data ? data.stats.health : '—'} color="var(--accent)" />
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '30px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🧠 AI Business Intelligence</h2>
              <button 
                className={`btn-primary pulse ${loading ? 'opacity-50' : ''}`} 
                style={{ width: 'auto', padding: '10px 25px' }} 
                onClick={fetchAIInsights}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : '⚡ Run AI Analysis'}
              </button>
            </div>

            {loading && (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--muted)', marginTop: '10px' }}>Groq is scanning your database for growth opportunities...</p>
                </div>
            )}

            {error && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

            {data && data.briefing && !loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <InsightBox title="Executive Summary" content={data.briefing.executiveSummary} icon="📋" />
                <InsightBox title="Stock Strategy" content={data.briefing.stockAlerts} icon="📦" />
                <InsightBox title="Logistics Optimization" content={data.briefing.logisticsOptimization} icon="🚚" />
                <InsightBox title="Growth Opportunity" content={data.briefing.growthOpportunity} icon="🚀" highlight />
              </div>
            )}

            {!data && !loading && (
               <div style={{ padding: '60px', textAlign: 'center', border: '2px dashed var(--card-border)', borderRadius: '15px' }}>
                  <p style={{ color: 'var(--muted)' }}>Click the button above to generate your strategic briefing.</p>
               </div>
            )}
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--warning)' }}>⚠️ Critical Stock Alerts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {data && data.lowStock.map((item, i) => (
                    <div key={i} style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--warning)', padding: '15px', borderRadius: '12px' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{item.name}</p>
                        <p style={{ color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>Only {item.stock} left!</p>
                    </div>
                ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
            {/* Sales Development Chart */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>📈 Weekly Revenue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '40px', fontSize: '0.85rem', color: 'var(--muted)' }}>Mon</span><div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '24px' }}><div style={{ width: '40%', background: 'var(--success)', height: '100%', borderRadius: '10px' }}></div></div><span style={{ fontSize: '0.85rem', fontWeight: 700 }}>KD 450</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '40px', fontSize: '0.85rem', color: 'var(--muted)' }}>Tue</span><div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '24px' }}><div style={{ width: '65%', background: 'var(--success)', height: '100%', borderRadius: '10px' }}></div></div><span style={{ fontSize: '0.85rem', fontWeight: 700 }}>KD 820</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '40px', fontSize: '0.85rem', color: 'var(--muted)' }}>Wed</span><div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '24px' }}><div style={{ width: '30%', background: 'var(--success)', height: '100%', borderRadius: '10px' }}></div></div><span style={{ fontSize: '0.85rem', fontWeight: 700 }}>KD 310</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '40px', fontSize: '0.85rem', color: 'var(--muted)' }}>Thu</span><div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '24px' }}><div style={{ width: '90%', background: 'linear-gradient(90deg, var(--success), var(--accent))', height: '100%', borderRadius: '10px' }}></div></div><span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>KD 1,450</span></div>
              </div>
            </div>

            {/* Business Development Ideas */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>💡 Business Development</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '5px' }}>B2B Gaming Cafe Partnerships</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: '1.4' }}>Offer a 10% discount on bulk motherboard & RAM orders to local Kuwaiti eSports cafes to secure recurring revenue.</p>
                </div>
                <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid var(--pink-accent)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '5px' }}>PC Assembly Upsell</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: '1.4' }}>Customers often buy individual parts. Add a "Professional Assembly Service" at checkout for KD 25 margin.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'worker' ? (
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
                    <th style={{ padding: '15px' }}>AI Courier Mode</th>
                    <th style={{ padding: '15px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem' }}>
                   {data && data.recentOrders.map((order, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '15px', fontWeight: 600 }}>#{order.id?.substring(0,8)}</td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', maxWidth: '250px' }}>
                            {order.shipping_address || 'Walk-in / Cash'}
                          </span>
                        </td>
                        <td style={{ padding: '15px', maxWidth: '250px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ color: 'var(--accent)' }}>{order.courier || 'TBD'}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
                                 {order.ai_courier_reason || 'Optimization bypass enabled.'}
                              </span>
                           </div>
                        </td>
                        <td style={{ padding: '15px' }}>
                           <div style={{ display: 'flex', gap: '8px' }}>
                              <button style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>📄 Label</button>
                              <button style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Ship 📦</button>
                           </div>
                        </td>
                      </tr>
                   ))}
                   {!data && <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Run AI Analysis to populate live order tracking.</td></tr>}
                </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div className="pos-section animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 350px', gap: '20px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '20px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                <input 
                    type="text" 
                    placeholder="🔍 Scan barcode or search items..." 
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--surface)', marginBottom: '20px', outline: 'none', fontSize: '1rem', color: 'var(--foreground)' }}
                />
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '15px', alignContent: 'start' }}>
                    {posProducts.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                        <div key={p.id} onClick={() => addToPosCart(p)} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '10px', cursor: 'pointer', transition: '0.2s', textAlign: 'center' }}>
                            <img src={p.image_url} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
                            <p style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.85rem', marginTop: '5px' }}>KD {p.price}</p>
                        </div>
                    ))}
                    {posProducts.length === 0 && <p style={{ color: 'var(--muted)' }}>Loading products...</p>}
                </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', height: '600px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>🛒 Current Sale</h2>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {posCart.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{item.name.substring(0, 20)}...</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>KD {item.price} x {item.qty}</p>
                            </div>
                            <button onClick={() => removeFromPosCart(item.id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                        </div>
                    ))}
                    {posCart.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '50px' }}>Scan items to begin sale.</p>}
                </div>
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '20px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginBottom: '15px' }}>
                        <span>Total:</span>
                        <span style={{ color: 'var(--success)' }}>KD {posTotal.toFixed(2)}</span>
                    </div>
                    <button style={{ width: '100%', padding: '15px', background: 'var(--accent)', color: 'white', fontWeight: 800, border: 'none', borderRadius: '12px', fontSize: '1rem', cursor: 'pointer' }}>
                        💵 Complete Cash Sale
                    </button>
                </div>
            </div>
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

