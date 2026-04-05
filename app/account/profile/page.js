'use client';

import { useState, useEffect } from 'react';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localUser = localStorage.getItem('souqii_user');
    if (!localUser) {
      window.location.href = '/login';
      return;
    }
    setUser(JSON.parse(localUser));
    setLoading(false);
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
         <a href="/" style={{ textDecoration: 'none', color: 'var(--muted)', fontSize: '1.2rem' }}>←</a>
         <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Manage Profile</h1>
      </header>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '40px', boxShadow: 'var(--shadow-md)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800 }}>
               {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{user.email.split('@')[0]}</h2>
               <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>{user.role} account</p>
            </div>
         </div>

         <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ padding: '15px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
               <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>EMAIL ADDRESS</label>
               <input type="text" readOnly value={user.email} style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)', outline: 'none' }} />
            </div>
            
            <div style={{ padding: '15px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
               <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '5px' }}>ACCOUNT TYPE</label>
               <input type="text" readOnly value={user.role === 'guest' ? 'Temporary Guest Account' : 'Standard Souqii User'} style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)', outline: 'none' }} />
            </div>
         </div>

         <div style={{ marginTop: '40px', borderTop: '1px solid var(--card-border)', paddingTop: '30px', display: 'flex', gap: '15px' }}>
            <button className="btn-primary" style={{ padding: '12px 24px', opacity: 0.5, cursor: 'not-allowed' }} title="Updates coming soon!">Update Details</button>
            <button 
                onClick={() => {
                   localStorage.removeItem('souqii_user');
                   window.location.href = '/login';
                }}
                className="btn-danger" 
                style={{ padding: '12px 24px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}
            >
                Sign Out
            </button>
         </div>
      </div>
    </div>
  );
}
