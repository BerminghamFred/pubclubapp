'use client';

import { X } from 'lucide-react';
import { useMemo } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  // Generate the app download URL
  const appUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/app.html`;
    }
    return 'https://pubclub.co.uk/app.html';
  }, []);

  // Generate QR code URL
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(appUrl)}`;
  }, [appUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Scan QR Code to Download the Pub Club App
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Scan this QR code with your mobile device to download the Pub Club app
          </p>
          
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-6">
            <img
              src={qrCodeUrl}
              alt="QR Code to download Pub Club app"
              className="w-64 h-64 mx-auto"
            />
          </div>
          
          <p className="text-sm text-gray-500">
            Or visit: <span className="font-mono text-xs break-all">{appUrl}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
