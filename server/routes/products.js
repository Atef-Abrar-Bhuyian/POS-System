const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// GET /api/products — All authenticated users (supports ?search=, ?category_id=, ?page=, ?limit=)
router.get('/', authenticateToken, async (req, res) => {
  const { search, category_id, page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  try {
    let query = supabase
      .from('products')
      .select('*, categories(id, name)', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/low-stock — Get all products below threshold
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name)')
      .order('name', { ascending: true });

    if (error) throw error;

    const lowStock = data.filter(p => p.stock_qty <= p.low_stock_threshold);
    res.json(lowStock);
  } catch (err) {
    console.error('GET /products/low-stock error:', err);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// GET /api/products/:id — Single product
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('GET /products/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products — Admin only
router.post('/', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { name, sku, category_id, price, stock_qty, image_url, low_stock_threshold } = req.body;

  if (!name || !sku || price == null) {
    return res.status(400).json({ error: 'Name, SKU, and price are required fields' });
  }
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Price must be a valid non-negative number' });
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category_id: category_id || null,
        price: parseFloat(price),
        stock_qty: parseInt(stock_qty) || 0,
        image_url: image_url || null,
        low_stock_threshold: low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 10
      }])
      .select('*, categories(id, name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A product with this SKU already exists' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — Admin only
router.put('/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, sku, category_id, price, stock_qty, image_url, low_stock_threshold } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (sku !== undefined) updates.sku = sku.trim().toUpperCase();
  if (category_id !== undefined) updates.category_id = category_id;
  if (price !== undefined) updates.price = parseFloat(price);
  if (stock_qty !== undefined) updates.stock_qty = parseInt(stock_qty);
  if (image_url !== undefined) updates.image_url = image_url;
  if (low_stock_threshold !== undefined) updates.low_stock_threshold = parseInt(low_stock_threshold);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A product with this SKU already exists' });
      }
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
  } catch (err) {
    console.error('PUT /products/:id error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — Admin only
router.delete('/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('DELETE /products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
