import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, History } from 'lucide-react';
import { getOrders } from '../api/orders';
import ReceiptModal from './ReceiptModal';
import './OrderHistoryModal.css';

const OrderHistoryModal = ({ token, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrders(token, { page, limit: 10 });
      setOrders(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load order history:', err);
      setError('Failed to load recent orders.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  if (selectedOrderId) {
    return (
      <ReceiptModal
        orderId={selectedOrderId}
        token={token}
        onClose={() => setSelectedOrderId(null)}
      />
    );
  }

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'var(--gold)' }} />
            <span>Recent Order History</span>
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="history-body">
          {loading ? (
            <div className="history-empty">
              <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--gold)', margin: '20px auto' }}></div>
              <p>Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="history-empty" style={{ color: 'var(--accent)' }}>
              <p>{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} />
              </div>
              <p>No orders recorded yet.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Date / Time</th>
                    <th>Cashier</th>
                    <th>Payment Method</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} onClick={() => setSelectedOrderId(order.id)}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.id.slice(0, 8).toUpperCase()}</td>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
                      <td>{order.profiles?.name || 'Unknown'}</td>
                      <td>
                        <span className={`badge-method ${order.payment_method}`}>
                          {order.payment_method === 'mobile_pay' ? 'Mobile' : order.payment_method}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>৳{parseFloat(order.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="history-footer">
            <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)</span>
            <div className="history-pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOrders(pagination.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryModal;
