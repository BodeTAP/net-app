import { useEffect, useState } from 'react';
import axios from 'axios';
import { Server, Activity, Database, RefreshCw, Cpu, HardDrive, CheckCircle, DownloadCloud, Plus, Edit2, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';

export default function Network() {
  const [telemetry, setTelemetry] = useState(null);
  const [activeClientsCount, setActiveClientsCount] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({ name: '', localAddress: '', remoteAddress: '', rateLimit: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTelemetry = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/network/telemetry', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTelemetry(res.data.data.telemetry);
      setActiveClientsCount(res.data.data.profiles);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/network/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfiles(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([fetchTelemetry(), fetchProfiles()]);
  };

  useEffect(() => {
    loadData();
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

  const handleImport = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menarik data PPPoE dari MikroTik? Akun PPPoE yang belum ada di CRM akan ditambahkan.')) {
      return;
    }
    
    setIsImporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/network/import', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert('Gagal menarik data dari MikroTik');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteProfile = async (name) => {
    if (!window.confirm(`Hapus profil ${name} dari MikroTik?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/network/profiles/${name}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfiles();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus profil');
    }
  };

  const openModal = (profile = null) => {
    if (profile) {
      setEditingProfile(profile.name);
      setFormData({
        name: profile.name,
        localAddress: profile.localAddress,
        remoteAddress: profile.remoteAddress,
        rateLimit: profile.rateLimit
      });
    } else {
      setEditingProfile(null);
      setFormData({ name: '', localAddress: '', remoteAddress: '', rateLimit: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (editingProfile) {
        await axios.patch(`/api/v1/network/profiles/${editingProfile}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/v1/network/profiles', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchProfiles();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan profil');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">Orkestrasi Jaringan</h2>
          <p className="text-sm text-muted mt-1">Kelola profil bandwidth dan pantau perangkat keras.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleImport}
            disabled={isImporting || isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border text-text rounded-lg hover:bg-gray-50 font-medium shadow-sm transition-colors disabled:opacity-70"
          >
            <DownloadCloud size={18} className={isImporting ? 'animate-bounce' : ''} /> 
            {isImporting ? 'Menarik...' : 'Tarik dari MikroTik'}
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing || isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium shadow-sm transition-colors disabled:opacity-70"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> 
            {isSyncing ? 'Sinkronisasi...' : 'Sinkron ke MikroTik'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted">Memuat data telemetri...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Cpu size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Router CPU</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.cpuLoad}</h3>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <HardDrive size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Penggunaan Memori</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.memoryUsage}</h3>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm text-muted font-medium">Total Trafik Rx</p>
                <h3 className="text-2xl font-bold text-text">{telemetry?.rxTraffic}</h3>
              </div>
            </div>

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

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-text">Profil Bandwidth (PPPoE Profiles)</h3>
            <button 
              onClick={() => openModal()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium transition-colors text-sm"
            >
              <Plus size={16} /> Tambah Profil
            </button>
          </div>
          <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Nama Profil</th>
                  <th className="px-6 py-3 font-medium">Local/Remote Address</th>
                  <th className="px-6 py-3 font-medium">Rate Limit</th>
                  <th className="px-6 py-3 font-medium">Pelanggan Aktif</th>
                  <th className="px-6 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-muted">Tidak ada profil.</td>
                  </tr>
                ) : (
                  profiles.map((p, idx) => {
                    const activeCount = activeClientsCount.find(c => c.name === p.name)?.count || 0;
                    return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary flex items-center gap-2">
                        {p.name} {p.isDefault && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-normal uppercase tracking-wider">Default</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted mb-0.5">Local: <span className="text-text font-medium">{p.localAddress || '-'}</span></div>
                        <div className="text-xs text-muted">Remote: <span className="text-text font-medium">{p.remoteAddress || '-'}</span></div>
                      </td>
                      <td className="px-6 py-4 font-medium text-text bg-gray-50/50">{p.rateLimit || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs">{activeCount} Pengguna</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openModal(p)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Profil"><Edit2 size={16} /></button>
                          {!p.isDefault && (
                            <button onClick={() => handleDeleteProfile(p.name)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Hapus Profil"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-text">{editingProfile ? 'Edit Profil Bandwidth' : 'Tambah Profil Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-text bg-white rounded-full p-1 border border-border shadow-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmitProfile} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Nama Profil *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={editingProfile !== null} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-muted transition-shadow" placeholder="Misal: PAKET-10-MB" />
                  {editingProfile && <p className="text-xs text-muted mt-1">Nama profil tidak dapat diubah.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Local Address (Gateway)</label>
                  <input type="text" value={formData.localAddress} onChange={e => setFormData({...formData, localAddress: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" placeholder="Misal: 192.168.200.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Remote Address (IP Pool)</label>
                  <input type="text" value={formData.remoteAddress} onChange={e => setFormData({...formData, remoteAddress: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" placeholder="Misal: pool1-pppoe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Rate Limit (Rx/Tx)</label>
                  <input type="text" value={formData.rateLimit} onChange={e => setFormData({...formData, rateLimit: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" placeholder="Misal: 10M/10M" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-border rounded-lg font-medium text-text hover:bg-gray-50 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-70 transition-colors shadow-sm">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
