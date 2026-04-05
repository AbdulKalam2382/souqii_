'use client';

import { useState, useEffect, useCallback } from 'react';

// ──────────────────────────────
// HELPER: localStorage cart
// ──────────────────────────────
function getCart() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('souqii_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem('souqii_cart', JSON.stringify(cart));
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState('');
  const [addedIds, setAddedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Advanced Filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // AI Response Message
  const [aiMessage, setAiMessage] = useState('');

  // Shipping form - Kuwait 6-part format
  const [doorNumber, setDoorNumber] = useState('');
  const [street, setStreet] = useState('');
  const [block, setBlock] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // ─── Load products & Auth Check ───
  useEffect(() => {
    // Auth Check
    const localUser = localStorage.getItem('souqii_user');
    if (!localUser) {
      window.location.href = '/login';
      return;
    }
    setUser(JSON.parse(localUser));

    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        const prods = data.products || [];
        setProducts(prods);
        setFilteredProducts(prods);

        // Extract unique categories
        const cats = [];
        const seen = new Set();
        for (const p of prods) {
          if (p.categories && !seen.has(p.categories.slug)) {
            seen.add(p.categories.slug);
            cats.push(p.categories);
          }
        }
        setCategories(cats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  }, []);

  // ─── Load cart from localStorage ───
  useEffect(() => {
    setCart(getCart());
  }, []);

  // ─── Filter Logic ───
  useEffect(() => {
    let result = [...products];

    // Category
    if (activeCat !== 'all') {
      result = result.filter(p => p.categories?.slug === activeCat);
    }
    
    // Price
    if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
    
    // Stock
    if (inStockOnly) result = result.filter(p => p.stock > 0);

    setFilteredProducts(result);
  }, [activeCat, minPrice, maxPrice, inStockOnly, products]);

  const filterCategory = useCallback((slug) => {
    setActiveCat(slug);
    setSearchQuery('');
    setAiMessage('');
  }, []);

  // ─── AI Search ───
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      setActiveCat('all');
      setAiMessage('');
      return;
    }
    setSearching(true);
    setActiveCat('all');
    setAiMessage('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', payload: { query: searchQuery, conversational: true } })
      });
      const data = await res.json();
      
      // Handle conversational response format
      if (data.message && Array.isArray(data.products)) {
        setAiMessage(data.message);
        setFilteredProducts(data.products);
        showToast(`🤖 AI responded with ${data.products.length} result(s)`);
      } else if (Array.isArray(data)) {
        // Legacy format fallback
        setFilteredProducts(data);
        showToast(`🔍 AI found ${data.length} result(s)`);
      } else {
        setFilteredProducts([]);
        setAiMessage(data.message || 'No results found');
        showToast('No results found');
      }
    } catch {
      showToast('Search failed');
      setAiMessage('');
    }
    setSearching(false);
  };

  // ─── Cart operations ───
  const addToCart = (product) => {
    const newCart = [...cart];
    const existing = newCart.find(item => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      newCart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    setCart(newCart);
    saveCart(newCart);
    
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1200);
    showToast(`✅ ${product.name.split(' ').slice(0, 3).join(' ')} added!`);
  };

  const updateQty = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty + delta) };
      }
      return item;
    });
    setCart(newCart);
    saveCart(newCart);
  };

  const removeFromCart = (id) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    saveCart(newCart);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // ─── Checkout ───
  const handleCheckout = async () => {
    if (!doorNumber.trim() || !street.trim() || !block.trim() || !area.trim()) {
      showToast('⚠️ Please complete your 6-part address');
      return;
    }
    if (cart.length === 0) {
      showToast('⚠️ Cart is empty');
      return;
    }
    setCheckingOut(true);

    try {
      // Step 1: Create order with dummy_payment flag
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id === 'guest' ? null : user?.id,
          items: cart.map(item => ({ product_id: item.id, quantity: item.qty })),
          door_number: doorNumber,
          street: street,
          block: block,
          area: area,
          city: city,
          pincode: pincode,
          channel: 'website',
          dummy_payment: true // BYPASS STRIPE FOR DEMO
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        showToast('❌ ' + (orderData.error || 'Order failed'));
        setCheckingOut(false);
        return;
      }

      // Step 2: Skip Stripe and show immediate success
      setCart([]);
      saveCart([]);
      showToast('🚀 Order Successful! Redirecting to tracking...');
      
      // Save order ID so they can track it
      localStorage.setItem('souqii_last_order', orderData.order_id);
      
      setTimeout(() => {
        window.location.href = '/track?order_id=' + orderData.order_id;
      }, 1500);

    } catch (err) {
      console.error('Checkout error:', err);
      showToast('❌ Something went wrong');
      setCheckingOut(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('souqii_user');
    window.location.href = '/login';
  };

  // ─── Toast ───
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ─── Get organized specs list for a product ───
  const getOrganizedSpecs = (specs) => {
    if (!specs) return [];
    const list = [];
    if (specs.socket) list.push({ label: 'Socket', val: specs.socket });
    if (specs.cores) list.push({ label: 'Cores', val: specs.cores });
    if (specs.vram) list.push({ label: 'VRAM', val: specs.vram });
    if (specs.chipset) list.push({ label: 'Chipset', val: specs.chipset });
    if (specs.type) list.push({ label: 'Type', val: specs.type });
    if (specs.capacity) list.push({ label: 'Capacity', val: specs.capacity });
    if (specs.wattage) list.push({ label: 'Power', val: specs.wattage });
    if (specs.tdp) list.push({ label: 'TDP', val: specs.tdp });
    return list;
  };

  // ─── Image Error Handling ───
  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80'; // AI-Generated Luxury Hardware Placeholder
  };
  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <a href="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          ⚡ Souqii
        </a>
        <div className="navbar-links" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a href="/track">📍 Track Order</a>
          <button className="cart-btn" onClick={() => setCartOpen(true)} id="cart-toggle">
            🛒 Cart
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          
          {user && (
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setProfileOpen(!profileOpen)}
                style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink-accent))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} 
                title={user.email}
              >
                {user.email ? user.email.charAt(0).toUpperCase() : 'G'}
              </div>

              {profileOpen && (
                <div style={{ position: 'absolute', top: '45px', right: '0', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', width: '220px', zIndex: 500, overflow: 'hidden' }}>
                  <div style={{ padding: '15px', background: 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Signed in as</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--foreground)', wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <a href="/account/orders" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 15px', fontSize: '0.85rem', color: 'var(--foreground)', textDecoration: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <span>📦</span> Order History
                    </a>
                    <a href="/account/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 15px', fontSize: '0.85rem', color: 'var(--foreground)', textDecoration: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '2px' }}>
                      <span>👤</span> Manage Profile
                    </a>
                    <div style={{ height: '1px', background: 'var(--card-border)', margin: '8px 0' }}></div>
                    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '10px 15px', fontSize: '0.85rem', color: 'var(--danger)', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1>BUILD YOUR OWN PC</h1>
        <p>Search naturally, get smart recommendations, and build your perfect rig.</p>

        <div className="search-container">
          <input
            className="search-input"
            placeholder='Try "gaming GPU under 300 KD" or "best CPU for streaming"...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            id="ai-search-input"
          />
          <button className="search-btn" onClick={handleSearch} disabled={searching} id="ai-search-btn">
            {searching ? '...' : '🔍 AI'}
          </button>
        </div>
        
        {/* AI Response Message */}
        {aiMessage && (
          <div style={{
            maxWidth: '700px',
            margin: '1.5rem auto 0',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                🤖
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: 'var(--foreground)',
                  fontWeight: 500
                }}>
                  {aiMessage}
                </p>
              </div>
              <button 
                onClick={() => setAiMessage('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '1rem',
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </section>

      {/* MOBILE FILTER TOGGLE */}
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'flex-start', position: 'relative', zIndex: 100 }} className="mobile-filter-btn-container">
        <button 
          onClick={() => { console.log("Mobile Filter Toggle clicked!"); setSidebarOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <span style={{ fontSize: '1.2rem' }}>⧉</span> Filters & Sort
        </button>
      </div>


      <div className={`cart-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} style={{ zIndex: 299 }}></div>

      {/* MAIN AMAZON LAYOUT */}
      <div className="app-container">
        
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="sidebar-title" style={{ margin: 0 }}>Filters</h2>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }} className="sidebar-close">✕</button>
            </div>

          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '10px' }}>Category</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: activeCat === 'all' ? 'var(--foreground)' : 'var(--muted)', cursor: 'pointer', fontWeight: activeCat === 'all' ? 700 : 500 }}>
                <input type="radio" checked={activeCat === 'all'} onChange={() => filterCategory('all')} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                All Products
              </label>
              {categories.map(cat => (
                <label key={cat.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: activeCat === cat.slug ? 'var(--foreground)' : 'var(--muted)', cursor: 'pointer', fontWeight: activeCat === cat.slug ? 700 : 500 }}>
                  <input type="radio" checked={activeCat === cat.slug} onChange={() => filterCategory(cat.slug)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '10px' }}>Price Range (KD)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--surface)', fontSize: '0.85rem', outline: 'none' }} />
              <span style={{ color: 'var(--muted)' }}>-</span>
              <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--surface)', fontSize: '0.85rem', outline: 'none' }} />
            </div>
          </div>
          
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '10px' }}>Availability</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} />
              In Stock Only
            </label>
            </div>
          </div>

          {/* Sticky Apply Button */}
          <div className="sidebar-footer">
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="btn-primary" 
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', fontWeight: 800, background: 'var(--accent)', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
              >
                Apply & View Results
              </button>
          </div>
        </aside>


        {/* MAIN CONTENT AREA */}
        <main className="main-content">



      {/* PRODUCT GRID */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.length === 0 && (
            <div className="loading" style={{ gridColumn: '1 / -1' }}>
              <p>No products found. Try a different search!</p>
            </div>
          )}
          {filteredProducts.map(product => (
            <div className="product-card" key={product.id} id={`product-${product.id}`}>
              <a href={`/product/${product.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <img
                  className="product-card-img"
                  src={product.image_url || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400'}
                  alt={product.name}
                  loading="lazy"
                  onError={handleImageError}
                />
                <div className="product-card-body">
                  <div className="product-category" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pink-accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                    {product.categories?.name || 'PC Part'}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>{product.name}</h3>
                  <div className="product-specs" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {getOrganizedSpecs(product.specs).slice(0, 3).map((s, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', background: 'var(--surface-hover)', color: 'var(--muted)', padding: '2px 8px', borderRadius: '10px' }}>
                        {s.val}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
              <div className="product-card-footer" style={{ padding: '0 1.25rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="product-price">
                    KD {product.price} <span>/ unit</span>
                  </div>
                </div>
                <button
                  className={`btn-add-cart ${addedIds.has(product.id) ? 'added' : ''}`}
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  id={`add-to-cart-${product.id}`}
                >
                  {addedIds.has(product.id) ? '✓ Added' : '+ Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </main>
      </div>

      {/* CART OVERLAY */}
      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)}></div>

      {/* CART DRAWER */}
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>🛒 Your Cart ({cartCount})</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}>×</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <p>🛒</p>
              <span>Your cart is empty</span>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-info">
                  <h4>{item.name.length > 35 ? item.name.substring(0, 35) + '...' : item.name}</h4>
                  <p>KD {(item.price * item.qty).toFixed(2)}</p>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQty(item.id, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <button className="btn-danger" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            {/* SHIPPING FORM - KUWAIT FORMAT */}
            <div className="shipping-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Door / House Number</label>
                <input
                  placeholder="e.g., House 22"
                  value={doorNumber}
                  onChange={e => setDoorNumber(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Street Name / Number</label>
                <input
                  placeholder="e.g., Street 10"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Block</label>
                <input
                  placeholder="e.g., Block 5"
                  value={block}
                  onChange={e => setBlock(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Area</label>
                <input
                  placeholder="e.g., Salmiya"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City / Governorate</label>
                <input
                  placeholder="e.g., Hawalli"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Pincode (Optional)</label>
                <input
                  placeholder="e.g., 20001"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                />
              </div>
            </div>

            {/* CART FOOTER */}
            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <span>KD {cartTotal.toFixed(2)}</span>
              </div>
              <button
                className="btn-primary pulse"
                onClick={handleCheckout}
                disabled={checkingOut}
                id="checkout-btn"
              >
                {checkingOut ? '⏳ Processing...' : '💳 Proceed to Payment'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* TOAST */}
      <div className={`toast ${toast ? 'show' : ''}`} id="toast">
        {toast}
      </div>
    </>
  );
}
