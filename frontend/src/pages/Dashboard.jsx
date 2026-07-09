import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Server, Activity, DollarSign, Cpu, HardDrive, DownloadCloud, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
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

    const fetchTelemetry = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('/api/v1/network/telemetry', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTelemetry(res.data.data.telemetry);
      } catch (err) {
        console.error(err);
      }
    };

    const loadAll = async () => {
      await Promise.all([fetchStats(), fetchTelemetry()]);
    };

    loadAll();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">Ringkasan Dasbor</h2>
          <p className="text-muted text-sm mt-1">Pantau performa jaringan dan bisnis Anda hari ini.</p>
        </div>
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

      <div className="mt-8 mb-4">
        <h3 className="text-lg font-bold text-text mb-4">Telemetri Router</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Router CPU</p>
              <h3 className="text-2xl font-bold text-text">{telemetry?.cpuLoad || '0%'}</h3>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <HardDrive size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Penggunaan Memori</p>
              <h3 className="text-2xl font-bold text-text">{telemetry?.memoryUsage || '0 MB'}</h3>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Total Trafik Rx</p>
              <h3 className="text-2xl font-bold text-text">{telemetry?.rxTraffic || '0 bps'}</h3>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Total Trafik Tx</p>
              <h3 className="text-2xl font-bold text-text">{telemetry?.txTraffic || '0 bps'}</h3>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
