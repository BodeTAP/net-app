import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Wifi, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import ClientLayout from '../../components/ClientLayout';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) {
      navigate('/client/login');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await axios.get('/api/v1/client-app/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'success') {
          setData(res.data.data);
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

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-full pt-32">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!data) return null;

  const { profile, currentInvoice } = data;
  const isActive = profile.is_active;

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pt-6">
        
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hai, {profile.fullname.split(' ')[0]}!</h2>
          <p className="text-sm text-gray-500 mt-1">Status Layanan Internet Anda</p>
        </div>

        {/* Status Card */}
        <div className={`p-6 rounded-3xl border shadow-lg relative overflow-hidden ${
          isActive 
            ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-500 shadow-green-500/20' 
            : 'bg-gradient-to-br from-red-500 to-red-700 border-red-600 shadow-red-600/20'
        }`}>
          <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
            <Wifi size={120} />
          </div>
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-2 mb-4">
              {isActive ? <CheckCircle size={20} className="text-green-100" /> : <AlertCircle size={20} className="text-red-100" />}
              <span className="font-semibold text-sm uppercase tracking-wider text-white/90">
                {isActive ? 'Aktif' : 'Terisolir'}
              </span>
            </div>
            <h3 className="text-3xl font-extrabold mb-1">{profile.mikrotik_profile}</h3>
            <p className="text-white/80 text-sm font-medium">Rp {Number(profile.monthly_fee).toLocaleString('id-ID')} / bulan</p>
          </div>
        </div>

        {/* Current Invoice Quick View */}
        {currentInvoice && (
          <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-md shadow-orange-100/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400"></div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                  <Wallet size={16} />
                </div>
                <span className="font-bold text-gray-800 text-sm">Tagihan Belum Lunas</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Jatuh Tempo: {new Date(currentInvoice.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h4 className="text-2xl font-black text-orange-600 mb-4">
                Rp {Number(currentInvoice.amount).toLocaleString('id-ID')}
              </h4>
              <button 
                onClick={() => navigate('/client/invoices')}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                Cara Pembayaran
              </button>
            </div>
          </div>
        )}

        {/* Profile Info Summary */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            Informasi Akun
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ID Pelanggan</p>
              <p className="text-sm font-medium text-gray-800">{profile.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alamat Pemasangan</p>
              <p className="text-sm font-medium text-gray-800 line-clamp-2">{profile.address}</p>
            </div>
          </div>
        </div>

      </div>
    </ClientLayout>
  );
}
