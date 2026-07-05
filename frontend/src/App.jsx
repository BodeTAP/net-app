import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Network from './pages/Network';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Odps from './pages/Odps';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/network" element={<Network />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/users" element={<Users />} />
        <Route path="/odps" element={<Odps />} />
        
        {/* Technician Routes */}
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/technician/scan" element={<Scanner />} />
        <Route path="/technician/map" element={<TechnicianMap />} />
        <Route path="/technician/odp/:id" element={<ODPView />} />
        <Route path="/technician/client/:id" element={<ClientStatus />} />
        
        {/* Client Routes */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/invoices" element={<ClientInvoices />} />
        <Route path="/client/invoice/:id" element={<InvoiceDetail />} />
        <Route path="/client/tickets" element={<ClientTickets />} />
        <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
        
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
