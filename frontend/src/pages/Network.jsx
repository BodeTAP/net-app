import { useEffect, useState } from 'react';
import axios from 'axios';
import { Server, Activity, Database, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import Layout from '../components/Layout';

export default function Network() {
  const [telemetry, setTelemetry] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchTelemetry = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/network/telemetry', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTelemetry(res.data.data.telemetry);
      setProfiles(res.data.data.profiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/network/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
    } catch (err) {
      alert('Failed to synchronize with MikroTik');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">Orkestrasi Jaringan</h2>
          <p className="text-sm text-muted mt-1">Kelola profil bandwidth dan pantau perangkat keras.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium shadow-sm transition-colors disabled:opacity-70"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> 
          {isSyncing ? 'Sinkronisasi...' : 'Sinkron ke MikroTik'}
        </button>
      </div>

      {loading && !telemetry ? (
        <div className="text-center py-20 text-muted">Memuat data telemetri...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* CPU Load */}
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Cpu size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Router CPU</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.cpuLoad}</h3>
              </div>
            </div>

            {/* RAM */}
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <HardDrive size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Penggunaan Memori</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.memoryUsage}</h3>
              </div>
            </div>

            {/* Rx */}
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Total Trafik Rx</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.rxTraffic}</h3>
              </div>
            </div>

            {/* Tx */}
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Total Trafik Tx</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.txTraffic}</h3>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-text mb-4">Profil Bandwidth (Simple Queues)</h3>
          <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Nama Profil</th>
                  <th className="px-6 py-3 font-medium">Pelanggan Aktif</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-muted">Tidak ada profil aktif.</td>
                  </tr>
                ) : (
                  profiles.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">{p.count} Pengguna</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle size={14} /> Tersinkronisasi
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}

// Inline component for the table status icon since we didn't import it at the top
function CheckCircle({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
