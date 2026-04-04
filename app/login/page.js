'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/auth/signin' : '/api/auth/signup';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        // Save user session in localStorage for storefront wrapper to read
        localStorage.setItem('souqii_user', JSON.stringify({
          id: data.user?.id,
          email: data.user?.email,
          role: 'user'
        }));
        window.location.href = '/';
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleGuest = () => {
    localStorage.setItem('souqii_user', JSON.stringify({
      id: 'guest',
      email: 'Guest User',
      role: 'guest'
    }));
    window.location.href = '/';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div style={{ background: 'var(--card-bg)', padding: '3rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '450px', border: '1px solid var(--card-border)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            ⚡ Souqii
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Build Your Own PC. Advanced. Simple.</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '5px' }}>Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '5px' }}>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '10px', background: 'var(--accent)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: '0.2s', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

        <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--card-border)' }}></div>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>OR</span>
          <div style={{ height: '1px', flex: 1, background: 'var(--card-border)' }}></div>
        </div>

        <button 
          onClick={handleGuest}
          style={{ width: '100%', background: 'var(--surface-hover)', color: 'var(--foreground)', padding: '14px', borderRadius: '12px', border: '1px solid var(--card-border)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: '0.2s' }}
        >
          Continue as Guest
        </button>

      </div>
    </div>
  );
}
