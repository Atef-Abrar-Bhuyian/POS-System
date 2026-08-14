const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateToken = require('../middleware/auth');

// POST /api/orders — Any authenticated cashier or admin can create an order
router.post('/', authenticateToken, async (req, res) => {
  const { items, payment_method, total_amount } = req.body;

  // Basic validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const validMethods = ['cash', 'card', 'mobile_pay'];
  if (!payment_method || !validMethods.includes(payment_method)) {
    return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
  }

  if (!total_amount || isNaN(total_amount) || total_amount <= 0) {
    return res.status(400).json({ error: 'Invalid total_amount' });
  }

  // Validate item shape
  for (const item of items) {
    if (!item.product_id || !item.qty || !item.unit_price) {
      return res.status(400).json({ error: 'Each item must include product_id, qty, and unit_price' });
    }
    if (item.qty <= 0 || item.unit_price < 0) {
      return res.status(400).json({ error: 'Item qty must be > 0 and unit_price >= 0' });
    }
  }

  try {
    // Call the atomic Postgres function via Supabase RPC
    const { data, error } = await supabase.rpc('create_order', {
      p_cashier_id: req.user.id,
      p_items: items,
      p_payment_method: payment_method,
      p_total_amount: parseFloat(total_amount)
    });

    if (error) {
      // Check for our custom stock error message
      if (error.message && error.message.includes('STOCK_ERROR')) {
        const detail = error.message.replace('STOCK_ERROR: Insufficient stock for: ', '');
        return res.status(400).json({
          error: 'Insufficient stock',
          detail: `The following items do not have enough stock: ${detail}`
        });
      }
      throw error;
    }

    res.status(201).json({
      message: 'Order created successfully',
      order_id: data.order_id
    });

  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Failed to create order', detail: err.message });
  }
});

// GET /api/orders — Get recent orders (for cashier history)
router.get('/', authenticateToken, async (req, res) => {
  const { limit = 20, page = 1 } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  try {
    // Check caller role
    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', req.user.id).single();

    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku))', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (callerProfile?.role !== 'admin') {
      query = query.eq('cashier_id', req.user.id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Attach cashier names from profiles
    const cashierIds = [...new Set(data.map(o => o.cashier_id).filter(Boolean))];
    let profilesMap = {};
    if (cashierIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, name').in('id', cashierIds);
      if (profiles) profiles.forEach(p => { profilesMap[p.id] = p; });
    }

    const enriched = data.map(o => ({
      ...o,
      profiles: profilesMap[o.cashier_id] || null
    }));

    res.json({
      data: enriched,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id — Single order with all details
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku, image_url)), payments(*)')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found' });

    // Fetch cashier profile separately
    const { data: profile } = await supabase
      .from('profiles').select('id, name, email').eq('id', data.cashier_id).single();

    res.json({ ...data, profiles: profile || null });
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

module.exports = router;
