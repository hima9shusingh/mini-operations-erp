
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>Dashboard</h2>
      <p style={{ marginBottom: '1rem' }}>
        Welcome to the Mini Operations ERP system! 
      </p>
      <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '4px' }}>
        <p><strong>Logged in as:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>
      <p style={{ marginTop: '1rem', color: '#6B7280' }}>
        Use the navigation bar above to access the modules available to your role.
      </p>
    </div>
  );
};
