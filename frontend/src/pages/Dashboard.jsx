import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Server, Activity, DollarSign } from 'lucide-react';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get('/api/v1/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data.data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text">Ringkasan Dasbor</h2>
        <p className="text-muted text-sm mt-1">Pantau performa jaringan Anda hari ini.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted mb-1">Pelanggan Aktif</p>
          <h3 className="text-2xl font-bold text-text">{stats?.activeClients || 0}</h3>
        </div>

        {/* Card 2 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Server size={20} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted mb-1">Total ODP</p>
          <h3 className="text-2xl font-bold text-text">{stats?.totalODPs || 0}</h3>
        </div>

        {/* Card 3 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Activity size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted mb-1">Tiket Terbuka</p>
          <h3 className="text-2xl font-bold text-text">{stats?.openTickets || 0}</h3>
        </div>

        {/* Card 4 */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted mb-1">Pendapatan (Lunas)</p>
          <h3 className="text-2xl font-bold text-text">Rp {stats?.revenue?.toLocaleString('id-ID') || 0}</h3>
        </div>

      </div>
    </Layout>
  );
}
