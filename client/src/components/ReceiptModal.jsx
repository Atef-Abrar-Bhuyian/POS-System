import React, { useEffect, useState } from 'react';
import { Printer, X, Utensils } from 'lucide-react';
import { getOrderById } from '../api/orders';
import './ReceiptModal.css';

const ReceiptModal = ({ orderId, orderData, token, onClose }) => {
  const [order, setOrder] = useState(orderData || null);
  const [loading, setLoading] = useState(!orderData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId || orderData) return;

    const fetchOrderDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOrderById(token, orderId);
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order receipt:', err);
        setError('Failed to load receipt details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, orderData, token]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="receipt-body" style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ borderColor: '#666', borderTopColor: '#000', margin: '20px auto' }}></div>
            <p>Loading voucher...</p>
          </div>
        ) : error || !order ? (
          <div className="receipt-body" style={{ textAlign: 'center', color: '#ff4d4d' }}>
            <p>{error || 'No voucher found'}</p>
          </div>
        ) : (
          <>
            <div className="receipt-body">
              <div className="receipt-voucher">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                  <Utensils size={28} style={{ color: '#000', marginBottom: '4px' }} />
                  <h2 style={{ margin: 0 }}>POS</h2>
                </div>
                <p>Premium Kebab &amp; Cuisine</p>
                <p>Dhaka, Bangladesh</p>
                <p>Tel: +880 123456789</p>

                <div className="receipt-divider"></div>

                <div className="receipt-meta">
                  <div><strong>ORDER ID:</strong> {order.id.slice(0, 8).toUpperCase()}</div>
                  <div><strong>DATE:</strong> {new Date(order.created_at).toLocaleString()}</div>
                  <div><strong>CASHIER:</strong> {order.profiles?.name || 'Cashier'}</div>
                  <div><strong>PAY METHOD:</strong> {order.payment_method?.toUpperCase()}</div>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-items">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="receipt-item-row">
                      <span>{item.products?.name} (x{item.qty})</span>
                      <span>৳{(parseFloat(item.unit_price) * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-totals">
                  <div className="receipt-totals-row">
                    <span>Subtotal:</span>
                    <span>৳{(parseFloat(order.total_amount) / 1.05).toFixed(2)}</span>
                  </div>
                  <div className="receipt-totals-row">
                    <span>VAT (5%):</span>
                    <span>৳{(parseFloat(order.total_amount) - (parseFloat(order.total_amount) / 1.05)).toFixed(2)}</span>
                  </div>
                  <div className="receipt-totals-row grand-total">
                    <span>GRAND TOTAL:</span>
                    <span>৳{parseFloat(order.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="receipt-divider"></div>
                <div className="receipt-footer">
                  <p>Thank you for dining with us!</p>
                  <p>Please come again.</p>
                </div>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                <X size={15} /> Close
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiptModal;
