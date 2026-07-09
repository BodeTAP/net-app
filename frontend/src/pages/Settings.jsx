import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';

export default function Settings() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [adminWa, setAdminWa] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success') {
        const data = res.data.data;
        if (data.bank_accounts) {
          setBankAccounts(data.bank_accounts);
        }
        if (data.admin_whatsapp) {
          setAdminWa(data.admin_whatsapp);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/v1/settings/bank_accounts', { value: bankAccounts }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.put('/api/v1/settings/admin_whatsapp', { value: adminWa }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Pengaturan berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { bank: '', number: '', name: '' }]);
  };

  const updateBankAccount = (index, field, value) => {
    const updated = [...bankAccounts];
    updated[index][field] = value;
    setBankAccounts(updated);
  };

  const removeBankAccount = (index) => {
    const updated = bankAccounts.filter((_, i) => i !== index);
    setBankAccounts(updated);
  };

  if (loading) return <Layout><div className="p-6">Memuat...</div></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">Pengaturan Aplikasi</h2>
          <p className="text-sm text-muted mt-1">Konfigurasi rekening pembayaran manual & kontak admin.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      <div className="space-y-6">
        {/* WhatsApp Setting */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <SettingsIcon size={18} className="text-muted" /> Kontak WhatsApp Admin
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <input
              type="text"
              value={adminWa}
              onChange={(e) => setAdminWa(e.target.value)}
              placeholder="Contoh: 6281234567890 (Gunakan 62)"
              className="w-full md:w-1/2 p-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <p className="text-xs text-muted mt-2">Nomor ini akan digunakan sebagai tujuan konfirmasi pembayaran manual dan tiket gangguan.</p>
          </div>
        </div>

        {/* Bank Accounts Setting */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <SettingsIcon size={18} className="text-muted" /> Rekening Pembayaran Manual
            </h3>
            <button
              onClick={addBankAccount}
              className="flex items-center gap-1 text-primary hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-primary"
            >
              <Plus size={16} /> Tambah Rekening
            </button>
          </div>

          <div className="space-y-4">
            {bankAccounts.length === 0 && (
              <p className="text-sm text-muted text-center py-4 border border-dashed rounded-lg">Belum ada rekening yang ditambahkan.</p>
            )}
            {bankAccounts.map((account, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-3 items-end border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={account.bank}
                    onChange={(e) => updateBankAccount(index, 'bank', e.target.value)}
                    placeholder="BCA / BRI / DANA"
                    className="w-full p-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={account.number}
                    onChange={(e) => updateBankAccount(index, 'number', e.target.value)}
                    placeholder="1234567890"
                    className="w-full p-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Atas Nama</label>
                  <input
                    type="text"
                    value={account.name}
                    onChange={(e) => updateBankAccount(index, 'name', e.target.value)}
                    placeholder="Nama Pemilik"
                    className="w-full p-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => removeBankAccount(index)}
                  className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                  title="Hapus Rekening"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
