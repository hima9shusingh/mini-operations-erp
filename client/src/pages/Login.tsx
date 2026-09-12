import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card" style={{ maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', color: 'var(--primary)' }}>Mini Operations ERP</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Operations, inventory and order management in one place.</p>
        
        {error && <div className="text-error">{error === 'Failed to fetch' ? 'Unable to connect to the server. Please try again.' : error}</div>}
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', fontSize: '0.875rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Demo accounts</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px' }}>
              <strong>ADMIN</strong><br/>
              <span style={{ color: 'var(--text-muted)' }}>admin@mini-erp.local<br/>Admin@12345</span>
            </div>
            <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px' }}>
              <strong>SALES</strong><br/>
              <span style={{ color: 'var(--text-muted)' }}>sales@mini-erp.local<br/>Sales@12345</span>
            </div>
          </div>

          <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Roles Overview</h4>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <li><strong>ADMIN:</strong> Manage inventory, create and manage work orders, manage internal transfers.</li>
            <li><strong>OPERATIONS:</strong> Manage inventory operations, handle internal transfers, view work orders.</li>
            <li><strong>SALES:</strong> Create customer orders, reserve available inventory, cancel reserved orders.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
