import { useState, useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';

export default function CameraUpload({ isOpen, onClose, onUpload, title = "Ambil Foto Bukti" }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (photo) {
      onUpload(photo);
    }
  };

  const reset = () => {
    setPhoto(null);
    setPreview(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {!preview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors"
            >
              <div className="bg-blue-100 p-4 rounded-full mb-3 text-blue-600">
                <Camera size={32} />
              </div>
              <p className="font-semibold text-gray-700">Ketuk untuk Membuka Kamera</p>
              <p className="text-xs text-gray-400 mt-1">Pastikan pencahayaan cukup terang</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-md">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={reset}
                  className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef}
            onChange={handleCapture}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl"
          >
            Batal
          </button>
          <button 
            onClick={handleUpload}
            disabled={!photo}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={18} /> Kirim Foto
          </button>
        </div>
      </div>
    </div>
  );
}
