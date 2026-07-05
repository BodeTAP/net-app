import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, Wrench, LogOut, User } from 'lucide-react';
import { useState } from 'react';

export default function ClientLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    navigate('/client/login');
  };

  const navItems = [
    { path: '/client/dashboard', icon: Home, label: 'Beranda' },
    { path: '/client/invoices', icon: FileText, label: 'Tagihan' },
    { path: '/client/tickets', icon: Wrench, label: 'Bantuan' },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-text flex flex-col md:flex-row max-w-md mx-auto md:max-w-full shadow-2xl relative">
      {/* Mobile Top Bar */}
      <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md z-10 sticky top-0">
        <h1 className="font-bold text-xl tracking-tight">MyNetOps</h1>
        <button 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="p-2 bg-primary-hover rounded-full active:scale-95 transition-transform"
        >
          <User size={20} />
        </button>
      </div>

      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <div className="absolute top-16 right-4 bg-surface shadow-lg rounded-xl border border-border w-48 p-2 z-50 animate-in fade-in zoom-in duration-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut size={16} /> Keluar Akun
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 relative bg-gray-50/50">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 max-w-md mx-auto md:max-w-full">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  active ? 'text-primary' : 'text-muted hover:text-text'
                }`}
              >
                <Icon size={22} className={active ? 'fill-blue-100' : ''} />
                <span className={`text-[10px] font-medium ${active ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
