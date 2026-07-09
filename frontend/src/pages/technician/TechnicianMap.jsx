import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { Server, MapPin, Navigation, Activity, X, Map, Box, User } from 'lucide-react';
import TechnicianLayout from '../../components/TechnicianLayout';
import 'leaflet/dist/leaflet.css';

import { renderToStaticMarkup } from 'react-dom/server';

// Custom Icons using Lucide and divIcon (Reliable, no external images needed)
const createDivIcon = (IconComponent, color, bg) => {
  return new L.divIcon({
    className: 'custom-div-icon',
    html: renderToStaticMarkup(
      <div style={{ backgroundColor: bg, color: color, padding: '4px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
        <IconComponent size={16} />
      </div>
    ),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const odpIcon = createDivIcon(MapPin, 'white', '#3b82f6'); // blue
const odcIcon = createDivIcon(Box, 'white', '#f97316'); // orange
const clientIcon = createDivIcon(User, 'white', '#22c55e'); // green

// Component to recenter map
function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 16);
    }
  }, [location, map]);
  return null;
}

export default function TechnicianMap() {
  const navigate = useNavigate();
  const [odps, setOdps] = useState([]);
  const [odcs, setOdcs] = useState([]);
  const [clients, setClients] = useState([]);
  const [coverages, setCoverages] = useState([]);
  
  const [userLocation, setUserLocation] = useState(null);
  
  // Selection
  const [selectedOdp, setSelectedOdp] = useState(null);
  const [selectedOdc, setSelectedOdc] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, []);

  const fetchData = async () => {
    try {
      const [odpRes, odcRes, clientRes, covRes] = await Promise.all([
        axios.get('/api/v1/odps', { headers }).catch(e => { console.error('ODP Error', e); return { data: { data: [] } }; }),
        axios.get('/api/v1/odcs', { headers }).catch(e => { console.error('ODC Error', e); return { data: { data: [] } }; }),
        axios.get('/api/v1/clients?limit=9999', { headers }).catch(e => { console.error('Client Error', e); return { data: { data: [] } }; }),
        axios.get('/api/v1/coverages', { headers }).catch(e => { console.error('Coverage Error', e); return { data: { data: [] } }; })
      ]);

      setOdps(odpRes.data?.data || []);
      setOdcs(odcRes.data?.data || []);
      setClients(clientRes.data?.data || []);
      setCoverages(covRes.data?.data || []);
    } catch (err) {
      console.error("Gagal memuat data GIS:", err);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Gagal mendapatkan lokasi GPS:", error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const defaultCenter = userLocation || [-6.200000, 106.816666];

  const handleOdpAction = async (odp) => {
    try {
      const res = await axios.get(`/api/v1/odps/scan/${odp.qr_token}`, { headers });
      if (res.data.status === 'success') {
        navigate(`/technician/odp/${odp.qr_token}`, { state: { data: res.data.data } });
      }
    } catch (err) {
      alert("Gagal memuat detail ODP.");
    }
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleClientAction = async (client) => {
    try {
      const res = await axios.get(`/api/v1/scan/client/${client.qr_token}/status`, { headers });
      if (res.data.status === 'success') {
        navigate(`/technician/client/${client.qr_token}`, { state: { data: res.data.data } });
      }
    } catch (err) {
      alert("Gagal memuat diagnostik pelanggan.");
    }
  };

  return (
    <TechnicianLayout>
      <div className="relative w-full h-[calc(100vh-130px)] overflow-hidden">
        <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <RecenterMap location={userLocation} />}

          {/* User Location Marker */}
          {userLocation && (
            <Marker 
              position={userLocation}
              icon={new L.divIcon({
                className: 'user-location-marker',
                html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })}
            />
          )}

          {/* Coverage Areas */}
          {coverages.map(cov => (
            <Polygon 
              key={cov.id} 
              positions={cov.polygon_data} 
              pathOptions={{ color: cov.color || '#3388ff', fillColor: cov.color || '#3388ff', fillOpacity: 0.15 }}
            />
          ))}

          {/* ODCs */}
          {odcs.filter(odc => odc.coordinates).map(odc => (
            <Marker 
              key={odc.id} 
              position={[odc.coordinates.y, odc.coordinates.x]} 
              icon={odcIcon}
              eventHandlers={{
                click: () => {
                  setSelectedOdp(null);
                  setSelectedClient(null);
                  setSelectedOdc(odc);
                }
              }}
            />
          ))}

          {/* Clients */}
          {clients.filter(c => c.coordinates).map(client => (
            <Marker 
              key={client.id} 
              position={[client.coordinates.y, client.coordinates.x]} 
              icon={clientIcon}
              eventHandlers={{
                click: () => {
                  setSelectedOdp(null);
                  setSelectedOdc(null);
                  setSelectedClient(client);
                }
              }}
            />
          ))}

          {/* ODPs */}
          {odps.map(odp => {
            if (!odp.coordinates) return null;
            return (
              <Marker 
                key={`odp-${odp.id}`} 
                position={[odp.coordinates.y, odp.coordinates.x]}
                icon={odpIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedOdc(null);
                    setSelectedClient(null);
                    setSelectedOdp(odp);
                  }
                }}
              />
            );
          })}

          {/* Network Topology Lines */}
          {/* ODP -> ODC */}
          {odps.filter(odp => odp.odc_id && odp.coordinates).map(odp => {
            const odc = odcs.find(o => o.id === odp.odc_id);
            if (!odc || !odc.coordinates) return null;
            return (
              <Polyline 
                key={`link-odc-${odp.id}`}
                positions={[
                  [odp.coordinates.y, odp.coordinates.x],
                  [odc.coordinates.y, odc.coordinates.x]
                ]}
                pathOptions={{ color: '#2563eb', weight: 3, dashArray: '10, 10' }}
              />
            );
          })}

          {/* Client -> ODP */}
          {clients.filter(c => c.coordinates && c.odp_id).map(client => {
            const odp = odps.find(o => o.id === client.odp_id);
            if (!odp || !odp.coordinates) return null;
            return (
              <Polyline 
                key={`link-client-${client.id}`}
                positions={[
                  [client.coordinates.y, client.coordinates.x],
                  [odp.coordinates.y, odp.coordinates.x]
                ]}
                pathOptions={{ color: '#16a34a', weight: 2 }}
              />
            );
          })}
        </MapContainer>

        {/* Floating Action Button for Location */}
        <button 
          onClick={getUserLocation}
          className="absolute bottom-6 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border border-gray-200 text-blue-600 active:bg-gray-50"
        >
          <Navigation size={24} />
        </button>

        {/* BOTTOM SHEETS */}
        
        {/* ODP Bottom Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[1000] transition-transform duration-300 ease-in-out ${selectedOdp ? 'translate-y-0' : 'translate-y-full'}`}>
          {selectedOdp && (
            <div className="p-5 pb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text">{selectedOdp.name}</h3>
                  <p className="text-xs text-muted font-mono">{selectedOdp.id}</p>
                </div>
                <button onClick={() => setSelectedOdp(null)} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 flex justify-between">
                <span className="text-sm text-muted">Status Port</span>
                <span className="font-bold text-blue-600">{selectedOdp.used_ports || 0} / {selectedOdp.total_ports} Terpakai</span>
              </div>
              <button 
                onClick={() => handleOdpAction(selectedOdp)}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-primary/90"
              >
                <Server size={18} /> Kelola Port (Bypass Scan)
              </button>
              <button 
                onClick={() => openGoogleMaps(selectedOdp.coordinates.y, selectedOdp.coordinates.x)}
                className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-blue-100 mt-3"
              >
                <Map size={18} /> Rute ke Lokasi ODP
              </button>
            </div>
          )}
        </div>

        {/* ODC Bottom Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[1000] transition-transform duration-300 ease-in-out ${selectedOdc ? 'translate-y-0' : 'translate-y-full'}`}>
          {selectedOdc && (
            <div className="p-5 pb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text">{selectedOdc.name}</h3>
                  <p className="text-xs text-muted font-mono">{selectedOdc.id}</p>
                </div>
                <button onClick={() => setSelectedOdc(null)} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted">Kapasitas</span>
                  <span className="font-bold text-blue-600">{selectedOdc.total_ports} Port</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">ODP Terhubung</span>
                  <span className="font-bold text-text">{odps.filter(o => o.odc_id === selectedOdc.id).length} Tiang</span>
                </div>
              </div>
              <button 
                onClick={() => openGoogleMaps(selectedOdc.coordinates.y, selectedOdc.coordinates.x)}
                className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-blue-100 mt-4"
              >
                <Map size={18} /> Rute ke Lokasi Server ODC
              </button>
            </div>
          )}
        </div>

        {/* Client Bottom Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[1000] transition-transform duration-300 ease-in-out ${selectedClient ? 'translate-y-0' : 'translate-y-full'}`}>
          {selectedClient && (
            <div className="p-5 pb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text">{selectedClient.fullname}</h3>
                  <p className="text-xs text-muted font-mono">{selectedClient.id}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <MapPin size={16} className="mt-1 flex-shrink-0 text-muted" />
                  <span>{selectedClient.address || 'Alamat tidak tersedia'}</span>
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                  <span className="text-xs text-muted">ID:</span>
                  <span className="text-xs font-bold text-gray-700">{selectedClient.id}</span>
                </div>
              </div>
              <button 
                onClick={() => handleClientAction(selectedClient)}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-green-700"
              >
                <Activity size={18} /> Lihat Diagnostik (Bypass Scan)
              </button>
              <button 
                onClick={() => openGoogleMaps(selectedClient.coordinates.y, selectedClient.coordinates.x)}
                className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-blue-100 mt-3"
              >
                <Map size={18} /> Rute ke Rumah Pelanggan
              </button>
            </div>
          )}
        </div>

      </div>
    </TechnicianLayout>
  );
}
