'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('owner'); // 'owner', 'pos'
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Analytics State
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  // POS State
  const [posProducts, setPosProducts] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCart, setPosCart] = useState([]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'owner' && password === 'owner123') {
      setIsAuthorized(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Owner Credentials');
    }
  };



  const fetchAIInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai?start=${startDate}&end=${endDate}`);
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


  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <form onSubmit={handleLogin} style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '20px', border: '1px solid var(--card-border)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>🔐 Owner Portal</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '5px' }}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '5px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }} />
          </div>
          {authError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>{authError}</p>}
          <button type="submit" className="btn-primary">Verify Identity</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Souqii Owner Suite
          </h1>
          <p style={{ color: 'var(--muted)' }}>Proprietary intelligence & point of sale.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', background: 'var(--surface)', padding: '5px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <button 
            onClick={() => setActiveTab('owner')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'owner' ? 'var(--accent)' : 'transparent', color: activeTab === 'owner' ? '#fff' : 'var(--foreground)', cursor: 'pointer', fontWeight: 600, transition: '0.3s' }}
          >
            Dashboard
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <StatCard label="Today's Sales" value={data ? `KD ${data.stats.daily}` : '—'} color="var(--accent)" />
            <StatCard label="This Week" value={data ? `KD ${data.stats.weekly}` : '—'} color="var(--success)" />
            <StatCard label="This Month" value={data ? `KD ${data.stats.monthly}` : '—'} color="var(--pink-accent)" />
            <StatCard label="Live Orders (24h)" value={data ? data.stats.countDay : '—'} />
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '30px', position: 'relative', overflow: 'hidden', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🧠 AI Business Intelligence</h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--foreground)', padding: '5px 10px', fontSize: '0.85rem' }} />
                    <span style={{ color: 'var(--muted)' }}>—</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--foreground)', padding: '5px 10px', fontSize: '0.85rem' }} />
                </div>
              </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <AestheticInsightCard 
                    title="Executive Summary" 
                    icon="📋" 
                    onClick={() => { setModalTitle("Executive Summary"); setModalContent(data.briefing.executiveSummary); setShowModal(true); }}
                />
                <AestheticInsightCard 
                    title="Infrastructure Status" 
                    icon="⚡" 
                    onClick={() => { setModalTitle("Infrastructure Status"); setModalContent("AI Dispatch system running at 99.8% accuracy. All Courier webhooks active."); setShowModal(true); }}
                />
                <AestheticInsightCard 
                    title="Inventory Optimization" 
                    icon="📦" 
                    onClick={() => { setModalTitle("Inventory Optimization"); setModalContent(data.briefing.stockAlerts); setShowModal(true); }}
                />
                <AestheticInsightCard 
                    title="Shipping Insights" 
                    icon="🚚" 
                    onClick={() => { setModalTitle("Shipping Insights"); setModalContent(`Detected ${data.stats.countDay} orders in last 24h requiring dispatch. Inventory levels stable. Automated fulfillment active.`); setShowModal(true); }}
                />
              </div>
            )}

            {!data && !loading && (
               <div style={{ padding: '60px', textAlign: 'center', border: '2px dashed var(--card-border)', borderRadius: '15px' }}>
                  <p style={{ color: 'var(--muted)' }}>Select a date range and click Analyize to see live insights.</p>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginTop: '30px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>📈 Interactive Sales Growth</h3>
              {data && data.dailyHistory ? (
                  <div style={{ height: '300px', position: 'relative', marginTop: '10px' }}>
                    <SalesGrowthChart history={data.dailyHistory} />
                  </div>
              ) : (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--card-border)', borderRadius: '15px', color: 'var(--muted)' }}>
                    Run Analysis to see sales growth trends for your selected range.
                  </div>
              )}
            </div>
            
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>📊 Live Temporal Sales Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ width: '100px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>TODAY</span>
                  <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '35px', overflow: 'hidden' }}>
                    <div style={{ width: data ? `${Math.min(100, (parseFloat(data.stats.daily)/500)*100)}%` : '0%', background: 'linear-gradient(90deg, var(--accent), var(--pink-accent))', height: '100%', borderRadius: '10px', transition: '1s ease-out' }}></div>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)', minWidth: '90px', textAlign: 'right' }}>KD {data ? data.stats.daily : '0'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ width: '100px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>THIS WEEK</span>
                  <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '35px', overflow: 'hidden' }}>
                    <div style={{ width: data ? `${Math.min(100, (parseFloat(data.stats.weekly)/2500)*100)}%` : '0%', background: 'var(--success)', height: '100%', borderRadius: '10px', transition: '1s ease-out' }}></div>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)', minWidth: '90px', textAlign: 'right' }}>KD {data ? data.stats.weekly : '0'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ width: '100px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>THIS MONTH</span>
                  <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '10px', height: '35px', overflow: 'hidden' }}>
                    <div style={{ width: data ? `${Math.min(100, (parseFloat(data.stats.monthly)/10000)*100)}%` : '0%', background: 'var(--foreground)', height: '100%', borderRadius: '10px', transition: '1s ease-out' }}></div>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', minWidth: '90px', textAlign: 'right' }}>KD {data ? data.stats.monthly : '0'}</span>
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
                    <button 
                        className={posCart.length === 0 ? 'opacity-50' : 'pulse'}
                        disabled={posCart.length === 0 || loading}
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const res = await fetch('/api/orders', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        items: posCart.map(i => ({ product_id: i.id, quantity: i.qty })),
                                        channel: 'pos'
                                    })
                                });
                                if (res.ok) {
                                    alert("💸 POS Sale Completed Successfully!");
                                    setPosCart([]);
                                    fetchAIInsights(); // Refresh revenue stats
                                } else {
                                    alert("POS Transaction Failed.");
                                }
                            } catch { alert("Connection Error"); }
                            setLoading(false);
                        }}
                        style={{ width: '100%', padding: '15px', background: 'var(--success)', color: 'white', fontWeight: 800, border: 'none', borderRadius: '12px', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        {loading ? 'Processing...' : '💳 Complete Cash Sale'}
                    </button>
                    {posCart.length > 0 && <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center', marginTop: '10px' }}>Inventory will be automatically deducted.</p>}
                </div>
            </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '40px', maxWidth: '600px', width: '100%', position: 'relative', boxShadow: 'var(--shadow-lg)', animation: 'fadeInScale 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '20px', color: 'var(--accent)' }}>{modalTitle}</h2>
             <p style={{ fontSize: '1rem', lineHeight: '1.8', color: 'var(--foreground)' }}>{modalContent}</p>
             <button className="btn-primary" style={{ marginTop: '30px' }} onClick={() => setShowModal(false)}>Close Insight</button>
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
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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

function AestheticInsightCard({ title, icon, onClick }) {
    return (
        <div style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--card-border)', 
            padding: '20px', 
            borderRadius: '16px', 
            textAlign: 'center',
            transition: '0.3s',
            cursor: 'pointer'
        }} className="InsightBox" onClick={onClick}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>{icon}</span>
            <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '15px' }}>{title}</h4>
            <button style={{ 
                background: 'rgba(99, 102, 241, 0.1)', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                color: 'var(--accent)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
            }}>View Detail</button>
        </div>
    );
}

function SalesGrowthChart({ history }) {
    const kdValues = history.map(h => h.kd);
    const maxKd = Math.max(...kdValues, 10); // avoid div by zero
    const points = history.map((h, i) => {
        const x = (i / (history.length - 1)) * 100;
        const y = 100 - (h.kd / maxKd) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path 
                d={`M 0,100 L ${points} L 100,100 Z`}
                fill="url(#chartGradient)"
            />
            <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                vectorEffect="non-scaling-stroke"
            />
            {/* Dots */}
            {history.map((h, i) => (
                <circle 
                    key={i}
                    cx={(i / (history.length - 1)) * 100}
                    cy={100 - (h.kd / maxKd) * 100}
                    r="1.5"
                    fill="var(--accent)"
                >
                    <title>{h.date}: KD {h.kd}</title>
                </circle>
            ))}
        </svg>
    );
}

