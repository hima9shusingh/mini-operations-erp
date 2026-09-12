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
    requiredQuantity: 0,
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
    setFormData({ location: '', item: '', requiredQuantity: 0, assignedUserId: '' });
    setError('');
    setSuccess('');
    setIsCreateModalOpen(true);
  };

  const openViewModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setStatusUpdate(wo.status);
    setError('');
    setSuccess('');
    setIsViewModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await fetchApi('/work-orders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess('Work order created successfully.');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Validation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedWO) return;
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await fetchApi(`/work-orders/${selectedWO.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusUpdate }),
      });
      setSuccess('Status updated successfully.');
      setIsViewModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Work Orders</h2>
        {canCreate && (
          <button className="btn" onClick={openCreateModal}>Create Work Order</button>
        )}
      </div>

      {error && <div className="text-error">{error}</div>}
      {success && <div className="text-error" style={{ color: '#059669', backgroundColor: '#D1FAE5', borderColor: '#34D399' }}>{success}</div>}

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select 
          className="form-input" 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          style={{ width: '200px' }}
        >
          <option value="">All Statuses</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
        <input 
          className="form-input" 
          placeholder="Filter Location" 
          value={locationFilter} 
          onChange={e => setLocationFilter(e.target.value)} 
          style={{ width: '200px' }}
        />
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {isLoading ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
      ) : data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No work orders found.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Location</th>
                <th>Item</th>
                <th>Required</th>
                <th>Available</th>
                <th>Shortage</th>
                <th>Assigned User</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(wo => {
                const hasShortage = wo.materialAvailability.shortageQuantity > 0;
                return (
                  <tr key={wo.id}>
                    <td>{wo.id.substring(0, 8)}...</td>
                    <td>{wo.location}</td>
                    <td>{wo.item}</td>
                    <td>{wo.requiredQuantity}</td>
                    <td>{wo.materialAvailability.availableQuantity}</td>
                    <td style={{ 
                      color: hasShortage ? '#DC2626' : '#059669', 
                      fontWeight: 'bold',
                      backgroundColor: hasShortage ? '#FEE2E2' : 'transparent',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {wo.materialAvailability.shortageQuantity}
                    </td>
                    <td>{wo.assignedUser?.email}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.875rem',
                        backgroundColor: wo.status === 'COMPLETED' ? '#D1FAE5' : wo.status === 'IN_PROGRESS' ? '#FEF3C7' : '#E0E7FF',
                        color: wo.status === 'COMPLETED' ? '#065F46' : wo.status === 'IN_PROGRESS' ? '#92400E' : '#3730A3'
                      }}>
                        {wo.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openViewModal(wo)}>
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
                <input type="number" min="1" required className="form-input" value={formData.requiredQuantity} onChange={e => setFormData({...formData, requiredQuantity: parseInt(e.target.value) || 0})} />
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
              <div><strong>Status:</strong> {selectedWO.status}</div>
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
