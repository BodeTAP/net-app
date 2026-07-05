import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Phone, Lock, Activity } from 'lucide-react';

export default function ClientLogin() {
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await axios.post('/api/v1/client-app/login', { whatsapp, password });
      if (res.data.status === 'success') {
        localStorage.setItem('clientToken', res.data.data.token);
        localStorage.setItem('clientUser', JSON.stringify(res.data.data.user));
        navigate('/client/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa kembali nomor WA dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans max-w-md mx-auto relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">MyNetOps</h1>
          <p className="text-gray-500 text-sm mt-2">Portal Pelanggan Internet Anda</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg text-sm font-medium animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor WhatsApp</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Phone size={18} />
              </div>
              <input
                type="text"
                placeholder="081234567890"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-sm font-medium outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kata Sandi</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-sm font-medium outline-none"
              />
            </div>
            <div className="flex justify-end mt-2">
              <a href="#" className="text-xs text-blue-600 font-semibold hover:text-blue-700">Lupa sandi?</a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Masuk ke Akun'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
