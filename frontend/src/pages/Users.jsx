import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Filter, Shield, Edit, PowerOff, X, User as UserIcon } from 'lucide-react';
import Layout from '../components/Layout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Form states
  const [formData, setFormData] = useState({
    username: '', fullname: '', role: 'TECHNICIAN', password: '', is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = async () => {
    if (!token) return navigate('/login');
    if (currentUser.role !== 'SUPERADMIN') return navigate('/dashboard');

    try {
      const res = await axios.get('/api/v1/users', { headers });
      setUsers(res.data.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/v1/users', formData, { headers });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah karyawan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Don't send empty password

      await axios.patch(`/api/v1/users/${selectedUser.id}`, payload, { headers });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui karyawan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan akun ini?')) return;
    try {
      await axios.delete(`/api/v1/users/${id}`, { headers });
      fetchUsers();
    } catch (err) {
      alert('Gagal menonaktifkan karyawan.');
    }
  };

  const openCreateModal = () => {
    setFormData({ username: '', fullname: '', role: 'TECHNICIAN', password: '', is_active: true });
    setIsEditMode(false);
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({ 
      username: user.username, 
      fullname: user.fullname, 
      role: user.role, 
      password: '', // Blank by default, only fill to reset
      is_active: user.is_active 
    });
    setIsEditMode(true);
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = u.fullname.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleLabel = (r) => {
    if (r === 'SUPERADMIN') return 'Super Admin';
    if (r === 'ADMIN_BILLING') return 'Admin Keuangan';
    if (r === 'TECHNICIAN') return 'Teknisi Lapangan';
    return r;
  };

  const roleColor = (r) => {
    if (r === 'SUPERADMIN') return 'bg-purple-100 text-purple-800';
    if (r === 'ADMIN_BILLING') return 'bg-blue-100 text-blue-800';
    if (r === 'TECHNICIAN') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (currentUser.role !== 'SUPERADMIN') return null;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Shield size={24} className="text-primary" /> Manajemen Karyawan & Akses
          </h2>
          <p className="text-sm text-muted mt-1">Kelola akun karyawan dan hak akses (RBAC) ke dalam sistem.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Tambah Akun
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari nama atau username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter size={16} className="text-muted shrink-0" />
          {['ALL', 'SUPERADMIN', 'ADMIN_BILLING', 'TECHNICIAN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                roleFilter === r ? 'bg-primary text-white shadow-sm' : 'bg-white text-muted border border-border hover:bg-gray-50'
              }`}
            >
              {r === 'ALL' ? 'Semua Role' : roleLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Karyawan</th>
                <th className="px-6 py-4 font-medium">Username</th>
                <th className="px-6 py-4 font-medium">Hak Akses (Role)</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted">Memuat...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted">Tidak ada akun karyawan ditemukan.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {u.fullname.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-text">{u.fullname}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted text-xs">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border border-transparent ${roleColor(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Karyawan"
                        >
                          <Edit size={16} />
                        </button>
                        {u.is_active && u.id !== currentUser.id && (
                          <button 
                            onClick={() => handleDeactivate(u.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Nonaktifkan Akun"
                          >
                            <PowerOff size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <UserIcon size={18} className="text-primary"/> 
                {isEditMode ? 'Edit Akun Karyawan' : 'Buat Akun Karyawan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-text bg-white rounded-full p-1 border shadow-sm transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="userForm" onSubmit={isEditMode ? handleUpdateSubmit : handleCreateSubmit} className="space-y-4">
                {!isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Username Login <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} placeholder="johndoe" className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all" />
                    <p className="text-[10px] text-muted mt-1">Username tidak bisa diubah setelah dibuat.</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} placeholder="John Doe" className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Hak Akses (Role) <span className="text-red-500">*</span></label>
                  <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all cursor-pointer">
                    <option value="TECHNICIAN">Teknisi Lapangan (Hanya App Teknisi)</option>
                    <option value="ADMIN_BILLING">Admin Keuangan (Tidak akses Jaringan & Karyawan)</option>
                    <option value="SUPERADMIN">Super Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {isEditMode ? 'Ganti Password (Opsional)' : 'Password Awal *'}
                  </label>
                  <input 
                    type="password" 
                    required={!isEditMode} 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder={isEditMode ? "Kosongkan jika tidak ingin ganti" : "Minimal 6 karakter"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all" 
                  />
                  {isEditMode && <p className="text-[10px] text-amber-600 mt-1">Isi hanya jika karyawan lupa password mereka.</p>}
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Status Akun</label>
                    <select required value={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})} className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all cursor-pointer">
                      <option value="true">Aktif (Bisa Login)</option>
                      <option value="false">Nonaktif (Diblokir)</option>
                    </select>
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-muted hover:text-text bg-white border border-border hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
              <button type="submit" form="userForm" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm shadow-primary/30 disabled:opacity-70 transition-all">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
