import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface Transfer {
  id: string;
  sourceLocation: string;
  destinationLocation: string;
  item: string;
  quantity: number;
  status: 'REQUESTED' | 'DISPATCHED' | 'RECEIVED';
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const Transfers = () => {
  const { user } = useAuth();
  
  const [data, setData] = useState<Transfer[]>([]);
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
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  
  const [formData, setFormData] = useState({
    sourceLocation: '',
    destinationLocation: '',
    item: '',
    quantity: '' as number | '',
  });

  const canMutate = user ? ['ADMIN', 'OPERATIONS'].includes(user.role) : false;

  const loadData = async (currentPage = page) => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetchApi(`/transfers?${queryParams.toString()}`);
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
    setFormData({ sourceLocation: '', destinationLocation: '', item: '', quantity: '' });
    setError('');
    setSuccess('');
    setIsCreateModalOpen(true);
  };

  const openViewModal = async (id: string) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const response = await fetchApi(`/transfers/${id}`);
      setSelectedTransfer(response.data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.sourceLocation === formData.destinationLocation) {
      setError('Source and destination locations must be different.');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetchApi('/transfers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess('Transfer requested successfully.');
      setIsCreateModalOpen(false);
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => [res.data, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Validation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async (id: string) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetchApi(`/transfers/${id}/dispatch`, {
        method: 'PATCH',
      });
      setSuccess('Transfer dispatched successfully.');
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => prev.map(t => t.id === id ? res.data : t));
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch transfer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceive = async (id: string) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const res = await fetchApi(`/transfers/${id}/receive`, {
        method: 'PATCH',
      });
      setSuccess('Transfer received successfully.');
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => prev.map(t => t.id === id ? res.data : t));
    } catch (err: any) {
      setError(err.message || 'Failed to receive transfer.');
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
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>Internal Transfers</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage stock movement across locations</p>
        </div>
        {canMutate && (
          <button className="btn" onClick={openCreateModal}>Request Transfer</button>
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
            <option value="REQUESTED">REQUESTED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RECEIVED">RECEIVED</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {isLoading && data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No internal transfers found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th>Destination</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.item}</td>
                  <td>{t.sourceLocation}</td>
                  <td>{t.destinationLocation}</td>
                  <td style={{ textAlign: 'right' }}>{t.quantity}</td>
                  <td>{getStatusBadge(t.status)}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openViewModal(t.id)} disabled={isLoading}>
                        View
                      </button>
                      {canMutate && t.status === 'REQUESTED' && (
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => handleDispatch(t.id)} disabled={isLoading}>
                          {isLoading ? 'Dispatching...' : 'Dispatch'}
                        </button>
                      )}
                      {canMutate && t.status === 'DISPATCHED' && (
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => handleReceive(t.id)} disabled={isLoading}>
                          {isLoading ? 'Receiving...' : 'Receive'}
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
              <h3 style={{ margin: 0 }}>Create Transfer</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Source Location</label>
                <input required className="form-input" value={formData.sourceLocation} onChange={e => setFormData({...formData, sourceLocation: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Destination Location</label>
                <input required className="form-input" value={formData.destinationLocation} onChange={e => setFormData({...formData, destinationLocation: e.target.value})} />
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

      {isViewModalOpen && selectedTransfer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Transfer Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong>ID:</strong> {selectedTransfer.id}</div>
              <div><strong>Status:</strong> {getStatusBadge(selectedTransfer.status)}</div>
              <div><strong>Source:</strong> {selectedTransfer.sourceLocation}</div>
              <div><strong>Destination:</strong> {selectedTransfer.destinationLocation}</div>
              <div><strong>Item:</strong> {selectedTransfer.item}</div>
              <div><strong>Quantity:</strong> {selectedTransfer.quantity}</div>
              <div><strong>Created:</strong> {new Date(selectedTransfer.createdAt).toLocaleString()}</div>
              <div><strong>Updated:</strong> {new Date(selectedTransfer.updatedAt).toLocaleString()}</div>
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
