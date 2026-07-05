import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Server, CheckCircle, XCircle, Search, ChevronDown } from 'lucide-react';
import TechnicianLayout from '../../components/TechnicianLayout';

export default function ODPView() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = location.state?.data;

  const [odpData, setOdpData] = useState(initialData);
  const [assigningPort, setAssigningPort] = useState(null);
  const [releasingPort, setReleasingPort] = useState(null); // Contains port data
  const [clientId, setClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Client Search State
  const [clients, setClients] = useState([]);
  const [searchClient, setSearchClient] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/v1/clients?limit=9999&status=ACTIVE', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(res.data.data);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      }
    };
    fetchClients();
  }, []);

  if (!odpData) {
    return (
      <TechnicianLayout>
        <div className="p-4 text-center mt-20">
          <p className="text-muted">No ODP data found.</p>
          <button onClick={() => navigate('/technician/scan')} className="mt-4 bg-primary text-white px-4 py-2 rounded">Scan Again</button>
        </div>
      </TechnicianLayout>
    );
  }

  const { odp, ports } = odpData;

  const refreshData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/odps/scan/${odp.qr_token}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success') {
        setOdpData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to refresh ODP data", err);
    }
  };

  // Generate 8 ports array based on total_ports
  const totalPorts = odp.total_ports || 8;
  const portGrid = Array.from({ length: totalPorts }, (_, i) => {
    const portNum = i + 1;
    const existing = ports.find(p => p.port_number === portNum);
    return existing || { port_number: portNum, status: 'FREE' };
  });

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/odps/assign', {
        odp_id: odp.id,
        port_number: assigningPort,
        client_id: clientId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Port assigned successfully!');
      setAssigningPort(null);
      setClientId('');
      await refreshData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign port');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if(!confirm('Are you sure you want to release this port?')) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/odps/release', {
        odp_id: odp.id,
        port_number: releasingPort.port_number
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Port released successfully!');
      setReleasingPort(null);
      await refreshData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release port');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TechnicianLayout>
      <div className="p-4 pb-20">
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <Server className="text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">{odp.name}</h2>
            <p className="text-sm text-muted">ID: {odp.id}</p>
          </div>
        </div>

        <h3 className="font-bold text-text mb-4">Port Availability</h3>
        
        <div className="grid grid-cols-4 gap-3 mb-6">
          {portGrid.map(port => {
            const isFree = port.status === 'FREE';
            return (
              <div 
                key={port.port_number} 
                onClick={() => {
                  if (isFree) setAssigningPort(port.port_number);
                  else setReleasingPort(port);
                }}
                className={`flex flex-col items-center p-3 border rounded-xl shadow-sm transition-transform cursor-pointer hover:scale-105 hover:shadow-md ${
                  isFree ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-300 opacity-90'
                }`}
              >
                <span className="text-lg font-bold text-gray-800">{port.port_number}</span>
                {isFree ? (
                  <CheckCircle size={16} className="text-green-500 mt-1" />
                ) : (
                  <XCircle size={16} className="text-red-500 mt-1" />
                )}
              </div>
            )
          })}
        </div>

        <div className="text-sm text-muted bg-blue-50 p-3 rounded-lg border border-blue-100">
          <strong>Tip:</strong> Tap a <span className="text-green-600 font-bold">FREE</span> port to assign a new client installation.
        </div>
      </div>

      {assigningPort && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl animate-slide-up">
            <h3 className="font-bold text-lg mb-1">Assign Port {assigningPort}</h3>
            <p className="text-sm text-muted mb-4">Enter Client ID to connect them to this ODP port.</p>
            
            <form onSubmit={handleAssign}>
              <div className="relative mb-4">
                <div 
                  className="flex items-center border border-border rounded-lg px-3 py-2 bg-white cursor-text"
                  onClick={() => setShowDropdown(true)}
                >
                  <Search size={16} className="text-muted mr-2" />
                  <input 
                    type="text" 
                    placeholder="Cari Nama / ID Pelanggan..."
                    value={searchClient}
                    onChange={(e) => {
                      setSearchClient(e.target.value);
                      setShowDropdown(true);
                      setClientId(''); // Clear selected if typing
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="flex-1 outline-none text-sm bg-transparent"
                  />
                  <ChevronDown size={16} className="text-muted" />
                </div>
                
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clients.filter(c => c.fullname.toLowerCase().includes(searchClient.toLowerCase()) || c.id.toLowerCase().includes(searchClient.toLowerCase())).length === 0 ? (
                      <div className="p-3 text-sm text-muted text-center">Tidak ada pelanggan ditemukan</div>
                    ) : (
                      clients.filter(c => c.fullname.toLowerCase().includes(searchClient.toLowerCase()) || c.id.toLowerCase().includes(searchClient.toLowerCase())).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            setClientId(c.id);
                            setSearchClient(c.fullname);
                            setShowDropdown(false);
                          }}
                          className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${clientId === c.id ? 'bg-blue-50' : ''}`}
                        >
                          <p className="font-bold text-sm text-text">{c.fullname}</p>
                          <p className="text-xs font-mono text-muted">{c.id}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {clientId && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-2 rounded-lg text-xs font-medium mb-4 text-center">
                  Pelanggan Terpilih: {searchClient}
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setAssigningPort(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !clientId}
                  className="flex-1 py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-70"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {releasingPort && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl animate-slide-up">
            <h3 className="font-bold text-lg mb-1">Port {releasingPort.port_number} Occupied</h3>
            <p className="text-sm text-muted mb-4">This port is currently assigned to a client.</p>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 space-y-2">
              <div>
                <p className="text-sm text-blue-900 font-bold">{releasingPort.client_name}</p>
                <p className="text-xs text-blue-700 font-mono mt-0.5">{releasingPort.client_id}</p>
              </div>
              {releasingPort.address && (
                <div>
                  <p className="text-[10px] text-blue-600 uppercase font-semibold">Alamat</p>
                  <p className="text-xs text-blue-800 line-clamp-2">{releasingPort.address}</p>
                </div>
              )}
              {releasingPort.whatsapp && (
                <div>
                  <p className="text-[10px] text-blue-600 uppercase font-semibold">No. WhatsApp</p>
                  <p className="text-xs text-blue-800">{releasingPort.whatsapp}</p>
                </div>
              )}
              {releasingPort.client_status !== undefined && (
                <div className="pt-1">
                  <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded-full ${releasingPort.client_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {releasingPort.client_status ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setReleasingPort(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleRelease}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-70"
              >
                {isSubmitting ? 'Processing...' : 'Release Port'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TechnicianLayout>
  );
}
