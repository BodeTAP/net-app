import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, QrCode, LogOut, Map } from 'lucide-react';

export default function TechnicianLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/technician', icon: Home },
    { name: 'Map', path: '/technician/map', icon: Map },
    { name: 'Scan', path: '/technician/scan', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
        <h1 className="text-lg font-bold">Tech App</h1>
        <button onClick={handleLogout} className="p-1 hover:bg-white/20 rounded">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around p-2 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 min-w-[64px] rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-muted hover:text-text'
              }`}
            >
              <Icon size={24} className={isActive ? 'mb-1' : 'mb-1'} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
