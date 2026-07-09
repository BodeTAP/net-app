import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, QrCode, Printer, Search, Filter, ChevronLeft, ChevronRight, X, Edit, Trash2, PowerOff, CheckCircle, AlertTriangle, FileText, Wrench, MessageCircle, Lock, Unlock, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../components/Layout';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedQRClient, setSelectedQRClient] = useState(null);

  // Selected Client Details
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form & Profile states
  const [mikrotikProfiles, setMikrotikProfiles] = useState([]);
  const [formData, setFormData] = useState({
    fullname: '', whatsapp: '', address: '', mikrotik_profile: '', monthly_fee: '', billing_cycle_date: 1, is_active: true, auto_isolir: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProfiles = async () => {
    try {
      const res = await axios.get('/api/v1/packages', { headers });
      const packages = res.data.data.filter(p => p.is_active);
      setMikrotikProfiles(packages);
    } catch (err) {
      console.error('Gagal mengambil profil mikrotik', err);
    }
  };

  const fetchClients = async (page = 1) => {
    if (!token) return navigate('/login');
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await axios.get('/api/v1/clients', { headers, params });
      setClients(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setCurrentPage(res.data.pagination.currentPage);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchClients(1);
  }, [statusFilter, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleOpenDetail = async (client) => {
    setSelectedClient(client);
    setIsDetailModalOpen(true);
    setIsEditMode(false);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/v1/clients/${client.id}`, { headers });
      setClientDetails(res.data.data);
      setFormData({
        fullname: res.data.data.fullname,
        whatsapp: res.data.data.whatsapp,
        address: res.data.data.address,
        mikrotik_profile: res.data.data.mikrotik_profile,
        monthly_fee: res.data.data.monthly_fee,
        billing_cycle_date: res.data.data.billing_cycle_date,
        is_active: res.data.data.is_active,
        auto_isolir: res.data.data.auto_isolir
      });
    } catch (err) {
      alert('Gagal mengambil detail pelanggan');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/v1/clients', formData, { headers });
      setIsCreateModalOpen(false);
      setFormData({ fullname: '', whatsapp: '', address: '', mikrotik_profile: mikrotikProfiles[0]?.name || '', monthly_fee: mikrotikProfiles[0]?.monthly_fee || '', billing_cycle_date: 1, is_active: true, auto_isolir: true });
      fetchClients(currentPage);
    } catch (err) {
      alert('Gagal menambah pelanggan. Anda mungkin tidak memiliki izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.patch(`/api/v1/clients/${selectedClient.id}`, formData, { headers });
      setIsEditMode(false);
      handleOpenDetail(selectedClient); // Refresh detail
      fetchClients(currentPage); // Refresh list
    } catch (err) {
      alert('Gagal memperbarui pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan pelanggan ini?')) return;
    try {
      await axios.delete(`/api/v1/clients/${selectedClient.id}`, { headers });
      setIsDetailModalOpen(false);
      fetchClients(currentPage);
    } catch (err) {
      alert('Gagal menonaktifkan pelanggan.');
    }
  };

  const handleActivate = async () => {
    if (!confirm('Apakah Anda yakin ingin mengaktifkan kembali pelanggan ini?')) return;
    try {
      await axios.patch(`/api/v1/clients/${selectedClient.id}`, { is_active: true }, { headers });
      setIsDetailModalOpen(false);
      fetchClients(currentPage);
    } catch (err) {
      alert('Gagal mengaktifkan pelanggan.');
    }
  };

  const openCreateModal = () => {
    const today = Math.min(new Date().getDate(), 28);
    const defaultProfile = mikrotikProfiles.length > 0 ? mikrotikProfiles[0].name : 'default';
    setFormData({ fullname: '', whatsapp: '', address: '', mikrotik_profile: defaultProfile, monthly_fee: getSuggestedPrice(defaultProfile), billing_cycle_date: today, is_active: true, auto_isolir: true });
    setIsCreateModalOpen(true);
  };

  return (
    <Layout>
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-text">Manajemen Pelanggan</h2>
            <p className="text-sm text-muted mt-1">Kelola data, detail, dan konfigurasi jaringan pelanggan.</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Tambah Pelanggan
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Cari nama, WA, atau ID pelanggan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </form>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            {['ALL', 'ACTIVE', 'INACTIVE'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-white text-muted border border-border hover:bg-gray-50'
                }`}
              >
                {s === 'ALL' ? 'Semua' : s === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">ID & Nama</th>
                  <th className="px-6 py-3 font-medium">WhatsApp</th>
                  <th className="px-6 py-3 font-medium">Profil & Biaya</th>
                  <th className="px-6 py-3 font-medium">Jatuh Tempo</th>
                  <th className="px-6 py-3 font-medium">Status & Isolir</th>
                  <th className="px-6 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-muted">Memuat...</td></tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-muted">
                      Tidak ada pelanggan ditemukan.
                    </td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => handleOpenDetail(client)} className="font-medium text-text hover:text-primary transition-colors block text-left">
                          {client.fullname}
                        </button>
                        <span className="text-xs font-mono text-muted">{client.id}</span>
                      </td>
                      <td className="px-6 py-4 text-text text-sm">{client.whatsapp}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 w-fit">
                            {client.mikrotik_profile}
                          </span>
                          <span className="text-xs font-medium text-text">Rp {parseFloat(client.monthly_fee).toLocaleString('id-ID')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text text-sm">Tgl {client.billing_cycle_date}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {client.is_active ? 'Aktif' : 'Terisolir (Nonaktif)'}
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                            client.auto_isolir ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {client.auto_isolir ? 'Auto-Isolir: ON' : 'Auto-Isolir: OFF (Leluasa)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleOpenDetail(client)}
                            className="px-2.5 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors text-xs font-medium"
                          >
                            Detail
                          </button>
                          <button 
                            onClick={() => setSelectedQRClient(client)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium"
                            title="QR Code Stiker"
                          >
                            <QrCode size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (!confirm(`Apakah Anda yakin ingin ${client.is_active ? 'mengisolir' : 'membuka isolir'} pelanggan ini secara manual?`)) return;
                              try {
                                await axios.patch(`/api/v1/clients/${client.id}`, { is_active: !client.is_active }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                fetchClients(currentPage);
                              } catch (err) {
                                alert('Gagal mengubah status isolir.');
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium ${client.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title={client.is_active ? 'Isolir Manual' : 'Buka Isolir Manual'}
                          >
                            {client.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50 print:hidden">
              <p className="text-xs text-muted">
                Menampilkan {clients.length} dari {totalItems} pelanggan
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setCurrentPage(p => p - 1); fetchClients(currentPage - 1); }}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setCurrentPage(p); fetchClients(p); }}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      currentPage === p ? 'bg-primary text-white' : 'hover:bg-gray-200 text-muted'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => { setCurrentPage(p => p + 1); fetchClients(currentPage + 1); }}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Client Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-text">Tambah Pelanggan Baru</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-text"><X size={18}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form id="addClientForm" onSubmit={handleCreateSubmit} className="space-y-4">
                  {/* form fields same as before... (omitted for brevity but kept in code) */}
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Nama Lengkap</label>
                    <input type="text" required value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">WhatsApp</label>
                    <input type="text" required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" placeholder="628..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Alamat</label>
                    <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" rows="2"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Profil MikroTik</label>
                      <select value={formData.mikrotik_profile} onChange={e => {
                        const val = e.target.value;
                        const pkg = mikrotikProfiles.find(p => p.name === val);
                        setFormData({...formData, mikrotik_profile: val, monthly_fee: pkg ? pkg.monthly_fee : formData.monthly_fee});
                      }} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                        <option value="">Pilih Paket...</option>
                        {mikrotikProfiles.map(p => (
                          <option key={p.id} value={p.name}>{p.name} - Rp {p.monthly_fee.toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Biaya Bulanan (Rp)</label>
                      <input type="number" required value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Tanggal Jatuh Tempo (1-28)</label>
                      <input type="number" min="1" max="28" required value={formData.billing_cycle_date} onChange={e => setFormData({...formData, billing_cycle_date: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Auto Isolir (Tagihan)</label>
                      <select value={formData.auto_isolir} onChange={e => setFormData({...formData, auto_isolir: e.target.value === 'true'})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                        <option value="true">Ya, Isolir Otomatis</option>
                        <option value="false">Tidak (Beri Kelonggaran)</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-text bg-white border border-border rounded-lg">Batal</button>
                <button type="submit" form="addClientForm" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-70">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Details / Edit Modal */}
        {isDetailModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-text flex items-center gap-2">
                  {isEditMode ? 'Edit Pelanggan' : 'Detail Pelanggan'} 
                  {!isEditMode && clientDetails && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${clientDetails.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {clientDetails.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {!isEditMode && clientDetails?.is_active && (
                    <button onClick={handleDeactivate} className="text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1">
                      <PowerOff size={14}/> Nonaktifkan
                    </button>
                  )}
                  {!isEditMode && clientDetails && !clientDetails.is_active && (
                    <button onClick={handleActivate} className="text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1">
                      <CheckCircle size={14}/> Aktifkan
                    </button>
                  )}
                  {!isEditMode && (
                    <button onClick={() => setIsEditMode(true)} className="text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1">
                      <Edit size={14}/> Edit
                    </button>
                  )}
                  <button onClick={() => setIsDetailModalOpen(false)} className="text-muted hover:text-text ml-2"><X size={20}/></button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {loadingDetails ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Col: Info / Form */}
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 border-b pb-2">Informasi Profil</h4>
                      
                      {isEditMode ? (
                        <form id="editClientForm" onSubmit={handleUpdateSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-text mb-1">Nama Lengkap</label>
                            <input type="text" required value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text mb-1">WhatsApp</label>
                            <input type="text" required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text mb-1">Alamat</label>
                            <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" rows="3"></textarea>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-text mb-1">Profil MikroTik</label>
                              <select value={formData.mikrotik_profile} onChange={e => {
                                const val = e.target.value;
                                const pkg = mikrotikProfiles.find(p => p.name === val);
                                setFormData({...formData, mikrotik_profile: val, monthly_fee: pkg ? pkg.monthly_fee : formData.monthly_fee});
                              }} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                                {mikrotikProfiles.length === 0 ? (
                                  <option value="">Memuat...</option>
                                ) : (
                                  mikrotikProfiles.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-text mb-1">Biaya (Rp)</label>
                              <input type="number" required value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-text mb-1">Jatuh Tempo</label>
                              <input type="number" min="1" max="28" required value={formData.billing_cycle_date} onChange={e => setFormData({...formData, billing_cycle_date: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-text mb-1">Auto Isolir</label>
                              <select value={formData.auto_isolir} onChange={e => setFormData({...formData, auto_isolir: e.target.value === 'true'})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                                <option value="true">Ya (Otomatis)</option>
                                <option value="false">Tidak (Leluasa)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-text mb-1">Status</label>
                              <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                                <option value="true">Aktif</option>
                                <option value="false">Nonaktif (Isolir)</option>
                              </select>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div><p className="text-xs text-muted">ID Pelanggan</p><p className="font-mono text-sm">{clientDetails?.id}</p></div>
                          <div><p className="text-xs text-muted">Nama Lengkap</p><p className="font-medium">{clientDetails?.fullname}</p></div>
                          <div>
                            <p className="text-xs text-muted mb-1">WhatsApp</p>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-primary">{clientDetails?.whatsapp}</p>
                              <a href={`https://wa.me/${clientDetails?.whatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200 transition-colors" title="Hubungi WA">
                                <MessageCircle size={14} />
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted mb-1">Alamat</p>
                            <p className="text-sm bg-gray-50 p-2 rounded border">{clientDetails?.address}</p>
                            {clientDetails?.coordinates && (
                              <a href={`https://maps.google.com/?q=${clientDetails.coordinates}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded mt-2 border border-blue-100 hover:bg-blue-100 transition-colors">
                                <MapPin size={12}/> Buka di Google Maps
                              </a>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div><p className="text-xs text-blue-600/70">Profil</p><p className="font-bold text-blue-800">{clientDetails?.mikrotik_profile}</p></div>
                            <div><p className="text-xs text-blue-600/70">Biaya / Bulan</p><p className="font-bold text-blue-800">Rp {parseFloat(clientDetails?.monthly_fee).toLocaleString('id-ID')}</p></div>
                            <div><p className="text-xs text-blue-600/70">Jatuh Tempo</p><p className="font-bold text-blue-800">Tgl {clientDetails?.billing_cycle_date}</p></div>
                            <div><p className="text-xs text-blue-600/70">Terdaftar</p><p className="font-bold text-blue-800">{new Date(clientDetails?.created_at).toLocaleDateString('id-ID')}</p></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Col: History */}
                    {!isEditMode && (
                      <div className="flex-1 space-y-6">
                        {/* Invoices */}
                        <div>
                          <h4 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={16}/> 5 Tagihan Terakhir</h4>
                          {clientDetails?.recent_invoices?.length > 0 ? (
                            <div className="space-y-2">
                              {clientDetails.recent_invoices.slice(0, 5).map(inv => (
                                <div key={inv.id} className="flex justify-between items-center p-3 border border-border rounded-lg text-sm bg-gray-50">
                                  <div>
                                    <p className="font-medium">Rp {parseFloat(inv.amount).toLocaleString('id-ID')}</p>
                                    <p className="text-xs text-muted font-mono">{inv.id}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      inv.status === 'PAID' ? 'bg-green-100 text-green-800' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {inv.status === 'PAID' ? 'Lunas' : inv.status === 'OVERDUE' ? 'Jatuh Tempo' : 'Belum Lunas'}
                                    </span>
                                    <p className="text-[10px] text-muted mt-1 mb-1">{new Date(inv.due_date).toLocaleDateString('id-ID')}</p>
                                    {inv.status !== 'PAID' && (
                                      <a href={`https://wa.me/${clientDetails.whatsapp}?text=Halo%20Bapak/Ibu%20${encodeURIComponent(clientDetails.fullname)},%20berikut%20adalah%20pengingat%20tagihan%20internet%20Anda%20sebesar%20Rp%20${parseFloat(inv.amount).toLocaleString('id-ID')}%20dengan%20jatuh%20tempo%20tanggal%20${new Date(inv.due_date).toLocaleDateString('id-ID')}.%20Mohon%20segera%20melakukan%20pembayaran.`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-1 rounded hover:bg-green-200 transition-colors">
                                        <MessageCircle size={12}/> Ingatkan
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted italic bg-gray-50 p-4 rounded-lg text-center">Belum ada tagihan.</p>
                          )}
                        </div>

                        {/* Tickets */}
                        <div>
                          <h4 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2"><Wrench size={16}/> 5 Gangguan Terakhir</h4>
                          {clientDetails?.recent_tickets?.length > 0 ? (
                            <div className="space-y-2">
                              {clientDetails.recent_tickets.slice(0, 5).map(t => (
                                <div key={t.id} className="p-3 border border-border rounded-lg text-sm bg-gray-50">
                                  <div className="flex justify-between mb-1">
                                    <p className="font-medium truncate">{t.title}</p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.status === 'OPEN' ? 'bg-red-100 text-red-800' : t.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                      {t.status === 'OPEN' ? 'Terbuka' : t.status === 'IN_PROGRESS' ? 'Dikerjakan' : 'Selesai'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium'})}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted italic bg-gray-50 p-4 rounded-lg text-center">Belum ada riwayat gangguan.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {isEditMode && (
                <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditMode(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-text bg-white border border-border rounded-lg">Batal</button>
                  <button type="submit" form="editClientForm" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal & Print View */}
      {selectedQRClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center print:static print:bg-white print:z-auto">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setSelectedQRClient(null)}></div>
          
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-sm overflow-hidden z-10 print:shadow-none print:w-[300px] print:rounded-none">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center print:hidden">
              <h3 className="font-bold text-text">Stiker QR Code</h3>
              <button onClick={() => setSelectedQRClient(null)} className="text-muted hover:text-text"><X size={18}/></button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center bg-white border border-gray-200 m-4 rounded-lg print:m-0 print:border-2 print:border-black print:rounded-lg">
              <h2 className="font-bold text-xl mb-1 text-black">NetOps CRM</h2>
              <p className="text-sm text-gray-500 mb-6 font-medium border-b w-full pb-2">ID: {selectedQRClient.id}</p>
              
              <div className="bg-white p-2 rounded-lg mb-4">
                <QRCodeSVG value={selectedQRClient.qr_token} size={180} level="H" />
              </div>
              
              <h3 className="font-bold text-lg text-black">{selectedQRClient.fullname}</h3>
              <p className="text-gray-600 text-sm">{selectedQRClient.address}</p>
              <p className="text-gray-500 text-xs mt-4 pt-4 border-t w-full">Pindai via Aplikasi Teknisi untuk aktivasi/gangguan</p>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3 print:hidden">
              <button onClick={() => window.print()} className="w-full flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg">
                <Printer size={16} /> Cetak Stiker
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
