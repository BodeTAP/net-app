import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Signal, Zap, AlertTriangle, MapPin, Loader } from 'lucide-react';
import axios from 'axios';
import TechnicianLayout from '../../components/TechnicianLayout';

export default function ClientStatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data;
  
  const [updatingGps, setUpdatingGps] = useState(false);

  if (!data) {
    return (
      <TechnicianLayout>
        <div className="p-4 text-center mt-20">
          <p className="text-muted">No data found. Please scan again.</p>
          <button onClick={() => navigate('/technician/scan')} className="mt-4 bg-primary text-white px-4 py-2 rounded">Scan Again</button>
        </div>
      </TechnicianLayout>
    );
  }

  const { client, diagnostics } = data;
  const isOnline = diagnostics.status === 'ONLINE';

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokasi tidak didukung oleh browser Anda");
      return;
    }

    setUpdatingGps(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`/api/v1/clients/${client.id}/location`, {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Lokasi pelanggan berhasil diperbarui!');
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal memperbarui lokasi');
      } finally {
        setUpdatingGps(false);
      }
    }, (error) => {
      setUpdatingGps(false);
      alert('Gagal mendapatkan lokasi GPS: ' + error.message);
    }, { enableHighAccuracy: true });
  };

  return (
    <TechnicianLayout>
      <div className="p-4 pb-20">
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-text">{client.fullname}</h2>
              <p className="text-xs text-muted font-mono">{client.id}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {diagnostics.status}
            </span>
          </div>
          <div className="text-sm text-muted mb-2">
            <strong>Address:</strong> {client.address}
          </div>
          <div className="text-sm text-muted">
            <strong>MikroTik Profile:</strong> <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{client.mikrotik_profile}</span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={handleUpdateLocation}
              disabled={updatingGps}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2.5 rounded-lg font-medium transition-colors border border-blue-200"
            >
              {updatingGps ? <Loader size={18} className="animate-spin" /> : <MapPin size={18} />}
              {updatingGps ? 'Mendeteksi GPS...' : 'Set Lokasi Saat Ini (GPS)'}
            </button>
          </div>
        </div>

        <h3 className="font-bold text-text mb-3">Live Diagnostics (OLT)</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col items-center">
            <Signal size={24} className={isOnline ? 'text-green-500 mb-2' : 'text-gray-400 mb-2'} />
            <p className="text-xs text-muted">Rx Power</p>
            <p className="text-lg font-bold text-text">{diagnostics.rxPower}</p>
          </div>
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col items-center">
            <Activity size={24} className={isOnline ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
            <p className="text-xs text-muted">Ping</p>
            <p className="text-lg font-bold text-text">{diagnostics.ping}</p>
          </div>
        </div>

        {parseFloat(diagnostics.rxPower) < -24 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start mb-6">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Redaman sangat tinggi (&lt; -24 dBm). Periksa lekukan kabel drop core atau konektor fast-con.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button className="flex-1 bg-surface border border-border text-text py-3 rounded-lg font-medium hover:bg-gray-50 flex justify-center items-center gap-2">
            <Zap size={18} /> Reboot ONT
          </button>
          <button className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-hover shadow-md shadow-primary/20">
            Open Ticket
          </button>
        </div>
      </div>
    </TechnicianLayout>
  );
}
