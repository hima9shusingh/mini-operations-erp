import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Placeholder } from './pages/Placeholder';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
            <Route path="/work-orders" element={<AppLayout><Placeholder title="Work Orders" /></AppLayout>} />
            <Route path="/transfers" element={<AppLayout><Placeholder title="Internal Transfers" /></AppLayout>} />
            <Route path="/customer-orders" element={<AppLayout><Placeholder title="Customer Orders" /></AppLayout>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
