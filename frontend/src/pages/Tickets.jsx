import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, X, Trash2, AlertCircle, Wrench, CheckCircle2, Clock } from 'lucide-react';
import Layout from '../components/Layout';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Dropdowns
  const [clientsList, setClientsList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form
  const [formData, setFormData] = useState({ client_id: '', title: '', description: '', assigned_technician_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/v1/tickets/summary', { headers });
      setSummary(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchTickets = async (page = 1) => {
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await axios.get('/api/v1/tickets', { headers, params });
      setTickets(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setCurrentPage(res.data.pagination.currentPage);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDropdowns = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        axios.get('/api/v1/tickets/clients', { headers }),
        axios.get('/api/v1/tickets/technicians', { headers }),
      ]);
      setClientsList(cRes.data.data);
      setTechniciansList(tRes.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSummary(); fetchDropdowns(); }, []);
  useEffect(() => { setCurrentPage(1); fetchTickets(1); }, [statusFilter, searchQuery]);

  const handleSearch = (e) => { e.preventDefault(); setSearchQuery(searchInput); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/v1/tickets', formData, { headers });
      setIsModalOpen(false);
      setFormData({ client_id: '', title: '', description: '', assigned_technician_id: '' });
      fetchTickets(currentPage);
      fetchSummary();
    } catch (err) { alert('Gagal membuat tiket'); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`/api/v1/tickets/${id}`, { status: newStatus }, { headers });
      fetchTickets(currentPage);
      fetchSummary();
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) { alert('Gagal mengubah status'); }
  };

  const handleAssign = async (id, techId) => {
    try {
      await axios.patch(`/api/v1/tickets/${id}`, { assigned_technician_id: techId || null }, { headers });
      fetchTickets(currentPage);
    } catch (err) { alert('Gagal menugaskan teknisi'); }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Hapus tiket #${id}?`)) return;
    try {
      await axios.delete(`/api/v1/tickets/${id}`, { headers });
      fetchTickets(currentPage);
      fetchSummary();
      setSelectedTicket(null);
    } catch (err) { alert('Gagal menghapus tiket'); }
  };

  const statusLabel = (s) => s === 'OPEN' ? 'Terbuka' : s === 'IN_PROGRESS' ? 'Dikerjakan' : 'Selesai';
  const statusColor = (s) => s === 'OPEN' ? 'bg-red-100 text-red-800' : s === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';
  const statusIcon = (s) => s === 'OPEN' ? <AlertCircle size={14} /> : s === 'IN_PROGRESS' ? <Wrench size={14} /> : <CheckCircle2 size={14} />;

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">Manajemen Tiket Gangguan</h2>
          <p className="text-sm text-muted mt-1">Catat, lacak, dan selesaikan keluhan pelanggan.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium shadow-sm transition-colors text-sm"
        >
          <Plus size={16} /> Buat Tiket
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Terbuka</p>
              <h3 className="text-2xl font-bold text-text">{summary.open_count}</h3>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Dikerjakan</p>
              <h3 className="text-2xl font-bold text-text">{summary.in_progress_count}</h3>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Selesai</p>
              <h3 className="text-2xl font-bold text-text">{summary.resolved_count}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari judul tiket atau nama pelanggan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary text-white' : 'bg-white text-muted border border-border hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'Semua' : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Judul Gangguan</th>
                <th className="px-6 py-3 font-medium">Pelanggan</th>
                <th className="px-6 py-3 font-medium">Teknisi</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Dibuat</th>
                <th className="px-6 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-muted">Memuat...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-muted">Tidak ada tiket ditemukan.</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted">#{t.id}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedTicket(t)} className="font-medium text-text hover:text-primary transition-colors text-left">
                        {t.title}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text text-xs">{t.client_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={t.assigned_technician_id || ''}
                        onChange={(e) => handleAssign(t.id, e.target.value)}
                        className="text-xs border border-border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">— Belum —</option>
                        {techniciansList.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.fullname}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(t.status)}`}>
                        {statusIcon(t.status)} {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {t.status === 'OPEN' && (
                          <button onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')} className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium border border-amber-200">
                            Kerjakan
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && (
                          <button onClick={() => handleStatusChange(t.id, 'RESOLVED')} className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium border border-green-200">
                            Selesai
                          </button>
                        )}
                        {t.status === 'RESOLVED' && (
                          <button onClick={() => handleStatusChange(t.id, 'OPEN')} className="px-2 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium border border-gray-200">
                            Buka Lagi
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)} className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs border border-red-200">
                          <Trash2 size={12} />
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
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50">
            <p className="text-xs text-muted">Menampilkan {tickets.length} dari {totalItems} tiket</p>
            <div className="flex items-center gap-1">
              <button onClick={() => { setCurrentPage(p => p - 1); fetchTickets(currentPage - 1); }} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setCurrentPage(p); fetchTickets(p); }} className={`w-8 h-8 rounded text-xs font-medium transition-colors ${currentPage === p ? 'bg-primary text-white' : 'hover:bg-gray-200 text-muted'}`}>{p}</button>
              ))}
              <button onClick={() => { setCurrentPage(p => p + 1); fetchTickets(currentPage + 1); }} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text">Buat Tiket Gangguan Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-text"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="createTicketForm" onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Judul Gangguan *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Internet mati total" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Pelanggan</label>
                  <select value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">— Pilih Pelanggan (Opsional) —</option>
                    {clientsList.map(c => (<option key={c.id} value={c.id}>{c.fullname}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Deskripsi</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" placeholder="Jelaskan detail gangguan..." className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Tugaskan ke Teknisi</label>
                  <select value={formData.assigned_technician_id} onChange={e => setFormData({...formData, assigned_technician_id: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">— Belum Ditugaskan —</option>
                    {techniciansList.map(t => (<option key={t.id} value={t.id}>{t.fullname}</option>))}
                  </select>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted bg-white border border-border rounded-lg">Batal</button>
              <button type="submit" form="createTicketForm" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-70">
                {isSubmitting ? 'Menyimpan...' : 'Buat Tiket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedTicket(null)}></div>
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text">Detail Tiket #{selectedTicket.id}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-muted hover:text-text"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-muted mb-1">Judul</p>
                <p className="font-bold text-text">{selectedTicket.title}</p>
              </div>
              {selectedTicket.description && (
                <div>
                  <p className="text-xs text-muted mb-1">Deskripsi</p>
                  <p className="text-sm text-text bg-gray-50 p-3 rounded-lg">{selectedTicket.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">Pelanggan</p>
                  <p className="text-sm font-medium text-text">{selectedTicket.client_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">WhatsApp</p>
                  <p className="text-sm text-text">{selectedTicket.client_whatsapp || '-'}</p>
                </div>
              </div>
              {selectedTicket.client_address && (
                <div>
                  <p className="text-xs text-muted mb-1">Alamat</p>
                  <p className="text-sm text-text">{selectedTicket.client_address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(selectedTicket.status)}`}>
                    {statusIcon(selectedTicket.status)} {statusLabel(selectedTicket.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Teknisi</p>
                  <p className="text-sm font-medium text-text">{selectedTicket.technician_name || 'Belum ditugaskan'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Tanggal Dibuat</p>
                <p className="text-sm text-text">{new Date(selectedTicket.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {selectedTicket.closing_photo_url && (
                <div className="col-span-1 md:col-span-2 mt-2">
                  <p className="text-xs text-muted mb-2">Foto Bukti Pekerjaan</p>
                  <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={`http://localhost:3000${selectedTicket.closing_photo_url}`} 
                      alt="Bukti Pekerjaan" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex gap-2 justify-end">
              {selectedTicket.status === 'OPEN' && (
                <button onClick={() => { handleStatusChange(selectedTicket.id, 'IN_PROGRESS'); }} className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg">Kerjakan</button>
              )}
              {selectedTicket.status === 'IN_PROGRESS' && (
                <button onClick={() => { handleStatusChange(selectedTicket.id, 'RESOLVED'); }} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">Selesai</button>
              )}
              <button onClick={() => handleDelete(selectedTicket.id)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200">
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
