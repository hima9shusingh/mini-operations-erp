import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface CustomerOrder {
  id: string;
  customerName: string;
  location: string;
  item: string;
  quantity: number;
  status: 'RESERVED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const CustomerOrders = () => {
  const { user } = useAuth();
  
  const [data, setData] = useState<CustomerOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    location: '',
    item: '',
    quantity: '' as number | '',
  });

  const canCreate = user ? ['ADMIN', 'SALES'].includes(user.role) : false;
  const canCancelAll = user ? ['ADMIN'].includes(user.role) : false;
  const canCancelOwn = user ? ['SALES'].includes(user.role) : false;

  const loadData = async (currentPage = page) => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetchApi(`/customer-orders?${queryParams.toString()}`);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      if (err.message.includes('403')) setError('You are not authorized to perform this action.');
      else setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (page === 1) loadData(1);
    else setPage(1);
  };

  const openCreateModal = () => {
    setFormData({ customerName: '', location: '', item: '', quantity: '' });
    setError('');
    setSuccess('');
    setIsCreateModalOpen(true);
  };

  const openViewModal = async (id: string) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const response = await fetchApi(`/customer-orders/${id}`);
      setSelectedOrder(response.data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetchApi('/customer-orders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess('Customer order reserved successfully.');
      setIsCreateModalOpen(false);
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => [res.data, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Validation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this reserved order?")) return;
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetchApi(`/customer-orders/${id}/cancel`, {
        method: 'PATCH',
      });
      setSuccess('Customer order cancelled successfully.');
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => prev.map(o => o.id === id ? res.data : o));
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>Customer Orders</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Reserve stock for external fulfillment</p>
        </div>
        {canCreate && (
          <button className="btn" onClick={openCreateModal}>Create Customer Order</button>
        )}
      </div>

      {error && <div className="text-error">{error}</div>}
      {success && <div className="text-success">{success}</div>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            className="form-input" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            style={{ flex: '1 1 200px' }}
          >
            <option value="">All Statuses</option>
            <option value="RESERVED">RESERVED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="SHIPPED">SHIPPED</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {isLoading && data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No customer orders found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Item</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 500 }}>{order.customerName}</td>
                  <td>{order.item}</td>
                  <td>{order.location}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{order.quantity}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{order.createdBy}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openViewModal(order.id)} disabled={isLoading}>
                        View
                      </button>
                      {(canCancelAll || (canCancelOwn && order.createdBy === user?.name)) && order.status === 'RESERVED' && (
                        <button className="btn btn-secondary btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none' }} onClick={() => handleCancel(order.id)} disabled={isLoading}>
                          {isLoading ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="btn btn-secondary" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Customer Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            {/* Show error locally inside the modal to block closing */}
            {error && <div className="text-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input required className="form-input" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input required className="form-input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input required className="form-input" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" min="1" required className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Order Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong>ID:</strong> {selectedOrder.id}</div>
              <div><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</div>
              <div><strong>Customer Name:</strong> {selectedOrder.customerName}</div>
              <div><strong>Created By:</strong> {selectedOrder.createdBy}</div>
              <div><strong>Location:</strong> {selectedOrder.location}</div>
              <div><strong>Item:</strong> {selectedOrder.item}</div>
              <div><strong>Quantity:</strong> {selectedOrder.quantity}</div>
              <div><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
              <div><strong>Updated:</strong> {new Date(selectedOrder.updatedAt).toLocaleString()}</div>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
