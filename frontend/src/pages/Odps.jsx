import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Plus, List, Map as MapIcon, X, QrCode, Search, Server } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../components/Layout';

// Fix for default marker icons in Leaflet with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom red icon for new ODP placement
const newOdpIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to handle map clicks for adding new ODP
function MapClickHelper({ onMapClick, isAddingMode }) {
  useMapEvents({
    click(e) {
      if (isAddingMode) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function Odps() {
  const [odps, setOdps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // View mode
  const [viewMode, setViewMode] = useState('MAP'); // MAP or LIST
  
  // Map Add Mode
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newOdpLocation, setNewOdpLocation] = useState(null);
  
  // Modals & Selection
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOdpDetails, setSelectedOdpDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [qrModalOdp, setQrModalOdp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({ name: '', total_ports: 8 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchOdps = async () => {
    try {
      const res = await axios.get('/api/v1/odps', { headers });
      setOdps(res.data.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOdps();
  }, []);

  const handleMapClick = (latlng) => {
    setNewOdpLocation(latlng);
    setIsAddingMode(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        total_ports: parseInt(formData.total_ports),
        coordinates: { lat: newOdpLocation.lat, lng: newOdpLocation.lng }
      };
      
      await axios.post('/api/v1/odps', payload, { headers });
      setIsCreateModalOpen(false);
      setNewOdpLocation(null);
      setFormData({ name: '', total_ports: 8 });
      fetchOdps();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan ODP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchOdpDetails = async (id) => {
    setIsDetailsLoading(true);
    try {
      const res = await axios.get(`/api/v1/odps/${id}`, { headers });
      setSelectedOdpDetails(res.data.data);
    } catch (err) {
      alert('Gagal mengambil detail ODP');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm('Apakah Anda yakin ingin menghapus tiang ODP ini secara permanen?')) return;
    try {
      await axios.delete(`/api/v1/odps/${id}`, { headers });
      setSelectedOdpDetails(null);
      fetchOdps();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus ODP');
    }
  };

  const filteredOdps = odps.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Default Center (Jakarta)
  const defaultCenter = odps.length > 0 && odps[0].coordinates 
    ? [odps[0].coordinates.y, odps[0].coordinates.x] // Postgres POINT returns {x: lng, y: lat}
    : [-6.200000, 106.816666];

  return (
    <Layout>
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Server size={24} className="text-primary" /> Inventaris Tiang & ODP
          </h2>
          <p className="text-sm text-muted mt-1">Kelola dan petakan lokasi Optical Distribution Point (ODP).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-border p-1 rounded-lg flex shadow-sm">
            <button 
              onClick={() => setViewMode('MAP')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'MAP' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text'}`}
            >
              <MapIcon size={16} /> Peta
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text'}`}
            >
              <List size={16} /> Daftar
            </button>
          </div>
          <button 
            onClick={() => {
              setViewMode('MAP');
              setIsAddingMode(true);
              setNewOdpLocation(null);
              setSelectedOdpDetails(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm ${
              isAddingMode 
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' 
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            <Plus size={16} /> {isAddingMode ? 'Klik Peta untuk Menaruh Tiang' : 'Tambah ODP Baru'}
          </button>
        </div>
      </div>

      {isAddingMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          <p className="font-medium">📍 Mode Penambahan ODP Aktif: Klik pada lokasi peta yang diinginkan.</p>
          <button onClick={() => setIsAddingMode(false)} className="px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded text-amber-900 font-medium transition-colors">Batal</button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        
        {viewMode === 'MAP' ? (
          <div className="flex-1 relative flex">
            {/* Map Area */}
            <div className={`flex-1 relative ${selectedOdpDetails ? 'hidden md:block' : ''}`}>
              {!loading && (
                <MapContainer 
                  center={defaultCenter} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%', zIndex: 10 }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapClickHelper onMapClick={handleMapClick} isAddingMode={isAddingMode} />
                  
                  {/* Existing ODP Markers */}
                  {odps.map(odp => {
                    const lat = odp.coordinates.y; // Postgres POINT y = lat
                    const lng = odp.coordinates.x; // Postgres POINT x = lng
                    return (
                      <Marker 
                        key={odp.id} 
                        position={[lat, lng]}
                        eventHandlers={{
                          click: () => {
                            if (!isAddingMode) {
                              setSelectedOdpDetails(null);
                              fetchOdpDetails(odp.id);
                            }
                          }
                        }}
                      />
                    );
                  })}

                  {/* New ODP Placement Marker */}
                  {newOdpLocation && (
                    <Marker position={[newOdpLocation.lat, newOdpLocation.lng]} icon={newOdpIcon} />
                  )}
                </MapContainer>
              )}
            </div>

            {/* ODP Details Sidebar (Over Map) */}
            {selectedOdpDetails && (
              <div className="w-full md:w-96 bg-white border-l border-border flex flex-col absolute inset-y-0 right-0 z-20 md:static shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-text truncate pr-4">{selectedOdpDetails.odp.name}</h3>
                  <button onClick={() => setSelectedOdpDetails(null)} className="text-muted hover:text-text bg-white p-1 rounded-md border"><X size={16}/></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1">
                  {isDetailsLoading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-gray-50 p-3 rounded-lg border border-border text-sm space-y-2">
                        <div className="flex justify-between"><span className="text-muted">ID:</span> <span className="font-mono">{selectedOdpDetails.odp.id}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Koordinat:</span> <span className="font-mono text-xs">{selectedOdpDetails.odp.coordinates.y.toFixed(5)}, {selectedOdpDetails.odp.coordinates.x.toFixed(5)}</span></div>
                        <div className="flex justify-between"><span className="text-muted">Total Port:</span> <span className="font-bold text-primary">{selectedOdpDetails.odp.total_ports}</span></div>
                        <div className="flex gap-2 pt-2 border-t mt-2">
                          <button onClick={() => setQrModalOdp(selectedOdpDetails.odp)} className="flex-1 bg-white border border-border py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"><QrCode size={14}/> Lihat QR</button>
                          <button onClick={() => handleDelete(selectedOdpDetails.odp.id)} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-1.5 rounded text-xs font-medium hover:bg-red-100 transition-colors">Hapus Tiang</button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-text"><Server size={16}/> Pemetaan Port</h4>
                        <div className="space-y-2">
                          {Array.from({ length: selectedOdpDetails.odp.total_ports }).map((_, idx) => {
                            const portNum = idx + 1;
                            const portData = selectedOdpDetails.ports.find(p => p.port_number === portNum);
                            
                            return (
                              <div key={portNum} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${
                                portData && portData.status === 'IN_USE' 
                                  ? 'bg-blue-50 border-blue-100' 
                                  : 'bg-white border-border'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    portData && portData.status === 'IN_USE' ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    P{portNum}
                                  </div>
                                  <div>
                                    {portData && portData.status === 'IN_USE' ? (
                                      <>
                                        <p className="font-semibold text-blue-900">{portData.client_name}</p>
                                        <p className="text-xs text-blue-600 font-mono">{portData.client_id}</p>
                                      </>
                                    ) : (
                                      <p className="text-muted font-medium italic">KOSONG</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border bg-gray-50">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Cari ID atau Nama ODP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-muted border-b border-border sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama & ID ODP</th>
                    <th className="px-6 py-4 font-medium">Kapasitas Port</th>
                    <th className="px-6 py-4 font-medium">Koordinat</th>
                    <th className="px-6 py-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-8 text-center text-muted">Memuat...</td></tr>
                  ) : filteredOdps.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-8 text-center text-muted">Tidak ada data ODP ditemukan.</td></tr>
                  ) : (
                    filteredOdps.map(odp => {
                      const used = parseInt(odp.used_ports) || 0;
                      const total = odp.total_ports;
                      const percent = (used / total) * 100;
                      
                      return (
                        <tr key={odp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-text">{odp.name}</p>
                            <p className="font-mono text-xs text-muted mt-1">{odp.id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-muted">{used}/{total} Terisi</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-muted">
                            {odp.coordinates.y.toFixed(5)}, {odp.coordinates.x.toFixed(5)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => {
                                setViewMode('MAP');
                                fetchOdpDetails(odp.id);
                              }} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium border border-blue-100">
                                Lihat Peta
                              </button>
                              <button onClick={() => setQrModalOdp(odp)} className="p-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-border">
                                <QrCode size={16}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add ODP */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <MapPin size={18} className="text-primary"/> Detail ODP Baru
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-text bg-white rounded-full p-1 border shadow-sm transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                <div className="mt-0.5 text-blue-500"><MapPin size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Koordinat Titik Terpilih</p>
                  <p className="font-mono text-xs text-blue-700 mt-1">{newOdpLocation?.lat.toFixed(6)}, {newOdpLocation?.lng.toFixed(6)}</p>
                </div>
              </div>

              <form id="odpForm" onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Nama / Lokasi Tiang <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ODP-Mawar-01" className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Jumlah Port (Kapasitas) <span className="text-red-500">*</span></label>
                  <select required value={formData.total_ports} onChange={e => setFormData({...formData, total_ports: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all cursor-pointer">
                    <option value="4">4 Port (Kecil)</option>
                    <option value="8">8 Port (Standar)</option>
                    <option value="16">16 Port (Besar)</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-muted hover:text-text bg-white border border-border hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
              <button type="submit" form="odpForm" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm shadow-primary/30 disabled:opacity-70 transition-all">
                {isSubmitting ? 'Menyimpan...' : 'Simpan ODP'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* QR Code Modal (for printing) */}
      {qrModalOdp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm print:static print:bg-white print:p-0">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col print:shadow-none print:w-[300px] print:rounded-none">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50 print:hidden">
              <h3 className="font-bold text-lg text-text">QR Code Tiang</h3>
              <button onClick={() => setQrModalOdp(null)} className="text-muted hover:text-text bg-white rounded-full p-1 border shadow-sm transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center bg-white border border-gray-200 m-4 rounded-xl print:m-0 print:border-2 print:border-black print:rounded-lg">
              <h2 className="font-bold text-xl mb-1 text-black">NetOps CRM</h2>
              <p className="text-sm text-gray-500 mb-6 font-medium border-b w-full pb-2">{qrModalOdp.name}</p>
              
              <div className="bg-white p-2 rounded-lg mb-4">
                <QRCodeSVG value={qrModalOdp.qr_token} size={180} level="H" />
              </div>
              
              <h3 className="font-bold text-lg text-black font-mono">{qrModalOdp.id}</h3>
              <p className="text-gray-500 text-xs mt-4 pt-4 border-t w-full">Stiker ODP - Pindai menggunakan Aplikasi Teknisi</p>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex justify-end print:hidden">
              <button onClick={() => window.print()} className="w-full flex justify-center items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm shadow-primary/30 transition-all">
                Cetak Stiker Tiang
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
