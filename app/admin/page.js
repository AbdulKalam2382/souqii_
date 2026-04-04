'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('owner'); // 'owner' or 'worker'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  }, []);

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
        </div>
      ) : (
        <div className="worker-section animate-fade-in">
           <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--surface)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  <tr>
                    <th style={{ padding: '15px' }}>Order ID</th>
                    <th style={{ padding: '15px' }}>Destination</th>
                    <th style={{ padding: '15px' }}>Status</th>
                    <th style={{ padding: '15px' }}>Courier Selection & Reasoning</th>
                    <th style={{ padding: '15px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem' }}>
                   {data && data.recentOrders.map((order, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '15px', fontWeight: 600 }}>#{order.id?.substring(0,8)}</td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                            {order.shipping_address ? order.shipping_address.substring(0, 25) + '...' : 'Address missing'}
                          </span>
                        </td>
                        <td style={{ padding: '15px' }}>
                           <span style={{ background: order.status === 'confirmed' ? 'var(--success)' : 'var(--warning)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                             {order.status}
                           </span>
                        </td>
                        <td style={{ padding: '15px', maxWidth: '300px' }}>
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
                   {!data && <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Run AI Analysis to populate live order tracking.</td></tr>}
                </tbody>
              </table>
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

