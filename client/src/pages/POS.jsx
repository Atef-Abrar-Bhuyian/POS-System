import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X,
  LogOut, Settings, CreditCard, Banknote, Smartphone,
  ChevronRight, History, CheckCircle, AlertCircle, Loader2, Utensils
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { createOrder } from '../api/orders';
import ReceiptModal from '../components/ReceiptModal';
import OrderHistoryModal from '../components/OrderHistoryModal';
import './POS.css';

// ─── Tax rate ─────────────────────────────────────────
const TAX_RATE = 0.05; // 5%

// ─── Toast ────────────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  return (
    <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{msg}</span>
    </div>
  );
};

// ─── Checkout Modal ───────────────────────────────────
const CheckoutModal = ({ cartItems, subtotal, tax, total, token, onClose, onSuccess }) => {
  const [payMethod, setPayMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const quickAmounts = useMemo(() => {
    const notes = [10, 20, 50, 100, 200, 500, 1000];
    const suggestions = new Set();
    
    // Always suggest the exact amount (rounded up to nearest integer/decimal)
    suggestions.add(Math.ceil(total));
    
    // Suggest next standard bills
    notes.filter(note => note >= total).slice(0, 3).forEach(note => suggestions.add(note));
    
    // Provide next round numbers (50, 100, 500, 1000) if suggestions are few
    if (suggestions.size < 4) {
      [50, 100, 500, 1000].forEach(denom => {
        const nextRounded = Math.ceil(total / denom) * denom;
        if (nextRounded > total) {
          suggestions.add(nextRounded);
        }
      });
    }
    
    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  const change = payMethod === 'cash'
    ? parseFloat((parseFloat(tendered || 0) - total).toFixed(2))
    : null;

  const canPay = payMethod !== 'cash' || (parseFloat(tendered || 0) >= total);

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const itemsPayload = cartItems.map(i => ({
        product_id: i.product.id,
        qty: i.qty,
        unit_price: parseFloat(i.product.price)
      }));

      const payload = {
        items: itemsPayload,
        payment_method: payMethod,
        total_amount: parseFloat(total.toFixed(2))
      };

      const data = await createOrder(token, payload);
      setDone(true);
      setTimeout(() => {
        onSuccess(data.order_id);
      }, 1500);
    } catch (err) {
      console.error('Payment checkout error:', err);
      const detailError = err.response?.data?.detail || err.response?.data?.error || 'Payment failed. Please try again.';
      setError(detailError);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-body">
          <div className="success-screen">
            <div className="success-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckCircle size={64} />
            </div>
            <h4>Payment Successful!</h4>
            <p>Order placed. Returning to POS...</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Checkout</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Order summary */}
          <div className="order-summary">
            {cartItems.map(i => (
              <div key={i.product.id} className="order-summary-row">
                <span>{i.product.name} × {i.qty}</span>
                <span>৳{(i.product.price * i.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ marginBottom: 20 }}>
            <div className="order-summary-row" style={{ padding: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span><span style={{ color: 'var(--text)' }}>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="order-summary-row" style={{ padding: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (5%)</span><span style={{ color: 'var(--text)' }}>৳{tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, paddingTop: 10, marginTop: 8, borderTop: '1px solid var(--border)' }}>
              <span>Total</span><span style={{ color: 'var(--gold)' }}>৳{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="pay-method-row">
            {[
              { id: 'cash', label: 'Cash', icon: <Banknote size={20} /> },
              { id: 'card', label: 'Card', icon: <CreditCard size={20} /> },
              { id: 'mobile_pay', label: 'Mobile Pay', icon: <Smartphone size={20} /> },
            ].map(m => (
              <button
                key={m.id}
                className={`pay-method-btn ${payMethod === m.id ? 'selected' : ''}`}
                onClick={() => { setPayMethod(m.id); setTendered(''); }}
              >
                <span className="pay-method-icon">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash tendered */}
          {payMethod === 'cash' && (
            <>
              <div className="cash-input-row">
                <label>Amount Tendered (৳)</label>
                <div className="cash-input-wrapper">
                  <span className="cash-input-prefix">৳</span>
                  <input
                    type="number"
                    min={total}
                    step="0.01"
                    placeholder={`Min: ৳${total.toFixed(2)}`}
                    value={tendered}
                    onChange={e => setTendered(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="quick-cash-suggestions">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className="quick-cash-btn"
                      onClick={() => setTendered(amt.toString())}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>
              {tendered && (
                <div className={`change-display ${change < 0 ? 'insufficient' : ''}`}>
                  <span>{change < 0 ? 'Insufficient amount' : 'Change Due'}</span>
                  <span>৳{Math.abs(change).toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ color: 'var(--accent)', fontSize: '0.85rem', marginTop: 12 }}>{error}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => setShowConfirm(true)} disabled={loading || !canPay}>
            {loading ? <span className="spinner" /> : <>Confirm Payment <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" style={{ zIndex: 110, background: 'rgba(0,0,0,0.85)' }} onClick={e => e.stopPropagation()}>
          <div className="modal" style={{ maxWidth: '380px', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold)', marginBottom: '16px' }}>
                <AlertCircle size={48} />
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Confirm Payment</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                Are you sure you want to process this <strong>{payMethod === 'cash' ? 'Cash' : payMethod === 'card' ? 'Card' : 'Mobile Pay'}</strong> payment of <strong>৳{total.toFixed(2)}</strong>?
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowConfirm(false);
                  handlePay();
                }}
              >
                Yes, Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── POS Main Component ───────────────────────────────
const POS = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [showHistory, setShowHistory] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 2500);
  };

  // Fetch all products (no pagination on POS - cashier needs instant access)
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await getProducts(token, { limit: 200 });
      setProducts(res.data);
    } catch {
      showToast('Failed to load products.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch {
      // Silent fail — categories are optional filter
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Client-side filter (instant, no API round-trip)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = !activeCat || p.category_id === activeCat;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCat]);

  // Cart totals
  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const cartProductIds = new Set(cartItems.map(i => i.product.id));

  const handleCheckoutSuccess = (orderId) => {
    clearCart();
    setShowCheckout(false);
    setActiveReceiptId(orderId);
    showToast('Order completed!');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || 'C';

  return (
    <div className="pos-layout">
      {/* ── Topbar ── */}
      <div className="pos-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Utensils size={18} style={{ color: 'var(--gold)' }} />
          <span className="pos-brand">POS</span>
        </div>

        <div className="pos-topbar-center">
          <div className="pos-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="pos-topbar-right">
          <button className="btn-icon" title="Order History" onClick={() => setShowHistory(true)}>
            <History size={17} />
          </button>
          {user?.role === 'admin' && (
            <button className="btn-icon" title="Admin Dashboard" onClick={() => navigate('/admin')}>
              <Settings size={17} />
            </button>
          )}
          <div className="pos-user-badge">
            <div className="pos-user-avatar">{userInitial}</div>
            <span className="pos-user-name">{user?.name || user?.email}</span>
          </div>
          {/* Mobile cart toggle button */}
          <button
            className="btn-icon cart-toggle-btn"
            title="View Cart"
            onClick={() => setShowMobileCart(true)}
          >
            <ShoppingCart size={17} />
            {itemCount > 0 && <span className="cart-toggle-badge">{itemCount}</span>}
          </button>
          <button className="btn-icon" title="Logout" onClick={handleLogout}>
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pos-body">
        {/* ── Left: Products ── */}
        <div className="pos-products-area">
          {/* Category bar */}
          <div className="category-bar">
            <button
              className={`cat-btn ${activeCat === '' ? 'active' : ''}`}
              onClick={() => setActiveCat('')}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                className={`cat-btn ${activeCat === c.id ? 'active' : ''}`}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="product-grid">
            {loadingProducts ? (
              <div className="grid-empty">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--gold)' }} />
                </div>
                <p>Loading menu...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="grid-empty">
                <div className="grid-empty-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Search size={48} />
                </div>
                <p>No products match your search.</p>
              </div>
            ) : filteredProducts.map(p => {
              const inCart = cartProductIds.has(p.id);
              const cartItem = cartItems.find(i => i.product.id === p.id);
              return (
                <div
                  key={p.id}
                  className={`product-card ${p.stock_qty === 0 ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''}`}
                  onClick={() => {
                    if (p.stock_qty === 0) return;
                    addToCart(p);
                    showToast(`${p.name} added to cart`, 'success');
                  }}
                >
                  {p.image_url
                    ? <img className="card-img" src={p.image_url} alt={p.name} />
                    : <div className="card-img-placeholder" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}><Utensils size={40} /></div>
                  }
                  <div className="card-body">
                    <div className="card-name">{p.name}</div>
                    <div className="card-price">৳{parseFloat(p.price).toFixed(2)}</div>
                    <div className={`card-stock ${p.stock_qty <= (p.low_stock_threshold ?? 10) && p.stock_qty > 0 ? 'low' : ''}`}>
                      {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} in stock`}
                    </div>
                  </div>
                  {inCart && (
                    <div className="in-cart-badge">×{cartItem.qty}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile cart overlay backdrop */}
        {showMobileCart && (
          <div className="cart-backdrop" onClick={() => setShowMobileCart(false)} />
        )}

        {/* ── Right: Cart ── */}
        <div className={`pos-cart ${showMobileCart ? 'cart-open' : ''}`}>
          <div className="cart-header">
            <h3>
              <ShoppingCart size={18} />
              Cart
              {itemCount > 0 && <span className="cart-count-badge">{itemCount}</span>}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cartItems.length > 0 && (
                <button className="clear-cart-btn" onClick={clearCart}>
                  <Trash2 size={13} /> Clear
                </button>
              )}
              {/* Close button — mobile only */}
              <button className="btn-icon cart-close-btn" onClick={() => setShowMobileCart(false)} title="Close Cart">
                <X size={16} />
              </button>
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShoppingCart size={48} />
              </div>
              <p>Cart is empty.<br />Tap a product to add it.</p>
            </div>
          ) : (
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.product.id} className="cart-item">
                  {item.product.image_url
                    ? <img className="cart-item-img" src={item.product.image_url} alt={item.product.name} />
                    : <div className="cart-item-img-placeholder"><Utensils size={18} /></div>
                  }
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product.name}</div>
                    <div className="cart-item-price">৳{parseFloat(item.product.price).toFixed(2)} each</div>
                  </div>
                  <div className="qty-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.qty - 1)}>
                      <Minus size={12} />
                    </button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.qty + 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <button className="remove-item-btn" onClick={() => removeFromCart(item.product.id)}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Totals + Checkout */}
          <div className="cart-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Tax (5%)</span>
              <span>৳{tax.toFixed(2)}</span>
            </div>
            <div className="total-row grand">
              <span>Total</span>
              <span>৳{total.toFixed(2)}</span>
            </div>
            <button
              className="checkout-btn"
              disabled={cartItems.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard size={18} />
              {cartItems.length === 0 ? 'Cart is Empty' : `Pay ৳${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      {showCheckout && (
        <CheckoutModal
          cartItems={cartItems}
          subtotal={subtotal}
          tax={tax}
          total={total}
          token={token}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {activeReceiptId && (
        <ReceiptModal
          orderId={activeReceiptId}
          token={token}
          onClose={() => setActiveReceiptId(null)}
        />
      )}

      {showHistory && (
        <OrderHistoryModal
          token={token}
          onClose={() => setShowHistory(false)}
        />
      )}

      {ReactDOM.createPortal(
        <Toast msg={toast.msg} type={toast.type} />,
        document.body
      )}
    </div>
  );
};

export default POS;
