import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Wrench, PlusCircle, CheckCircle, Clock } from 'lucide-react';
import ClientLayout from '../../components/ClientLayout';

export default function ClientTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // New ticket state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) {
      navigate('/client/login');
      return;
    }
    fetchTickets(token);
  }, [navigate]);

  const fetchTickets = async (token) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/client-app/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success') {
        setTickets(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('clientToken');
        navigate('/client/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('clientToken');
      const res = await axios.post('/api/v1/client-app/tickets', 
        { title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.status === 'success') {
        setShowModal(false);
        setTitle('');
        setDescription('');
        // Refresh list
        fetchTickets(token);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap = {
    'OPEN': { label: 'Menunggu Teknisi', color: 'bg-amber-100 text-amber-800' },
    'IN_PROGRESS': { label: 'Sedang Dikerjakan', color: 'bg-blue-100 text-blue-800' },
    'RESOLVED': { label: 'Selesai', color: 'bg-green-100 text-green-800' },
  };

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pt-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pusat Bantuan</h2>
            <p className="text-sm text-gray-500 mt-1">Lapor jika ada gangguan jaringan</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
          >
            <PlusCircle size={24} />
          </button>
        </div>

        {/* Modal Create Ticket */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Buat Laporan Baru</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jenis Gangguan</label>
                  <select 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium outline-none appearance-none"
                  >
                    <option value="" disabled>Pilih Jenis Gangguan...</option>
                    <option value="Lampu LOS Merah">Lampu Modem LOS Merah</option>
                    <option value="Koneksi Internet Lambat">Koneksi Internet Lambat</option>
                    <option value="Internet Mati (Tidak ada Merah)">Internet Mati Total</option>
                    <option value="Kabel Putus / Tiang Roboh">Kabel Putus / Masalah Fisik</option>
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Detail Tambahan (Opsional)</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    placeholder="Contoh: Kabel ditarik truk..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium outline-none resize-none"
                  ></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-70 flex justify-center items-center"
                  >
                    {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wrench size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-800">Tidak Ada Riwayat Gangguan</p>
            <p className="text-xs text-gray-500 mt-1">Koneksi internet Anda terpantau aman.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1 ${statusMap[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {ticket.status === 'RESOLVED' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                    {statusMap[ticket.status]?.label || ticket.status}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(ticket.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                
                <h4 className="font-bold text-gray-900 text-sm mt-1">{ticket.title}</h4>
                {ticket.description && (
                  <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 p-2 rounded-lg">{ticket.description}</p>
                )}
                
                {ticket.status === 'IN_PROGRESS' && (
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex items-center gap-2 text-xs font-semibold text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Teknisi sedang menangani masalah ini
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
