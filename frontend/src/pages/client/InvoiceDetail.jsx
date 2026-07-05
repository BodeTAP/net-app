import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, CheckCircle, ArrowLeft, Building2 } from 'lucide-react';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) {
      navigate('/client/login');
      return;
    }

    const fetchData = async () => {
      try {
        // We fetch all invoices then find the specific one for simplicity, 
        // in real prod we'd have a specific GET /invoice/:id endpoint.
        const invRes = await axios.get('/api/v1/client-app/invoices', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const found = invRes.data.data.find(i => i.id === id);
        setInvoice(found || null);

        if (found && found.status !== 'PAID') {
          const chanRes = await axios.get('/api/v1/payment/channels', {
             headers: { Authorization: `Bearer ${token}` }
          });
          setChannels(chanRes.data.data);
        }
      } catch (err) {
        setError('Gagal memuat detail tagihan');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handlePayment = async () => {
    if (!selectedChannel) {
      setError('Pilih saluran pembayaran terlebih dahulu');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('clientToken');
      const res = await axios.post('/api/v1/payment/request', {
        invoice_id: invoice.id,
        method: selectedChannel
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        // Redirect to Tripay Checkout URL
        window.location.href = res.data.data.checkout_url;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col items-center justify-center p-4 text-center">
        <h2 className="font-bold text-xl mb-2">Tagihan Tidak Ditemukan</h2>
        <button onClick={() => navigate('/client/invoices')} className="text-blue-600 underline">Kembali ke daftar tagihan</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 max-w-md mx-auto relative shadow-2xl pb-24">
      {/* Header */}
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Detail Pembayaran</h1>
      </div>

      <div className="p-4 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Invoice Summary */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{invoice.id}</p>
          <h2 className="text-sm font-semibold text-gray-800 mb-6">Tagihan Bulan {new Date(invoice.due_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
          
          <p className="text-xs text-gray-500 mb-1">Total Tagihan</p>
          <h3 className="text-4xl font-black text-gray-900 mb-6">Rp {Number(invoice.amount).toLocaleString('id-ID')}</h3>
          
          {invoice.status === 'PAID' ? (
            <div className="bg-green-50 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <CheckCircle size={18} /> Tagihan Sudah Lunas
            </div>
          ) : (
             <div className="bg-orange-50 text-orange-700 py-3 rounded-xl font-bold text-sm">
               Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}
             </div>
          )}
        </div>

        {/* Payment Methods */}
        {invoice.status !== 'PAID' && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 ml-1">Pilih Metode Pembayaran</h3>
            <div className="space-y-3">
              {/* Option 1: Manual Transfer */}
              <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${selectedChannel === 'MANUAL' ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input 
                  type="radio" 
                  name="payment_method" 
                  value="MANUAL"
                  checked={selectedChannel === 'MANUAL'}
                  onChange={() => setSelectedChannel('MANUAL')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-gray-500" />
                    <span className="font-bold text-sm text-gray-900">Transfer Bank Manual</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Konfirmasi pembayaran ke admin via WA</p>
                </div>
              </label>

              {/* Tripay Channels */}
              {channels.map(channel => (
                <label key={channel.code} className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${selectedChannel === channel.code ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value={channel.code}
                    checked={selectedChannel === channel.code}
                    onChange={() => setSelectedChannel(channel.code)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-gray-500" />
                        <span className="font-bold text-sm text-gray-900">{channel.name}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-green-600 font-medium mt-1">Verifikasi Otomatis Tripay</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {invoice.status !== 'PAID' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-md mx-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          {selectedChannel === 'MANUAL' ? (
            <button 
              onClick={() => window.open('https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20sudah%20transfer%20untuk%20tagihan%20'+invoice.id, '_blank')}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/30 flex justify-center items-center gap-2"
            >
              Konfirmasi ke WhatsApp
            </button>
          ) : (
            <button 
              onClick={handlePayment}
              disabled={!selectedChannel || processing}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Bayar Sekarang'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
