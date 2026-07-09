import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Trash2, RefreshCw, Box } from 'lucide-react';
import Layout from '../components/Layout';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [formData, setFormData] = useState({
    name: '', monthly_fee: '', rate_limit: '', is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPackages = async () => {
    if (!token) return navigate('/login');
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/packages', { headers });
      setPackages(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/v1/packages/sync', {}, { headers });
      alert(res.data.message);
      fetchPackages();
    } catch (err) {
      alert('Gagal sinkronisasi dari MikroTik');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/v1/packages', formData, { headers });
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      alert('Gagal menambah paket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/api/v1/packages/${selectedPackage.id}`, formData, { headers });
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      alert('Gagal memperbarui paket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Hapus paket ${pkg.name}? Ini juga akan menghapusnya dari MikroTik.`)) return;
    try {
      await axios.delete(`/api/v1/packages/${pkg.id}`, { headers });
      fetchPackages();
    } catch (err) {
      alert('Gagal menghapus paket.');
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Paket Internet</h1>
          <p className="text-gray-500">Kelola daftar profil kecepatan dan harga berlangganan</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg flex items-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync MikroTik
          </button>
          <button
            onClick={() => {
              setFormData({ name: '', monthly_fee: '', rate_limit: '', is_active: true });
              setIsEditMode(false);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Paket
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">ID / Nama Paket</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Harga per Bulan</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Rate Limit (Speed)</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Status</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">Memuat data...</td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    <Box className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    Belum ada paket internet. Klik Sync MikroTik atau Tambah Paket.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{pkg.name}</div>
                      <div className="text-xs text-gray-500">{pkg.id}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-indigo-600">{formatRupiah(pkg.monthly_fee)}</td>
                    <td className="py-4 px-6 text-gray-600">{pkg.rate_limit || 'Tidak dibatasi'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setFormData({ name: pkg.name, monthly_fee: pkg.monthly_fee, rate_limit: pkg.rate_limit, is_active: pkg.is_active });
                          setIsEditMode(true);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-2"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Hapus"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {isEditMode ? 'Edit Paket' : 'Tambah Paket Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={isEditMode ? handleUpdateSubmit : handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Paket / Profil</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: PAKET-10M"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  value={formData.monthly_fee}
                  onChange={e => setFormData({...formData, monthly_fee: e.target.value})}
                  placeholder="Contoh: 150000"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (Speed)</label>
                <input
                  type="text"
                  value={formData.rate_limit}
                  onChange={e => setFormData({...formData, rate_limit: e.target.value})}
                  placeholder="Contoh: 10M/10M"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Kosongkan jika tidak dilimit</p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Tersedia untuk pelanggan</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
