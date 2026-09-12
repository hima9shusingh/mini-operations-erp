import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface InventoryItem {
  id: string;
  item: string;
  category: string;
  location: string;
  batch: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const Inventory = () => {
  const { user } = useAuth();
  
  const [data, setData] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    item: '',
    category: '',
    location: '',
    batch: '',
    physicalQuantity: '' as number | '',
    reservedQuantity: '' as number | '',
  });

  const canAddEdit = user ? ['ADMIN', 'OPERATIONS'].includes(user.role) : false;
  const canDelete = user ? ['ADMIN'].includes(user.role) : false;

  const loadData = async (currentPage = page) => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      if (searchQuery) queryParams.append('search', searchQuery);
      if (locationFilter) queryParams.append('location', locationFilter);
      if (categoryFilter) queryParams.append('category', categoryFilter);

      const response = await fetchApi(`/inventory?${queryParams.toString()}`);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      if (err.message.includes('403')) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
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
    if (page === 1) {
      loadData(1);
    } else {
      setPage(1); // triggers useEffect
    }
  };

  const openCreateModal = () => openModal();
  const openEditModal = (inv: InventoryItem) => openModal(inv);

  const openModal = (inv?: InventoryItem) => {
    if (inv) {
      setEditingId(inv.id);
      setFormData({
        item: inv.item,
        category: inv.category,
        location: inv.location,
        batch: inv.batch,
        physicalQuantity: inv.physicalQuantity,
        reservedQuantity: inv.reservedQuantity,
      });
    } else {
      setEditingId(null);
      setFormData({
        item: '',
        category: '',
        location: '',
        batch: '',
        physicalQuantity: '',
        reservedQuantity: '',
      });
    }
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetchApi(editingId ? `/inventory/${editingId}` : '/inventory', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(formData),
      });
      setSuccess(editingId ? 'Inventory updated successfully.' : 'Inventory created successfully.');
      setIsModalOpen(false);
      
      // OPTIMIZATION: Update local state without double-fetching
      if (editingId) {
        setData(prev => prev.map(item => item.id === res.data.id ? res.data : item));
      } else {
        setData(prev => [res.data, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this inventory?")) return;
    
    setError('');
    setSuccess('');
    try {
      await fetchApi(`/inventory/${id}`, {
        method: 'DELETE',
      });
      setSuccess('Inventory deleted successfully.');
      // OPTIMIZATION: Update local state without double-fetching
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>Inventory</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage physical and reserved stock</p>
        </div>
        {(canAddEdit) && (
          <button className="btn" onClick={openCreateModal}>
            Add Inventory
          </button>
        )}
      </div>

      {error && <div className="text-error">{error}</div>}
      {success && <div className="text-success">{success}</div>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search item, category, location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Location filter" 
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{ flex: '1 1 150px' }}
          />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Category filter" 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ flex: '1 1 150px' }}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {isLoading && data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No inventory records found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th>Batch</th>
                <th style={{ textAlign: 'right' }}>Physical</th>
                <th style={{ textAlign: 'right' }}>Reserved</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                {(canAddEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.item}</td>
                  <td><span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>{item.category}</span></td>
                  <td>{item.location}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{item.batch}</td>
                  <td style={{ textAlign: 'right' }}>{item.physicalQuantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.reservedQuantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                    {item.availableQuantity}
                  </td>
                  {(canAddEdit || canDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {canAddEdit && (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openEditModal(item)}>Edit</button>
                        )}
                        {canDelete && (
                          <button className="btn btn-secondary btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none' }} onClick={() => handleDelete(item.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button 
            className="btn btn-secondary" 
            disabled={page === pagination.totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit Inventory' : 'Add Inventory'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input required className="form-input" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input required className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input required className="form-input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Batch</label>
                <input required className="form-input" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} disabled={!!editingId} style={{ opacity: editingId ? 0.6 : 1 }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Physical Qty</label>
                  <input type="number" min="0" required className="form-input" value={formData.physicalQuantity} onChange={e => setFormData({...formData, physicalQuantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} />
                </div>
                {!editingId && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Reserved Qty</label>
                    <input type="number" min="0" required className="form-input" value={formData.reservedQuantity} onChange={e => setFormData({...formData, reservedQuantity: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} />
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
