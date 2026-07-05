import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ClipboardList } from 'lucide-react';
import TechnicianLayout from '../../components/TechnicianLayout';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  // Simulate checking for tech role
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    // In real app, check role from token
  }, [navigate]);

  return (
    <TechnicianLayout>
      <div className="p-4">
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-border text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Scan QR Code</h2>
          <p className="text-sm text-muted mb-6">
            Scan ODP pole sticker to assign port, or scan Client sticker for diagnostic status.
          </p>
          <button 
            onClick={() => navigate('/technician/scan')}
            className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
          >
            Open Camera
          </button>
        </div>

        <h3 className="font-bold text-text mb-3 flex items-center gap-2">
          <ClipboardList size={18} /> My Active Tickets
        </h3>
        
        <div className="space-y-3">
          {/* Mock Ticket */}
          <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">LOS (Red Light)</span>
              <span className="text-xs text-muted">Today, 09:00</span>
            </div>
            <h4 className="font-bold text-text text-sm">CL-1783235388369 (Budi)</h4>
            <p className="text-xs text-muted mt-1">Jl. Mawar No 12, redaman tinggi</p>
            <button className="mt-3 text-sm text-primary font-medium border border-primary w-full py-1.5 rounded-lg hover:bg-blue-50">
              Update Status
            </button>
          </div>
        </div>
      </div>
    </TechnicianLayout>
  );
}
