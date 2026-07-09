import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Odps from './pages/Odps';
import Packages from './pages/Packages';
import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import Scanner from './pages/technician/Scanner';
import ODPView from './pages/technician/ODPView';
import ClientStatus from './pages/technician/ClientStatus';
import TechnicianMap from './pages/technician/TechnicianMap';
import ClientLogin from './pages/client/ClientLogin';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientInvoices from './pages/client/ClientInvoices';
import InvoiceDetail from './pages/client/InvoiceDetail';
import ClientTickets from './pages/client/ClientTickets';
import Settings from './pages/Settings';

function getStoredUser(userKey) {
  try {
    return JSON.parse(localStorage.getItem(userKey) || '{}');
  } catch {
    return {};
  }
}

function ProtectedRoute({ children, roles, tokenKey = 'token', userKey = 'user', redirectTo = '/login' }) {
  const token = localStorage.getItem(tokenKey);
  const user = getStoredUser(userKey);

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

const AdminOnly = ({ children }) => (
  <ProtectedRoute roles={['SUPERADMIN', 'ADMIN_BILLING']}>{children}</ProtectedRoute>
);

const SuperadminOnly = ({ children }) => (
  <ProtectedRoute roles={['SUPERADMIN']}>{children}</ProtectedRoute>
);

const TechnicianOnly = ({ children }) => (
  <ProtectedRoute roles={['SUPERADMIN', 'TECHNICIAN']}>{children}</ProtectedRoute>
);

const ClientOnly = ({ children }) => (
  <ProtectedRoute roles={['CLIENT']} tokenKey="clientToken" userKey="clientUser" redirectTo="/client/login">
    {children}
  </ProtectedRoute>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
        <Route path="/clients" element={<AdminOnly><Clients /></AdminOnly>} />
        <Route path="/invoices" element={<AdminOnly><Invoices /></AdminOnly>} />
        <Route path="/tickets" element={<AdminOnly><Tickets /></AdminOnly>} />
        <Route path="/users" element={<SuperadminOnly><Users /></SuperadminOnly>} />
        <Route path="/odps" element={<AdminOnly><Odps /></AdminOnly>} />
        <Route path="/packages" element={<SuperadminOnly><Packages /></SuperadminOnly>} />
        <Route path="/settings" element={<SuperadminOnly><Settings /></SuperadminOnly>} />
        
        {/* Technician Routes */}
        <Route path="/technician" element={<TechnicianOnly><TechnicianDashboard /></TechnicianOnly>} />
        <Route path="/technician/scan" element={<TechnicianOnly><Scanner /></TechnicianOnly>} />
        <Route path="/technician/map" element={<TechnicianOnly><TechnicianMap /></TechnicianOnly>} />
        <Route path="/technician/odp/:id" element={<TechnicianOnly><ODPView /></TechnicianOnly>} />
        <Route path="/technician/client/:id" element={<TechnicianOnly><ClientStatus /></TechnicianOnly>} />
        
        {/* Client Routes */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/dashboard" element={<ClientOnly><ClientDashboard /></ClientOnly>} />
        <Route path="/client/invoices" element={<ClientOnly><ClientInvoices /></ClientOnly>} />
        <Route path="/client/invoice/:id" element={<ClientOnly><InvoiceDetail /></ClientOnly>} />
        <Route path="/client/tickets" element={<ClientOnly><ClientTickets /></ClientOnly>} />
        <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
        
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
