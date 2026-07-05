import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Receipt, CheckCircle, Clock } from 'lucide-react';
import ClientLayout from '../../components/ClientLayout';

export default function ClientInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) {
      navigate('/client/login');
      return;
    }

    const fetchInvoices = async () => {
      try {
        const res = await axios.get('/api/v1/client-app/invoices', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'success') {
          setInvoices(res.data.data);
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

    fetchInvoices();
  }, [navigate]);

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pt-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tagihan Anda</h2>
          <p className="text-sm text-gray-500 mt-1">Riwayat pembayaran layanan internet</p>
        </div>

        {/* Payment Instructions (Static for now as discussed) */}
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 mb-6">
          <h3 className="text-sm font-bold text-blue-900 mb-2">Cara Pembayaran Manual</h3>
          <p className="text-xs text-blue-700 leading-relaxed mb-3">
            Silakan transfer sesuai nominal tagihan yang belum lunas ke rekening berikut:
          </p>
          <div className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center mb-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Bank BCA</p>
              <p className="font-mono font-bold text-sm">8720 123 456</p>
            </div>
            <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">A.n. NetOps ISP</p>
          </div>
          <p className="text-[10px] text-blue-600/80 italic mt-2">
            *Konfirmasi pembayaran otomatis setelah 10 menit, atau hubungi admin jika terisolir.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Receipt size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-800">Belum Ada Tagihan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{inv.id}</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-0.5">Tagihan {new Date(inv.due_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h4>
                  </div>
                  {inv.status === 'PAID' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md uppercase">
                      <CheckCircle size={12} /> Lunas
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md uppercase">
                      <Clock size={12} /> Belum Lunas
                    </span>
                  )}
                </div>
                
                <div className="mt-2 pt-3 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Jatuh Tempo</p>
                    <p className="text-xs font-semibold text-gray-700">{new Date(inv.due_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-medium">Total</p>
                    <p className="text-lg font-black text-gray-900">Rp {Number(inv.amount).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
