import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface WorkOrder {
  id: string;
  location: string;
  item: string;
  requiredQuantity: number;
  assignedUser: { id: string; name: string; email: string; role: string };
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  materialAvailability: {
    availableQuantity: number;
    shortageQuantity: number;
  };
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const WorkOrders = () => {
  const { user } = useAuth();
  
  const [data, setData] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  
  const [formData, setFormData] = useState({
    location: '',
    item: '',
    requiredQuantity: '' as number | '',
    assignedUserId: '',
  });
  const [statusUpdate, setStatusUpdate] = useState('');

  const canCreate = user ? ['ADMIN'].includes(user.role) : false;
  const canUpdateStatus = user ? ['ADMIN'].includes(user.role) : false;

  const loadData = async (currentPage = page) => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      if (statusFilter) queryParams.append('status', statusFilter);
      if (locationFilter) queryParams.append('location', locationFilter);

      const response = await fetchApi(`/work-orders?${queryParams.toString()}`);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      if (err.message.includes('403')) setError('You are not authorized to perform this action.');
      else setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetchApi('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (canCreate) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCreate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (page === 1) loadData(1);
    else setPage(1);
  };

  const openCreateModal = () => {
    setFormData({ location: '', item: '', requiredQuantity: '', assignedUserId: '' });
    setError('');
    setSuccess('');
    setIsCreateModalOpen(true);
  };

  const openViewModal = (id: string) => {
    const wo = data.find(w => w.id === id);
    if (wo) {
      setSelectedWO(wo);
      setStatusUpdate(wo.status);
      setError('');
      setSuccess('');
      setIsViewModalOpen(true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetchApi('/work-orders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess('Work order created successfully.');
      setIsCreateModalOpen(false);
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => [res.data, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Validation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedWO) return;
    const id = selectedWO.id;
    const newStatus = statusUpdate;
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetchApi(`/work-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccess('Work order status updated.');
      
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => prev.map(wo => wo.id === id ? { ...wo, status: res.data.status } : wo));
      
      if (selectedWO && selectedWO.id === id) {
        setSelectedWO({ ...selectedWO, status: res.data.status });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>Work Orders</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track and manage production orders</p>
        </div>
        {canCreate && (
          <button className="btn" onClick={openCreateModal}>Create Work Order</button>
        )}
      </div>

      {error && <div className="text-error">{error}</div>}
      {success && <div className="text-success">{success}</div>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Location filter" 
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <select 
            className="form-input" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            style={{ flex: '1 1 200px' }}
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {isLoading && data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No work orders found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th style={{ textAlign: 'center' }}>Required</th>
                <th style={{ textAlign: 'center' }}>Available</th>
                <th style={{ textAlign: 'center' }}>Shortage</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(wo => {
                const available = wo.materialAvailability?.availableQuantity || 0;
                const shortage = wo.materialAvailability?.shortageQuantity || 0;
                return (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: 500 }}>{wo.item}</td>
                    <td>{wo.location}</td>
                    <td style={{ textAlign: 'center' }}>{wo.requiredQuantity}</td>
                    <td style={{ textAlign: 'center' }}>{available}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: shortage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {shortage}
                    </td>
                    <td>
                      <span className={`badge badge-${wo.status.toLowerCase().replace('_', '')}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{wo.assignedUser?.email}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openViewModal(wo.id)} disabled={isLoading}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
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
              <h3 style={{ margin: 0 }}>Create Work Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input required className="form-input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input required className="form-input" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Required Quantity</label>
                <input type="number" min="1" required className="form-input" value={formData.requiredQuantity} onChange={e => setFormData({...formData, requiredQuantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned User</label>
                <select required className="form-input" value={formData.assignedUserId} onChange={e => setFormData({...formData, assignedUserId: e.target.value})}>
                  <option value="">Select User...</option>
                  {users.filter(u => ['ADMIN', 'OPERATIONS'].includes(u.role)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedWO && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Work Order Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong>ID:</strong> {selectedWO.id}</div>
              <div><strong>Status:</strong> <span className={`badge badge-${selectedWO.status.toLowerCase().replace('_', '')}`}>{selectedWO.status}</span></div>
              <div><strong>Location:</strong> {selectedWO.location}</div>
              <div><strong>Item:</strong> {selectedWO.item}</div>
              <div><strong>Required Qty:</strong> {selectedWO.requiredQuantity}</div>
              <div><strong>Assigned To:</strong> {selectedWO.assignedUser?.email}</div>
              <div><strong>Available Qty:</strong> {selectedWO.materialAvailability.availableQuantity}</div>
              <div><strong>Shortage Qty:</strong> <span style={{ color: selectedWO.materialAvailability.shortageQuantity > 0 ? '#DC2626' : 'inherit', fontWeight: 'bold' }}>{selectedWO.materialAvailability.shortageQuantity}</span></div>
              <div><strong>Created:</strong> {new Date(selectedWO.createdAt).toLocaleString()}</div>
            </div>

            {canUpdateStatus && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Update Status</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select className="form-input" value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)} style={{ flex: 1 }}>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <button className="btn" onClick={handleStatusUpdate} disabled={isLoading || statusUpdate === selectedWO.status}>
                    {isLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
