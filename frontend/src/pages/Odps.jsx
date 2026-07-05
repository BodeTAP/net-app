import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Plus, List, Map as MapIcon, X, QrCode, Search, Server, Locate, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polygon, Polyline } from 'react-leaflet';
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

// Icon for ODC
const odcIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icon for Client
const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to handle map clicks for adding new entity
function MapClickHelper({ onMapClick, addingEntity }) {
  useMapEvents({
    click(e) {
      if (addingEntity) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Controller for flyTo animations
function MapFlyToController({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget && flyTarget.coordinates) {
      // Small offset to the left if the sidebar is open, but for now just center it
      map.flyTo([flyTarget.coordinates.y, flyTarget.coordinates.x], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [flyTarget, map]);
  return null;
}

// Custom locate button
function LocateButton() {
  const map = useMap();
  
  useEffect(() => {
    const onLocationError = (e) => {
      alert("Gagal mendeteksi lokasi Anda. Pastikan izin lokasi aktif.");
    };
    map.on('locationerror', onLocationError);
    return () => {
      map.off('locationerror', onLocationError);
    }
  }, [map]);

  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };
  
  return (
    <div className="leaflet-bottom leaflet-left mb-6 ml-2" style={{ position: 'absolute', zIndex: 1000, pointerEvents: 'auto' }}>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocate(); }} 
        className="bg-white p-2 rounded shadow-md border border-gray-200 hover:bg-gray-50 text-blue-600 flex items-center justify-center transition-colors" 
        title="Lokasi Saya"
      >
        <Locate size={20} />
      </button>
    </div>
  );
}

export default function Odps() {
  const [odps, setOdps] = useState([]);
  const [odcs, setOdcs] = useState([]);
  const [coverages, setCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // View mode
  const [viewMode, setViewMode] = useState('MAP'); // MAP or LIST
  
  // Layer Toggles
  const [layers, setLayers] = useState({
    odps: true,
    odcs: true,
    clients: true,
    coverages: true,
    topology: true
  });
  
  // Map Add Mode
  const [addingEntity, setAddingEntity] = useState(null); // null | 'ODP' | 'ODC' | 'COVERAGE' | 'CLIENT'
  const [newEntityLocation, setNewEntityLocation] = useState(null);
  const [drawingCoveragePoints, setDrawingCoveragePoints] = useState([]);
  
  // Modals & Selection
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedOdpDetails, setSelectedOdpDetails] = useState(null);
  const [selectedOdcDetails, setSelectedOdcDetails] = useState(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [qrModalOdp, setQrModalOdp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);

  // Port Management State
  const [clients, setClients] = useState([]);
  const [assigningPort, setAssigningPort] = useState(null);
  const [releasingPort, setReleasingPort] = useState(null);
  const [clientId, setClientId] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

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

  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/v1/clients?limit=9999&status=ACTIVE', { headers });
      setClients(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchODCs = async () => {
    try {
      const res = await axios.get('/api/v1/odcs', { headers });
      setOdcs(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCoverages = async () => {
    try {
      const res = await axios.get('/api/v1/coverages', { headers });
      setCoverages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOdps();
    fetchClients();
    fetchODCs();
    fetchCoverages();
  }, []);

  const handleMapClick = (latlng) => {
    if (addingEntity === 'ODP') {
      setNewEntityLocation(latlng);
      setAddingEntity(null);
      setIsCreateModalOpen(true);
    } else if (addingEntity === 'ODC') {
      setNewEntityLocation(latlng);
      setAddingEntity(null);
      setIsOdcModalOpen(true);
    } else if (addingEntity === 'COVERAGE') {
      setDrawingCoveragePoints([...drawingCoveragePoints, [latlng.lat, latlng.lng]]);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        total_ports: parseInt(formData.total_ports),
        coordinates: { lat: newEntityLocation.lat, lng: newEntityLocation.lng },
        odc_id: formData.odc_id || null
      };
      
      await axios.post('/api/v1/odps', payload, { headers });
      setIsCreateModalOpen(false);
      setNewEntityLocation(null);
      setFormData({ name: '', total_ports: 8, odc_id: '' });
      fetchOdps();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan ODP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOdcSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        total_ports: parseInt(formData.total_ports) || 16,
        coordinates: { lat: newEntityLocation.lat, lng: newEntityLocation.lng }
      };
      
      await axios.post('/api/v1/odcs', payload, { headers });
      setIsOdcModalOpen(false);
      setNewEntityLocation(null);
      setFormData({ name: '', total_ports: 16 });
      fetchODCs();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan ODC');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCoverage = async () => {
    if (drawingCoveragePoints.length < 3) {
      alert('Coverage area minimal membutuhkan 3 titik koordinat!');
      return;
    }
    setAddingEntity(null);
    setIsCoverageModalOpen(true);
  };

  const handleCreateCoverageSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        color: formData.color || '#3388ff',
        polygon_data: drawingCoveragePoints
      };
      
      await axios.post('/api/v1/coverages', payload, { headers });
      setIsCoverageModalOpen(false);
      setDrawingCoveragePoints([]);
      setFormData({ name: '', color: '#3388ff' });
      fetchCoverages();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan Coverage Area');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCoverage = () => {
    setAddingEntity(null);
    setDrawingCoveragePoints([]);
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

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!clientId) return;
    setIsSubmitting(true);
    try {
      await axios.post('/api/v1/odps/assign', {
        odp_id: selectedOdpDetails.odp.id,
        port_number: assigningPort,
        client_id: clientId
      }, { headers });
      
      alert('Port assigned successfully!');
      setAssigningPort(null);
      setClientId('');
      setSearchClient('');
      fetchOdpDetails(selectedOdpDetails.odp.id);
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
      await axios.post('/api/v1/odps/release', {
        odp_id: selectedOdpDetails.odp.id,
        port_number: releasingPort.port_number
      }, { headers });
      
      alert('Port released successfully!');
      setReleasingPort(null);
      fetchOdpDetails(selectedOdpDetails.odp.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release port');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOdps = odps.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewInMap = (odp) => {
    setViewMode('MAP');
    setFlyTarget({ ...odp, _ts: Date.now() });
    fetchOdpDetails(odp.id);
  };

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
          <div className="relative group">
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm ${
                addingEntity 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' 
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              <Plus size={16} /> {addingEntity ? `Mode Tambah ${addingEntity === 'COVERAGE' ? 'Area' : addingEntity}` : 'Tambah Aset'}
              <ChevronDown size={14} className="opacity-70" />
            </button>
            
            {/* Dropdown Menu */}
            {!addingEntity && (
              <div className="absolute right-0 top-full pt-1 w-56 hidden group-hover:block z-50">
                <div className="bg-white rounded-lg shadow-xl border border-gray-100 py-1">
                  <button 
                    onClick={() => { setViewMode('MAP'); setAddingEntity('ODP'); setNewEntityLocation(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    📍 Tambah Tiang ODP
                  </button>
                  <button 
                    onClick={() => { setViewMode('MAP'); setAddingEntity('ODC'); setNewEntityLocation(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    🖥️ Tambah Server ODC
                  </button>
                  <button 
                    onClick={() => { setViewMode('MAP'); setAddingEntity('COVERAGE'); setDrawingCoveragePoints([]); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    🗺️ Gambar Coverage Area
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {addingEntity && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          <p className="font-medium">
            📍 Mode Penambahan Aktif: {addingEntity === 'COVERAGE' ? 'Klik beberapa titik di peta untuk menggambar area batas.' : `Klik pada lokasi peta untuk menaruh ${addingEntity}.`}
          </p>
          <div className="flex gap-2">
            {addingEntity === 'COVERAGE' && drawingCoveragePoints.length > 2 && (
              <button onClick={handleSaveCoverage} className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-white font-medium transition-colors">Simpan Area</button>
            )}
            <button onClick={() => setAddingEntity(null)} className="px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded text-amber-900 font-medium transition-colors">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        
        {viewMode === 'MAP' ? (
          <div className="flex-1 relative flex min-h-0 overflow-hidden">
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
                  
                  {/* UX Controllers */}
                  <MapClickHelper onMapClick={handleMapClick} addingEntity={addingEntity} />
                  <MapFlyToController flyTarget={flyTarget} />
                  <LocateButton />
                  
                  {/* Layer Controls Panel */}
                  <div className="leaflet-top leaflet-right mt-2 mr-2" style={{ position: 'absolute', zIndex: 1000, pointerEvents: 'auto' }}>
                    <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
                      <h4 className="font-bold text-xs mb-2 text-gray-700">Tampilan Peta</h4>
                      <label className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                        <input type="checkbox" checked={layers.odps} onChange={() => setLayers(l => ({...l, odps: !l.odps}))} />
                        <span className="text-gray-800">📍 ODP (Tiang)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                        <input type="checkbox" checked={layers.odcs} onChange={() => setLayers(l => ({...l, odcs: !l.odcs}))} />
                        <span className="text-blue-800">🖥️ ODC (Pusat)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                        <input type="checkbox" checked={layers.clients} onChange={() => setLayers(l => ({...l, clients: !l.clients}))} />
                        <span className="text-green-800">🏠 Pelanggan</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                        <input type="checkbox" checked={layers.coverages} onChange={() => setLayers(l => ({...l, coverages: !l.coverages}))} />
                        <span className="text-purple-800">🗺️ Coverage Area</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={layers.topology} onChange={() => setLayers(l => ({...l, topology: !l.topology}))} />
                        <span className="text-orange-800">🔗 Garis Topologi Kabel</span>
                      </label>
                    </div>
                  </div>

                  {/* Dynamic Cursor Class */}
                  <style>{`
                    .leaflet-container {
                      cursor: ${addingEntity ? 'crosshair !important' : 'grab'};
                    }
                    .leaflet-container:active {
                      cursor: ${addingEntity ? 'crosshair !important' : 'grabbing'};
                    }
                  `}</style>
                  
                  {/* Drawing Coverage Line/Polygon */}
                  {addingEntity === 'COVERAGE' && drawingCoveragePoints.length > 0 && (
                    <Polygon 
                      positions={drawingCoveragePoints}
                      pathOptions={{ color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2, dashArray: '5, 5' }} 
                    />
                  )}
                  
                  {/* Coverage Areas */}
                  {layers.coverages && coverages.map(cov => (
                    <Polygon 
                      key={cov.id} 
                      positions={cov.polygon_data} 
                      pathOptions={{ color: cov.color || '#3388ff', fillColor: cov.color || '#3388ff', fillOpacity: 0.2 }}
                    >
                      <Popup>
                        <div className="font-bold">{cov.name}</div>
                      </Popup>
                    </Polygon>
                  ))}

                  {/* ODCs */}
                  {layers.odcs && odcs.map(odc => (
                    <Marker 
                      key={odc.id} 
                      position={[odc.coordinates.y, odc.coordinates.x]} 
                      icon={odcIcon}
                      eventHandlers={{
                        click: () => {
                          if (!addingEntity) {
                            setSelectedOdpDetails(null);
                            setSelectedClientDetails(null);
                            setSelectedOdcDetails(odc);
                            setFlyTarget({ coordinates: odc.coordinates, _ts: Date.now() });
                          }
                        }
                      }}
                    />
                  ))}

                  {/* Clients */}
                  {layers.clients && clients.filter(c => c.coordinates).map(client => (
                    <Marker 
                      key={client.id} 
                      position={[client.coordinates.y, client.coordinates.x]} 
                      icon={clientIcon}
                      eventHandlers={{
                        click: () => {
                          if (!addingEntity) {
                            setSelectedOdpDetails(null);
                            setSelectedOdcDetails(null);
                            setSelectedClientDetails(client);
                            setFlyTarget({ coordinates: client.coordinates, _ts: Date.now() });
                          }
                        }
                      }}
                    />
                  ))}

                  {/* Existing ODP Markers */}
                  {layers.odps && odps.map(odp => {
                    const lat = odp.coordinates.y; // Postgres POINT y = lat
                    const lng = odp.coordinates.x; // Postgres POINT x = lng
                    return (
                      <Marker 
                        key={odp.id} 
                        position={[lat, lng]}
                        eventHandlers={{
                          click: () => {
                            if (!addingEntity) {
                              setSelectedOdcDetails(null);
                              setSelectedClientDetails(null);
                              setSelectedOdpDetails(null);
                              setFlyTarget({ ...odp, _ts: Date.now() });
                              fetchOdpDetails(odp.id);
                            }
                          }
                        }}
                      />
                    );
                  })}

                  {/* New Entity Placement Marker */}
                  {newEntityLocation && (
                    <Marker position={[newEntityLocation.lat, newEntityLocation.lng]} icon={addingEntity === 'ODC' ? odcIcon : newOdpIcon} />
                  )}

                  {/* Network Topology Lines */}
                  {layers.topology && (
                    <>
                      {/* ODP -> ODC (Feeder Cables) */}
                      {odps.filter(odp => odp.odc_id).map(odp => {
                        const odc = odcs.find(o => o.id === odp.odc_id);
                        if (!odc) return null;
                        return (
                          <Polyline 
                            key={`link-${odp.id}-${odc.id}`}
                            positions={[
                              [odp.coordinates.y, odp.coordinates.x],
                              [odc.coordinates.y, odc.coordinates.x]
                            ]}
                            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '10, 10' }}
                          >
                            <Popup>
                              <div className="text-sm">Kabel Feeder:<br/><b>{odp.name}</b> ➔ <b>{odc.name}</b></div>
                            </Popup>
                          </Polyline>
                        );
                      })}

                      {/* Client -> ODP (Drop Core Cables) */}
                      {clients.filter(c => c.coordinates && c.odp_id).map(client => {
                        const odp = odps.find(o => o.id === client.odp_id);
                        if (!odp) return null;
                        return (
                          <Polyline 
                            key={`link-${client.id}-${odp.id}`}
                            positions={[
                              [client.coordinates.y, client.coordinates.x],
                              [odp.coordinates.y, odp.coordinates.x]
                            ]}
                            pathOptions={{ color: '#16a34a', weight: 2 }}
                          >
                            <Popup>
                              <div className="text-sm">Kabel Drop Core:<br/><b>{client.fullname}</b> ➔ <b>{odp.name}</b></div>
                            </Popup>
                          </Polyline>
                        );
                      })}
                    </>
                  )}
                </MapContainer>
              )}
            </div>

            {/* ODP Details Sidebar (Over Map) */}
            {selectedOdpDetails && (
              <div className="w-full md:w-96 bg-white border-l border-border flex flex-col absolute inset-y-0 right-0 z-20 md:static shadow-[-4px_0_15px_rgba(0,0,0,0.05)] h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50 flex-none">
                  <h3 className="font-bold text-text truncate pr-4">{selectedOdpDetails.odp.name}</h3>
                  <button onClick={() => setSelectedOdpDetails(null)} className="text-muted hover:text-text bg-white p-1 rounded-md border"><X size={16}/></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 min-h-0 relative">
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
                            
                            const isFree = !portData || portData.status === 'FREE';
                            return (
                              <div 
                                key={portNum} 
                                onClick={() => {
                                  if (isFree) setAssigningPort(portNum);
                                  else setReleasingPort(portData);
                                }}
                                className={`p-3 rounded-lg border text-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all ${
                                portData && portData.status === 'IN_USE' 
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                  : 'bg-white border-green-200 hover:bg-green-50'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    portData && portData.status === 'IN_USE' ? 'bg-blue-200 text-blue-800' : 'bg-green-100 text-green-700'
                                  }`}>
                                    P{portNum}
                                  </div>
                                  <div>
                                    {portData && portData.status === 'IN_USE' ? (
                                      <div className="flex flex-col">
                                        <p className="font-semibold text-blue-900">{portData.client_name}</p>
                                        <p className="text-xs text-blue-600 font-mono">{portData.client_id}</p>
                                        {portData.address && <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{portData.address}</p>}
                                      </div>
                                    ) : (
                                      <p className="text-green-600 font-medium">KOSONG (Klik untuk isi)</p>
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

            {/* ODC Details Sidebar (Over Map) */}
            {selectedOdcDetails && (
              <div className="w-full md:w-96 bg-white border-l border-border flex flex-col absolute inset-y-0 right-0 z-20 md:static shadow-[-4px_0_15px_rgba(0,0,0,0.05)] h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50 flex-none">
                  <h3 className="font-bold text-text truncate pr-4">{selectedOdcDetails.name}</h3>
                  <button onClick={() => setSelectedOdcDetails(null)} className="text-muted hover:text-text bg-white p-1 rounded-md border"><X size={16}/></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 min-h-0 relative">
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-3 rounded-lg border border-border text-sm space-y-2">
                      <div className="flex justify-between"><span className="text-muted">ID:</span> <span className="font-mono">{selectedOdcDetails.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Koordinat:</span> <span className="font-mono text-xs">{selectedOdcDetails.coordinates.y.toFixed(5)}, {selectedOdcDetails.coordinates.x.toFixed(5)}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Total Port:</span> <span className="font-bold text-blue-600">{selectedOdcDetails.total_ports}</span></div>
                      <div className="pt-2 mt-2 border-t flex gap-2">
                        <button className="flex-1 py-1.5 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50">Hapus ODC</button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-text mb-3 flex items-center gap-2"><Server size={16} /> Daftar ODP Terhubung</h4>
                      <div className="space-y-2">
                        {odps.filter(o => o.odc_id === selectedOdcDetails.id).length === 0 ? (
                          <p className="text-sm text-muted italic p-3 bg-gray-50 rounded text-center border">Belum ada ODP terhubung</p>
                        ) : (
                          odps.filter(o => o.odc_id === selectedOdcDetails.id).map(odp => (
                            <div key={odp.id} className="p-3 rounded-lg border bg-white border-blue-200 hover:bg-blue-50 cursor-pointer" onClick={() => { setSelectedOdcDetails(null); setSelectedOdpDetails(null); setFlyTarget({ ...odp, _ts: Date.now() }); fetchOdpDetails(odp.id); }}>
                              <p className="font-bold text-sm text-blue-900">{odp.name}</p>
                              <p className="text-xs text-blue-600 font-mono">{odp.id}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client Details Sidebar (Over Map) */}
            {selectedClientDetails && (
              <div className="w-full md:w-96 bg-white border-l border-border flex flex-col absolute inset-y-0 right-0 z-20 md:static shadow-[-4px_0_15px_rgba(0,0,0,0.05)] h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50 flex-none">
                  <h3 className="font-bold text-text truncate pr-4">{selectedClientDetails.fullname}</h3>
                  <button onClick={() => setSelectedClientDetails(null)} className="text-muted hover:text-text bg-white p-1 rounded-md border"><X size={16}/></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 min-h-0 relative">
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-3 rounded-lg border border-border text-sm space-y-2">
                      <div className="flex justify-between"><span className="text-muted">ID:</span> <span className="font-mono">{selectedClientDetails.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Status:</span> <span className={`font-bold ${selectedClientDetails.is_active ? 'text-green-600' : 'text-red-600'}`}>{selectedClientDetails.is_active ? 'AKTIF' : 'NONAKTIF'}</span></div>
                      <div className="flex justify-between"><span className="text-muted">WhatsApp:</span> <a href={`https://wa.me/${selectedClientDetails.whatsapp.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{selectedClientDetails.whatsapp}</a></div>
                      <div className="pt-2 mt-2 border-t">
                        <span className="text-muted block mb-1">Alamat:</span>
                        <p className="text-xs text-gray-700">{selectedClientDetails.address}</p>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted">Koordinat:</span> <span className="font-mono text-xs">{selectedClientDetails.coordinates.y.toFixed(5)}, {selectedClientDetails.coordinates.x.toFixed(5)}</span></div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-text mb-3 flex items-center gap-2"><MapPin size={16} /> Jalur Topologi</h4>
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        {selectedClientDetails.odp_id ? (
                          <div>
                            <p className="text-xs text-green-800 mb-1">Terhubung ke ODP:</p>
                            <p className="font-bold text-green-900 cursor-pointer hover:underline" onClick={() => { 
                               const odp = odps.find(o => o.id === selectedClientDetails.odp_id);
                               if (odp) {
                                 setSelectedClientDetails(null);
                                 setFlyTarget({ ...odp, _ts: Date.now() });
                                 fetchOdpDetails(odp.id);
                               }
                             }}>
                              {odps.find(o => o.id === selectedClientDetails.odp_id)?.name || selectedClientDetails.odp_id}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 italic">Belum terhubung ke ODP manapun (Drop Core belum ditarik).</p>
                        )}
                      </div>
                    </div>
                  </div>
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
                          <td className="p-4 text-right">
                          <button 
                            onClick={() => handleViewInMap(odp)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors mr-2"
                            title="Lihat di Peta"
                          >
                            <MapIcon size={18} />
                          </button>
                          <button 
                            onClick={() => setQrModalOdp(odp)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors mr-2"
                            title="Cetak Stiker QR"
                          >
                            <QrCode size={18} />
                          </button>
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
                  <p className="font-mono text-xs text-blue-700 mt-1">{newEntityLocation?.lat.toFixed(6)}, {newEntityLocation?.lng.toFixed(6)}</p>
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
                
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Hubungkan ke ODC Induk</label>
                  <select value={formData.odc_id || ''} onChange={e => setFormData({...formData, odc_id: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all cursor-pointer">
                    <option value="">-- Pilih ODC (Opsional) --</option>
                    {odcs.map(odc => (
                      <option key={odc.id} value={odc.id}>{odc.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">Mengaktifkan garis jaringan topologi kabel (Feeder).</p>
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
      {/* Assign Port Modal */}
      {assigningPort && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl animate-slide-up">
            <h3 className="font-bold text-lg mb-1">Assign Port {assigningPort}</h3>
            <p className="text-sm text-muted mb-4">Pilih pelanggan untuk dihubungkan ke port ODP ini.</p>
            
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
                      setClientId(''); 
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
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !clientId}
                  className="flex-1 py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-70"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Tugaskan Port'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add ODC */}
      {isOdcModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <Server size={18} className="text-blue-500"/> Detail ODC Baru
              </h3>
              <button onClick={() => setIsOdcModalOpen(false)} className="text-muted hover:text-text bg-white rounded-full p-1 border shadow-sm transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                <div className="mt-0.5 text-blue-500"><MapPin size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Koordinat Titik Terpilih</p>
                  <p className="font-mono text-xs text-blue-700 mt-1">{newEntityLocation?.lat.toFixed(6)}, {newEntityLocation?.lng.toFixed(6)}</p>
                </div>
              </div>
              
              <form onSubmit={handleCreateOdcSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text mb-1">Nama / Kode ODC</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-border rounded-lg p-2.5 bg-gray-50 focus:bg-white transition-colors" placeholder="Contoh: ODC-Utama-01"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text mb-1">Kapasitas (Port)</label>
                  <select value={formData.total_ports} onChange={(e) => setFormData({...formData, total_ports: e.target.value})} className="w-full border-border rounded-lg p-2.5 bg-gray-50 focus:bg-white transition-colors">
                    <option value="8">8 Port</option>
                    <option value="16">16 Port</option>
                    <option value="32">32 Port</option>
                    <option value="64">64 Port</option>
                    <option value="128">128 Port</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-border flex gap-3">
                  <button type="button" onClick={() => setIsOdcModalOpen(false)} className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan ODC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Coverage */}
      {isCoverageModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <MapIcon size={18} className="text-purple-500"/> Simpan Coverage Area
              </h3>
              <button onClick={handleCancelCoverage} className="text-muted hover:text-text bg-white rounded-full p-1 border shadow-sm transition-colors"><X size={16}/></button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-start gap-3">
                <div className="mt-0.5 text-purple-500"><MapPin size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-purple-900">Area Terpilih</p>
                  <p className="font-mono text-xs text-purple-700 mt-1">{drawingCoveragePoints.length} Titik Koordinat Batas</p>
                </div>
              </div>
              
              <form onSubmit={handleCreateCoverageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text mb-1">Nama Area / Wilayah</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-border rounded-lg p-2.5 bg-gray-50 focus:bg-white transition-colors" placeholder="Contoh: Perumahan Graha Asri"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text mb-1">Warna Poligon</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.color || '#3388ff'} onChange={(e) => setFormData({...formData, color: e.target.value})} className="w-12 h-10 rounded cursor-pointer" />
                    <input type="text" value={formData.color || '#3388ff'} onChange={(e) => setFormData({...formData, color: e.target.value})} className="flex-1 border-border rounded-lg p-2.5 bg-gray-50 font-mono text-sm" placeholder="#3388ff"/>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border flex gap-3">
                  <button type="button" onClick={handleCancelCoverage} className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Area'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Release Port Modal */}
      {releasingPort && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl animate-slide-up">
            <h3 className="font-bold text-lg mb-1">Port {releasingPort.port_number} Terisi</h3>
            <p className="text-sm text-muted mb-4">Port ini sedang digunakan oleh pelanggan berikut.</p>
            
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
                Tutup
              </button>
              <button 
                type="button"
                onClick={handleRelease}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-70"
              >
                {isSubmitting ? 'Memproses...' : 'Lepaskan Port'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
