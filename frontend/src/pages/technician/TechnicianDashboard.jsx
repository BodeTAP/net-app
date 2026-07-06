import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QrCode, ClipboardList, Map, CheckCircle, Clock, Camera, Package, User, Search } from 'lucide-react';
import TechnicianLayout from '../../components/TechnicianLayout';
import CameraUpload from '../../components/CameraUpload';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    fetchTickets(userData.id, token);
  }, [navigate]);

  const fetchTickets = async (techId, token) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/tickets?technician_id=${techId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success') {
        const activeTickets = res.data.data.filter(t => t.status !== 'RESOLVED');
        setTickets(activeTickets);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/v1/tickets/${ticketId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTickets(user.id, token);
    } catch (error) {
      alert('Gagal mengupdate status tiket');
    }
  };

  const handleResolveWithPhoto = async (photoFile) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('status', 'RESOLVED');

      const res = await axios.put(`/api/v1/tickets/${resolvingTicketId}/resolve`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setIsCameraOpen(false);
      setResolvingTicketId(null);
      fetchTickets(user.id, token);
      alert('Tiket berhasil diselesaikan!');
    } catch (error) {
      alert('Gagal mengunggah foto dan menyelesaikan tiket');
    }
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <TechnicianLayout>
      <div className="p-4 pb-24">
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-border text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Scan QR Code</h2>
          <p className="text-sm text-muted mb-6">
            Scan stiker tiang ODP untuk mapping port, atau scan stiker Pelanggan untuk diagnostik jaringan.
          </p>
          <button 
            onClick={() => navigate('/technician/scan')}
            className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
          >
            Buka Kamera
          </button>
        </div>

        <h3 className="font-bold text-text mb-3 flex items-center gap-2">
          <ClipboardList size={18} /> Tiket Aktif Saya
        </h3>
        
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-sm text-muted py-4">Memuat tiket...</p>
          ) : tickets.length === 0 ? (
            <div className="bg-surface border border-dashed border-border rounded-xl p-6 text-center">
              <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm text-text font-bold">Semua Aman!</p>
              <p className="text-xs text-muted">Tidak ada tiket gangguan yang ditugaskan kepada Anda saat ini.</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                    {ticket.status === 'IN_PROGRESS' ? 'Sedang Dikerjakan' : 'Open'}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(ticket.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <h4 className="font-bold text-text text-sm mb-1">{ticket.title}</h4>
                {ticket.client_name && (
                  <div className="mb-1">
                    <p className="text-xs font-medium text-gray-700">Pelanggan: {ticket.client_name}</p>
                    {ticket.client_whatsapp && (
                      <a href={`https://wa.me/${ticket.client_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-green-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                        <User size={12} className="hidden" /> WA: {ticket.client_whatsapp}
                      </a>
                    )}
                  </div>
                )}
                {ticket.client_address && (
                  <p className="text-xs text-muted mt-1">{ticket.client_address}</p>
                )}
                
                {ticket.description && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {ticket.description}
                  </div>
                )}
                
                <div className="mt-4 space-y-2">
                  {ticket.status === 'OPEN' && (
                    <button 
                      onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                      className="w-full text-sm text-white font-medium bg-blue-600 py-2 rounded-lg active:bg-blue-700 flex justify-center items-center gap-2"
                    >
                      <Clock size={16} /> Kerjakan Sekarang
                    </button>
                  )}
                  {ticket.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => {
                        setResolvingTicketId(ticket.id);
                        setIsCameraOpen(true);
                      }}
                      className="w-full text-sm text-white font-medium bg-green-600 py-2 rounded-lg active:bg-green-700 flex justify-center items-center gap-2"
                    >
                      <Camera size={16} /> Ambil Foto & Selesai
                    </button>
                  )}
                  
                  {ticket.client_coordinates && (
                    <button 
                      onClick={() => {
                        try {
                          const coords = typeof ticket.client_coordinates === 'string' ? JSON.parse(ticket.client_coordinates) : ticket.client_coordinates;
                          openGoogleMaps(coords.y, coords.x);
                        } catch(e) {
                          alert('Format koordinat tidak valid');
                        }
                      }}
                      className="w-full text-sm text-blue-700 font-medium border border-blue-200 bg-blue-50 py-2 rounded-lg active:bg-blue-100 flex justify-center items-center gap-2"
                    >
                      <Map size={16} /> Rute Lokasi (Maps)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Camera Modal */}
      <CameraUpload 
        isOpen={isCameraOpen} 
        onClose={() => {
          setIsCameraOpen(false);
          setResolvingTicketId(null);
        }}
        onUpload={handleResolveWithPhoto}
        title={`Selesaikan Tiket #${resolvingTicketId}`}
      />
    </TechnicianLayout>
  );
}
