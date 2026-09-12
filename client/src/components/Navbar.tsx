
import { Link, useNavigate } from 'react-router-dom';
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
  const showWorkOrders = ['ADMIN', 'OPERATIONS'].includes(user.role);
  const showTransfers = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);
  const showCustomerOrders = ['ADMIN', 'OPERATIONS', 'SALES'].includes(user.role);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">Mini Operations ERP</Link>
      
      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        {showInventory && <Link to="/inventory">Inventory</Link>}
        {showWorkOrders && <Link to="/work-orders">Work Orders</Link>}
        {showTransfers && <Link to="/transfers">Transfers</Link>}
        {showCustomerOrders && <Link to="/customer-orders">Customer Orders</Link>}
      </div>

      <div className="nav-user-info">
        <span>{user.email}</span>
        <span style={{ fontWeight: 'bold' }}>({user.role})</span>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
          Logout
        </button>
      </div>
    </nav>
  );
};
