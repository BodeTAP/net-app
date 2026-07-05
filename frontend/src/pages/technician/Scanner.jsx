import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import TechnicianLayout from '../../components/TechnicianLayout';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent multiple initializations in React strict mode
    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(onScanSuccess, onScanFailure);

    async function onScanSuccess(decodedText) {
      // Pause scanner
      scanner.clear();
      setScanResult(decodedText);
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      try {
        // Try hitting Client Scan API first
        try {
          const res = await axios.get(`/api/v1/scan/client/${decodedText}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.status === 'success') {
             // Pass data via state to next page
             navigate(`/technician/client/${decodedText}`, { state: { data: res.data.data } });
             return;
          }
        } catch (clientErr) {
          if (clientErr.response?.status !== 404) throw clientErr;
        }

        // Try hitting ODP Scan API
        try {
          const res = await axios.get(`/api/v1/odps/scan/${decodedText}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.status === 'success') {
             navigate(`/technician/odp/${decodedText}`, { state: { data: res.data.data } });
             return;
          }
        } catch (odpErr) {
          if (odpErr.response?.status !== 404) throw odpErr;
        }

        setError("QR Code not recognized in system.");
      } catch (err) {
        console.error(err);
        setError("Error processing QR code.");
      } finally {
        setLoading(false);
      }
    }

    function onScanFailure(error) {
      // ignore
    }

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [navigate]);

  return (
    <TechnicianLayout>
      <div className="p-4 flex flex-col items-center">
        <h2 className="text-xl font-bold text-text mb-4">Scan QR Code</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted">Analyzing QR Code...</p>
          </div>
        ) : error ? (
          <div className="w-full bg-red-50 p-4 border border-red-200 rounded-xl text-center mt-10">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-lg"
            >
              Scan Again
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg bg-black"></div>
            <p className="text-center text-sm text-muted mt-4">Point your camera at a Client or ODP sticker.</p>
          </div>
        )}
      </div>
    </TechnicianLayout>
  );
}
