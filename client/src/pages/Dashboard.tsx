import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.75rem' }}>Dashboard</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
        Welcome to the Mini Operations ERP system.
      </p>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Profile</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
              <div style={{ fontWeight: 500 }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</div>
              <div style={{ display: 'inline-block', marginTop: '0.25rem' }}>
                <span className="badge badge-assigned">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Use the navigation bar above to access the modules available to your assigned role.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-completed">Systems Online</span>
            <span className="badge badge-completed">DB Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
