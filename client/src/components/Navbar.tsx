import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const showInventory = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);
  const showWorkOrders = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);
  const showTransfers = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);
  const showCustomerOrders = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-brand">
        <span style={{ color: 'var(--text-main)' }}>Mini</span> Operations
      </NavLink>
      
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
        {showInventory && <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>Inventory</NavLink>}
        {showWorkOrders && <NavLink to="/work-orders" className={({ isActive }) => isActive ? 'active' : ''}>Work Orders</NavLink>}
        {showTransfers && <NavLink to="/transfers" className={({ isActive }) => isActive ? 'active' : ''}>Transfers</NavLink>}
        {showCustomerOrders && <NavLink to="/customer-orders" className={({ isActive }) => isActive ? 'active' : ''}>Customer Orders</NavLink>}
      </div>

      <div className="nav-user-info">
        <span>{user.email}</span>
        <span className="badge badge-assigned">{user.role}</span>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
          Logout
        </button>
      </div>
    </nav>
  );
};
