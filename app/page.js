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

  // Shipping form - Kuwait 6-part format
  const [doorNumber, setDoorNumber] = useState('');
  const [street, setStreet] = useState('');
  const [block, setBlock] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // ─── Load products ───
  useEffect(() => {
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

  // ─── Filter by category ───
  const filterCategory = useCallback((slug) => {
    setActiveCat(slug);
    setSearchQuery('');
    if (slug === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.categories?.slug === slug));
    }
  }, [products]);

  // ─── AI Search ───
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      setActiveCat('all');
      return;
    }
    setSearching(true);
    setActiveCat('all');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', payload: { query: searchQuery } })
      });
      const results = await res.json();
      if (Array.isArray(results)) {
        setFilteredProducts(results);
        showToast(`🔍 AI found ${results.length} result(s)`);
      } else {
        setFilteredProducts([]);
        showToast('No results found');
      }
    } catch {
      showToast('Search failed');
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
    if (!shippingAddress.trim()) {
      showToast('⚠️ Please enter your shipping address');
      return;
    }
    if (cart.length === 0) {
      showToast('⚠️ Cart is empty');
      return;
    }
    setCheckingOut(true);

    try {
      // Step 1: Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({ product_id: item.id, quantity: item.qty })),
          door_number: doorNumber,
          street: street,
          block: block,
          area: area,
          city: city,
          pincode: pincode,
          channel: 'website'
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        showToast('❌ ' + (orderData.error || 'Order failed'));
        setCheckingOut(false);
        return;
      }

      // Step 2: Get Stripe checkout URL
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          return_url: window.location.origin + '/track'
        })
      });
      const checkoutData = await checkoutRes.json();

      if (!checkoutData.success) {
        showToast('❌ Payment setup failed');
        setCheckingOut(false);
        return;
      }

      // Step 3: Clear cart and redirect to Stripe
      setCart([]);
      saveCart([]);
      showToast('🚀 Redirecting to secure payment...');
      
      // Save order ID so they can track it
      localStorage.setItem('souqii_last_order', orderData.order_id);
      
      setTimeout(() => {
        window.location.href = checkoutData.checkoutUrl;
      }, 800);

    } catch (err) {
      console.error('Checkout error:', err);
      showToast('❌ Something went wrong');
      setCheckingOut(false);
    }
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

  // ─── RENDER ───
  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <a href="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          ⚡ Souqii
        </a>
        <div className="navbar-links">
          <a href="/track">📍 Track Order</a>
          <button className="cart-btn" onClick={() => setCartOpen(true)} id="cart-toggle">
            🛒 Cart
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1>AI-Powered PC Parts</h1>
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
      </section>

      {/* CATEGORY FILTERS */}
      <div className="category-filters">
        <button
          className={`cat-btn ${activeCat === 'all' ? 'active' : ''}`}
          onClick={() => filterCategory('all')}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.slug}
            className={`cat-btn ${activeCat === cat.slug ? 'active' : ''}`}
            onClick={() => filterCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

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
              <img
                className="product-card-img"
                src={product.image_url || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400'}
                alt={product.name}
                loading="lazy"
              />
              <div className="product-card-body">
                <div className="product-category">
                  {product.categories?.name || 'PC Part'}
                </div>
                <h3>{product.name}</h3>
                <div className="product-specs" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {getOrganizedSpecs(product.specs).map((s, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text)' }}>{s.label}:</strong> {s.val}
                    </div>
                  ))}
                </div>
              </div>
              <div className="product-card-footer">
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
