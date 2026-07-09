import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, Settings, LogOut, Search, Bell, Activity, Server, Menu, Wrench, Shield, MapPin, Box } from 'lucide-react';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dasbor', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'ADMIN_BILLING'] },
    { name: 'Pelanggan', path: '/clients', icon: Users, roles: ['SUPERADMIN', 'ADMIN_BILLING'] },
    { name: 'Tagihan', path: '/invoices', icon: Receipt, roles: ['SUPERADMIN', 'ADMIN_BILLING'] },
    { name: 'Tiket', path: '/tickets', icon: Wrench, roles: ['SUPERADMIN', 'ADMIN_BILLING'] },
    { name: 'Pemetaan ODP', path: '/odps', icon: MapPin, roles: ['SUPERADMIN', 'ADMIN_BILLING'] },
    { name: 'Paket Internet', path: '/packages', icon: Box, roles: ['SUPERADMIN'] },
    { name: 'Karyawan', path: '/users', icon: Shield, roles: ['SUPERADMIN'] },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`bg-surface border-r border-border transition-all duration-300 ease-in-out flex flex-col z-50 print:hidden ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden ${!isSidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 shrink-0 rounded bg-primary text-white flex items-center justify-center">
              <Activity size={18} />
            </div>
            {isSidebarOpen && <h1 className="text-lg font-bold text-text whitespace-nowrap">NetOps CRM</h1>}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-muted hover:bg-gray-100 hover:text-text'
                }`}
                title={!isSidebarOpen ? item.name : ''}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted group-hover:text-text transition-colors'}`} />
                {isSidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Profile & Logout Section */}
        <div className="p-4 border-t border-border shrink-0">
          {isSidebarOpen && user.fullname && (
            <div className="mb-4 px-3">
              <p className="text-sm font-bold text-text truncate">{user.fullname}</p>
              <p className="text-xs text-muted truncate">{user.role}</p>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
            title={!isSidebarOpen ? 'Keluar' : ''}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Mobile Toggle & Context) */}
        <header className="h-16 bg-surface border-b border-border flex items-center px-4 shrink-0 print:hidden">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-muted hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
