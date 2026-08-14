const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// All reports routes are admin-only
router.use(authenticateToken, checkRole(['admin']));

// GET /api/reports/sales-summary
router.get('/sales-summary', async (req, res) => {
  try {
    // Fetch orders from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    // 1. Calculate overall metrics
    const transactionCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const averageOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // 2. Generate daily sales breakdown for the last 7 days (guaranteeing entry for each day)
    const dailySalesMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      dailySalesMap[dateString] = { date: dateString, amount: 0, count: 0 };
    }

    orders.forEach(o => {
      const dateString = o.created_at.split('T')[0];
      if (dailySalesMap[dateString]) {
        dailySalesMap[dateString].amount += parseFloat(o.total_amount);
        dailySalesMap[dateString].count += 1;
      }
    });

    const dailyBreakdown = Object.values(dailySalesMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        transactionCount,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2))
      },
      dailyBreakdown
    });

  } catch (err) {
    console.error('GET /api/reports/sales-summary error:', err);
    res.status(500).json({ error: 'Failed to generate sales summary report' });
  }
});

// GET /api/reports/top-products
router.get('/top-products', async (req, res) => {
  try {
    // Fetch all order items and join products
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('qty, subtotal, products(id, name, sku)');

    if (error) throw error;

    // Aggregate product sales in JS
    const productSalesMap = {};
    orderItems.forEach(item => {
      const p = item.products;
      if (!p) return;
      
      if (!productSalesMap[p.id]) {
        productSalesMap[p.id] = {
          id: p.id,
          name: p.name,
          sku: p.sku,
          total_qty: 0,
          total_revenue: 0
        };
      }
      productSalesMap[p.id].total_qty += item.qty;
      productSalesMap[p.id].total_revenue += parseFloat(item.subtotal);
    });

    // Sort by qty desc and slice top 5
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5)
      .map(p => ({
        ...p,
        total_revenue: parseFloat(p.total_revenue.toFixed(2))
      }));

    res.json(topProducts);

  } catch (err) {
    console.error('GET /api/reports/top-products error:', err);
    res.status(500).json({ error: 'Failed to generate top products report' });
  }
});

module.exports = router;
