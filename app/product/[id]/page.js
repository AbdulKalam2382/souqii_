'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

function getCart() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('souqii_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem('souqii_cart', JSON.stringify(cart));
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    // Auth Check
    const localUser = localStorage.getItem('souqii_user');
    if (!localUser) {
      window.location.href = '/login';
      return;
    }

    setCart(getCart());

    fetch(`/api/products`)
      .then(r => r.json())
      .then(data => {
        const found = data.products?.find(p => p.id.toString() === id);
        if (found) setProduct(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    const newCart = [...cart];
    const existing = newCart.find(item => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      newCart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    setCart(newCart);
    saveCart(newCart);
    showToast(`✅ ${product.name} added to cart!`);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}><div className="spinner"></div></div>;
  }

  if (!product) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--foreground)' }}>Product not found. <a href="/" style={{ color: 'var(--accent)', marginLeft: '10px' }}>Go Back</a></div>;
  }

  const specKeys = product.specs ? Object.keys(product.specs) : [];

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <nav style={{ maxWidth: '1200px', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', color: 'var(--muted)', fontWeight: 600 }}>← Back to Shop</a>
        <div style={{ fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚡ Souqii
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '40px', background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Left Side: Image */}
        <div style={{ width: '100%', height: '500px', borderRadius: '16px', overflow: 'hidden', background: 'var(--surface-hover)' }}>
          <img 
            src={product.image_url || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800'} 
            alt={product.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Right Side: Details */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pink-accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            {product.categories?.name || 'High-End PC Component'}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: '1.2', marginBottom: '15px' }}>
            {product.name}
          </h1>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '20px' }}>
            KD {product.price}
          </div>
          
          <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginBottom: '30px' }}>
            {product.description || "Equip your build with incredible performance. Optimized for elite gaming, heavy workloads, and maximum reliability."}
          </p>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '15px', color: 'var(--foreground)' }}>Technical Specifications</h3>
            {specKeys.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {specKeys.map(key => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>{product.specs[key]}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>General component specifications apply.</p>
            )}
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={addToCart}
              disabled={product.stock === 0}
              style={{ flex: 1, padding: '16px', borderRadius: '12px', background: product.stock === 0 ? 'var(--muted)' : 'var(--accent)', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 700, cursor: product.stock === 0 ? 'not-allowed' : 'pointer', transition: '0.2s', boxShadow: product.stock === 0 ? 'none' : '0 10px 20px var(--accent-glow)' }}
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart 🛒'}
            </button>
            <div style={{ fontSize: '0.9rem', color: product.stock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {product.stock > 0 ? `✓ ${product.stock} in stock` : '✕ Sold Out'}
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} id="toast" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)', background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--foreground)', padding: '1rem 2rem', borderRadius: '50px', opacity: toast ? 1 : 0, transition: 'all 0.3s', boxShadow: '0 10px 30px var(--accent-glow)', zIndex: 1000, fontWeight: 600 }}>
        {toast}
      </div>
    </div>
  );
}
