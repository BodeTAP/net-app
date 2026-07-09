import { useEffect, useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Search, Filter, ChevronLeft, ChevronRight, Trash2, Download, X, AlertTriangle, DollarSign, Clock, MessageCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/v1/invoices/summary', { headers });
      setSummary(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async (page = 1) => {
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await axios.get('/api/v1/invoices', { headers, params });
      setInvoices(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setCurrentPage(res.data.pagination.currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchInvoices(1);
  }, [statusFilter, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleRunBilling = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post('/api/v1/invoices/generate', {}, { headers });
      alert(res.data.message);
      fetchInvoices(currentPage);
      fetchSummary();
    } catch (err) {
      alert('Gagal mencetak tagihan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePayment = async (id) => {
    try {
      await axios.post(`/api/v1/invoices/${id}/simulate-payment`, {}, { headers });
      fetchInvoices(currentPage);
      fetchSummary();
      setSelectedInvoice(null);
    } catch (err) {
      alert('Gagal memproses pembayaran');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan tagihan ${id}?`)) return;
    try {
      await axios.delete(`/api/v1/invoices/${id}`, { headers });
      fetchInvoices(currentPage);
      fetchSummary();
      setSelectedInvoice(null);
    } catch (err) {
      alert('Gagal membatalkan tagihan');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      params.limit = 99999;
      params.page = 1;

      const res = await axios.get('/api/v1/invoices', { headers, params });
      const data = res.data.data;

      if (data.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
      }

      // Use semicolons for Excel compatibility (Windows/ID locale)
      const sep = ';';
      const csvHeader = ['ID Tagihan', 'Pelanggan', 'WhatsApp', 'Jatuh Tempo', 'Jumlah (Rp)', 'Status', 'Tanggal Bayar'].join(sep);
      const csvRows = data.map(inv => {
        const dueDate = new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const paidAt = inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
        const status = inv.status === 'PAID' ? 'Lunas' : inv.status === 'OVERDUE' ? 'Jatuh Tempo' : 'Belum Lunas';
        const amount = parseFloat(inv.amount).toLocaleString('id-ID');
        return [inv.id, inv.fullname, `'${inv.whatsapp}`, dueDate, amount, status, paidAt].join(sep);
      });

      // Add BOM for UTF-8 Excel compatibility
      const bom = '\uFEFF';
      const csv = bom + csvHeader + '\n' + csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rekap-tagihan-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengekspor data.');
    }
  };

  const statusLabel = (s) => {
    if (s === 'PAID') return 'Lunas';
    if (s === 'OVERDUE') return 'Jatuh Tempo';
    return 'Belum Lunas';
  };

  const statusColor = (s) => {
    if (s === 'PAID') return 'bg-green-100 text-green-800';
    if (s === 'OVERDUE') return 'bg-red-100 text-red-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-text">Tagihan & Pembayaran</h2>
          <p className="text-sm text-muted mt-1">Kelola tagihan bulanan dan pembayaran pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white text-text border border-border rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            <Download size={16} /> Unduh CSV
          </button>
          <button
            onClick={handleRunBilling}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium shadow-sm transition-colors disabled:opacity-70 text-sm"
          >
            <Play size={16} fill="currentColor" /> {isGenerating ? 'Memproses...' : 'Jalankan Mesin Tagihan'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Belum Lunas</p>
              <h3 className="text-xl font-bold text-text">{summary.unpaid_count} tagihan</h3>
              <p className="text-xs text-amber-600 font-medium">Rp {parseFloat(summary.unpaid_total).toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Jatuh Tempo</p>
              <h3 className="text-xl font-bold text-text">{summary.overdue_count} tagihan</h3>
              <p className="text-xs text-red-600 font-medium">Rp {parseFloat(summary.overdue_total).toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Pendapatan Bulan Ini</p>
              <h3 className="text-xl font-bold text-text">Rp {parseFloat(summary.paid_this_month).toLocaleString('id-ID')}</h3>
              <p className="text-xs text-green-600 font-medium">{summary.paid_count} tagihan lunas</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari nama pelanggan atau ID tagihan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          {['ALL', 'UNPAID', 'OVERDUE', 'PAID'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted border border-border hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'Semua' : s === 'UNPAID' ? 'Belum Lunas' : s === 'OVERDUE' ? 'Jatuh Tempo' : 'Lunas'}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">ID Tagihan</th>
                <th className="px-6 py-3 font-medium">Pelanggan</th>
                <th className="px-6 py-3 font-medium">Jatuh Tempo</th>
                <th className="px-6 py-3 font-medium">Jumlah</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-muted">Memuat...</td></tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'Tidak ada tagihan yang sesuai filter.'
                      : 'Belum ada tagihan. Klik "Jalankan Mesin Tagihan" untuk mencetak.'}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted">{inv.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text">{inv.fullname}</div>
                      <div className="text-xs text-muted">{inv.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4 text-text">{new Date(inv.due_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 font-medium text-text">Rp {parseFloat(inv.amount).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(inv.status)}`}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 print:hidden">
                      <div className="flex gap-1">
                        {inv.status !== 'PAID' && (
                          <>
                            <button
                              onClick={() => handlePayment(inv.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors text-xs font-medium border border-green-200"
                              title="Bayar Manual"
                            >
                              <CheckCircle size={12} />
                            </button>
                            <a
                              href={`https://wa.me/${inv.whatsapp}?text=Halo%20Bapak/Ibu%20${encodeURIComponent(inv.fullname)},%20berikut%20adalah%20pengingat%20tagihan%20internet%20Anda%20(ID:%20${inv.id})%20sebesar%20Rp%20${parseFloat(inv.amount).toLocaleString('id-ID')}%20dengan%20jatuh%20tempo%20tanggal%20${new Date(inv.due_date).toLocaleDateString('id-ID')}.%20Mohon%20segera%20melakukan%20pembayaran.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium border border-blue-200"
                              title="Kirim Pengingat WA"
                            >
                              <MessageCircle size={12} />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium border border-blue-200"
                        >
                          Detail
                        </button>
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-medium border border-red-200"
                          >
                            <Trash2 size={12} />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50 print:hidden">
            <p className="text-xs text-muted">
              Menampilkan {invoices.length} dari {totalItems} tagihan
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setCurrentPage(p => p - 1); fetchInvoices(currentPage - 1); }}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => { setCurrentPage(p); fetchInvoices(p); }}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    currentPage === p ? 'bg-primary text-white' : 'hover:bg-gray-200 text-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => { setCurrentPage(p => p + 1); fetchInvoices(currentPage + 1); }}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedInvoice(null)}></div>
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text">Detail Tagihan</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted">ID Tagihan</span>
                <span className="text-sm font-mono font-medium text-text">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Pelanggan</span>
                <span className="text-sm font-medium text-text">{selectedInvoice.fullname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">WhatsApp</span>
                <span className="text-sm text-text">{selectedInvoice.whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Jumlah</span>
                <span className="text-sm font-bold text-text">Rp {parseFloat(selectedInvoice.amount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Jatuh Tempo</span>
                <span className="text-sm text-text">{new Date(selectedInvoice.due_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(selectedInvoice.status)}`}>
                  {statusLabel(selectedInvoice.status)}
                </span>
              </div>
              {selectedInvoice.paid_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Tanggal Bayar</span>
                  <span className="text-sm text-green-600 font-medium">{new Date(selectedInvoice.paid_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted">Dibuat</span>
                <span className="text-sm text-text">{new Date(selectedInvoice.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex gap-2 justify-end">
              {selectedInvoice.status !== 'PAID' && (
                <>
                  <button
                    onClick={() => handleDelete(selectedInvoice.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                  >
                    <Trash2 size={14} /> Batalkan
                  </button>
                  <button
                    onClick={() => handlePayment(selectedInvoice.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                  >
                    <CheckCircle size={14} /> Bayar Sekarang
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
