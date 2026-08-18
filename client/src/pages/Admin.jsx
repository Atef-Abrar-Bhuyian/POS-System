import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Package, Tag, Search, Plus, Edit2, Trash2,
  X, ChevronLeft, ChevronRight, LogOut, LayoutDashboard,
  DollarSign, TrendingUp, ShoppingBag, CheckCircle, AlertCircle, AlertTriangle, Flame, Utensils, Menu
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts, getLowStockProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { getCategories, createCategory, deleteCategory } from '../api/categories';
import { getSalesSummary, getTopProducts } from '../api/reports';
import './Admin.css';

// ─── Toast helper ────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  return (
    <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{msg}</span>
    </div>
  );
};

// ─── Product Modal ────────────────────────────────────
const EMPTY_FORM = { name: '', sku: '', category_id: '', price: '', stock_qty: '', low_stock_threshold: '10', image_url: '' };

const ProductModal = ({ product, categories, token, onClose, onSaved }) => {
  const [form, setForm] = useState(product
    ? {
      name: product.name, sku: product.sku, category_id: product.category_id || '',
      price: product.price, stock_qty: product.stock_qty, low_stock_threshold: product.low_stock_threshold !== undefined ? product.low_stock_threshold : '10', image_url: product.image_url || ''
    }
    : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!product;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.sku || !form.price) {
      setError('Name, SKU and price are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category_id: form.category_id || null,
        price: parseFloat(form.price),
        stock_qty: parseInt(form.stock_qty) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) !== undefined ? parseInt(form.low_stock_threshold) : 10,
        image_url: form.image_url.trim() || null,
      };
      if (isEdit) {
        await updateProduct(token, product.id, payload);
      } else {
        await createProduct(token, payload);
      }
      onSaved(isEdit ? 'Product updated!' : 'Product created!');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
            <div className="form-row">
              <label>Product Name *</label>
              <input placeholder="e.g. Seekh Kebab" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-row-grid">
              <div className="form-row">
                <label>SKU *</label>
                <input placeholder="e.g. KEB-001" value={form.sku} onChange={set('sku')} />
              </div>
              <div className="form-row">
                <label>Category</label>
                <select value={form.category_id} onChange={set('category_id')}>
                  <option value="">— Uncategorised —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-grid">
              <div className="form-row">
                <label>Price (৳) *</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set('price')} />
              </div>
            </div>
            <div className="form-row-grid">
              <div className="form-row">
                <label>Stock Qty</label>
                <input type="number" min="0" placeholder="0" value={form.stock_qty} onChange={set('stock_qty')} />
              </div>
              <div className="form-row">
                <label>Low Stock Alert Threshold</label>
                <input type="number" min="0" placeholder="10" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} />
              </div>
            </div>
            <div className="form-row">
              <label>Image URL</label>
              <input placeholder="https://..." value={form.image_url} onChange={set('image_url')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Custom Sales SVG Chart ───────────────────────────
const SalesChart = ({ data }) => {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No sales data available</p>;

  const width = 500;
  const height = 180;
  const padding = 25;

  const maxVal = Math.max(...data.map(d => d.amount), 100);

  // Map values to chart grid coordinates
  const points = data.map((d, index) => {
    const x = padding + (index * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - (d.amount / maxVal) * (height - padding * 2);
    return { x, y, amount: d.amount, date: d.date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto', marginTop: '16px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Chart lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="0.5" />

        {/* Filled Sales Area */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Sales Curve Line */}
        <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Daily Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="var(--gold)" stroke="var(--surface)" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} fontSize="8" fill="var(--text)" fontWeight="600" textAnchor="middle">
              ৳{Math.round(p.amount)}
            </text>
            <text x={p.x} y={height - 6} fontSize="8.5" fill="var(--text-muted)" fontWeight="500" textAnchor="middle">
              {p.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────
const Admin = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState(undefined); // undefined=closed, null=add, product=edit
  const [newCat, setNewCat] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  // Reports states
  const [summary, setSummary] = useState(null);
  const [dailyBreakdown, setDailyBreakdown] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch {
      showToast('Failed to load categories.', 'error');
    }
  }, [token]);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      const res = await getProducts(token, params);
      setProducts(res.data);
      setPagination(res.pagination);
    } catch {
      showToast('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, search, categoryFilter]);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const summaryRes = await getSalesSummary(token);
      const topProductsRes = await getTopProducts(token);
      setSummary(summaryRes.summary);
      setDailyBreakdown(summaryRes.dailyBreakdown);
      setTopProducts(topProductsRes);
    } catch (err) {
      console.error('Failed to load reports:', err);
      showToast('Failed to load business reports.', 'error');
    } finally {
      setLoadingReports(false);
    }
  }, [token]);

  const fetchLowStock = useCallback(async () => {
    try {
      const data = await getLowStockProducts(token);
      setLowStockProducts(data);
    } catch (err) {
      console.error('Failed to fetch low stock:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
    fetchReports();
    fetchLowStock();
  }, [fetchCategories, fetchReports, fetchLowStock]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await deleteProduct(token, id);
      showToast('Product deleted.');
      fetchProducts(pagination.page);
      fetchLowStock();
    } catch {
      showToast('Failed to delete product.', 'error');
    }
  };

  const handleModalSaved = (msg) => {
    setModalProduct(undefined);
    showToast(msg);
    fetchProducts(1);
    fetchLowStock();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setCatLoading(true);
    try {
      await createCategory(token, newCat.trim());
      setNewCat('');
      showToast('Category added!');
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add category.', 'error');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory(token, id);
      showToast('Category deleted.');
      fetchCategories();
    } catch {
      showToast('Failed to delete category.', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || 'A';

  return (
    <div className="admin-layout">
      {/* ── Sidebar backdrop (mobile) ── */}
      {showSidebar && (
        <div className="sidebar-backdrop" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${showSidebar ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <h1 style={{ margin: 0 }}>POS</h1>
          </div>
          <p style={{ margin: '4px 0 0 26px' }}>Admin Dashboard</p>
        </div>
        <button
          className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }}
        >
          <LayoutDashboard size={17} /> Dashboard
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => { setActiveTab('products'); setShowSidebar(false); }}
        >
          <Package size={17} /> Products
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => { setActiveTab('categories'); setShowSidebar(false); }}
        >
          <Tag size={17} /> Categories
        </button>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          {/* Hamburger — mobile only */}
          <button
            className="sidebar-toggle-btn"
            onClick={() => setShowSidebar(s => !s)}
            title="Menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <h2>
              {activeTab === 'dashboard' ? 'Analytics Dashboard' :
                activeTab === 'products' ? 'Product Management' : 'Category Management'}
            </h2>
            <p>
              {activeTab === 'dashboard' ? 'Overview of POS sales performance' :
                activeTab === 'products' ? 'Manage your menu items and inventory' : 'Organise product categories'}
            </p>
          </div>
          <div className="topbar-user">
            <div className="user-avatar">{userInitial}</div>
            <span>{user?.name || user?.email}</span>
          </div>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' ? (
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>
                  ৳{summary?.totalRevenue?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Sales Count</span>
                <span className="stat-value">{summary?.transactionCount || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg Order Value</span>
                <span className="stat-value">
                  ৳{summary?.averageOrderValue?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          ) : (
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Products</span>
                <span className="stat-value">{pagination.total}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Categories</span>
                <span className="stat-value">{categories.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Low Stock</span>
                <span className="stat-value">{lowStockProducts.length}</span>
              </div>
            </div>
          )}

          {/* ── Dashboard Tab ── */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              {/* Low-Stock Alerts Banner */}
              {lowStockProducts.length > 0 && (
                <div className="panel alert-panel" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(230, 57, 70, 0.03)' }}>
                  <div className="panel-header" style={{ borderBottom: '1px solid rgba(230, 57, 70, 0.15)' }}>
                    <span className="panel-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                      Low-Stock Alerts ({lowStockProducts.length})
                    </span>
                  </div>
                  <div style={{ padding: '16px 24px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      The following items are running low on stock. Please update inventory soon:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {lowStockProducts.map(p => (
                        <div key={p.id} className="badge badge-stock-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px' }}>
                          <strong>{p.name}</strong> <span>({p.stock_qty} left / threshold: {p.low_stock_threshold})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Chart Panel */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} style={{ color: 'var(--gold)' }} />
                    <span>Daily Sales Trend (Last 7 Days)</span>
                  </span>
                </div>
                <div style={{ padding: '24px' }}>
                  {loadingReports ? (
                    <div className="empty-state">
                      <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                      <p>Loading analytics data...</p>
                    </div>
                  ) : (
                    <SalesChart data={dailyBreakdown} />
                  )}
                </div>
              </div>

              {/* Top Products Panel */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={18} style={{ color: 'var(--accent)' }} />
                    <span>Top-Selling Menu Items</span>
                  </span>
                </div>
                <div className="products-table-wrap">
                  {loadingReports ? (
                    <div className="empty-state">
                      <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                      <p>Loading ranking...</p>
                    </div>
                  ) : topProducts.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Utensils size={40} />
                      </div>
                      <p>No sales records found yet.</p>
                    </div>
                  ) : (
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Total Sold</th>
                          <th>Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={p.id}>
                            <td><strong>#{idx + 1}</strong></td>
                            <td><strong>{p.name}</strong></td>
                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</td>
                            <td>
                              <span className="badge badge-stock-ok">
                                {p.total_qty} units
                              </span>
                            </td>
                            <td><strong>৳{parseFloat(p.total_revenue).toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Products Tab ── */}
          {activeTab === 'products' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">All Products</span>
                <button className="btn btn-primary" onClick={() => setModalProduct(null)}>
                  <Plus size={16} /> Add Product
                </button>
              </div>

              {/* Toolbar */}
              <div className="table-toolbar">
                <div className="search-box">
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    placeholder="Search by name or SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="filter-select"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Table */}
              <div className="products-table-wrap">
                {loading ? (
                  <div className="empty-state">
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                    <p>Loading products...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Package size={40} />
                    </div>
                    <p>No products found. Try a different search or add a new one.</p>
                  </div>
                ) : (
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            {p.image_url
                              ? <img className="product-img" src={p.image_url} alt={p.name} />
                              : <div className="product-img-placeholder" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <Utensils size={24} />
                              </div>
                            }
                          </td>
                          <td><strong>{p.name}</strong></td>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.sku}</td>
                          <td>
                            {p.categories?.name
                              ? <span className="badge badge-category">{p.categories.name}</span>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>
                            }
                          </td>
                          <td><strong>৳{parseFloat(p.price).toFixed(2)}</strong></td>
                          <td>
                            <span className={`badge ${p.stock_qty <= (p.low_stock_threshold ?? 10) ? 'badge-stock-low' : 'badge-stock-ok'}`}>
                              {p.stock_qty} units
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button className="btn btn-ghost btn-sm" onClick={() => setModalProduct(p)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} products)</span>
                  <div className="pagination-btns">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchProducts(pagination.page - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchProducts(pagination.page + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Categories Tab ── */}
          {activeTab === 'categories' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">All Categories</span>
              </div>
              <div className="categories-list">
                {categories.length === 0
                  ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No categories yet. Add one below.</p>
                  : categories.map(c => (
                    <div key={c.id} className="category-chip">
                      <Tag size={13} color="var(--gold)" />
                      {c.name}
                      <button className="chip-delete" onClick={() => handleDeleteCategory(c.id)}>
                        <X size={13} />
                      </button>
                    </div>
                  ))
                }
              </div>
              <form className="category-add-form" onSubmit={handleAddCategory}>
                <input
                  placeholder="New category name..."
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={catLoading}>
                  {catLoading ? <span className="spinner" /> : <><Plus size={16} /> Add</>}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* ── Product Modal ── */}
      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          categories={categories}
          token={token}
          onClose={() => setModalProduct(undefined)}
          onSaved={handleModalSaved}
        />
      )}

      {/* ── Toast ── */}
      {ReactDOM.createPortal(
        <Toast msg={toast.msg} type={toast.type} />,
        document.body
      )}
    </div>
  );
};

export default Admin;
