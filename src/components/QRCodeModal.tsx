'use client';

import { X } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Scan QR Code to Download
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
              src="/qr-code-download.png"
              alt="QR Code to download Pub Club app from Google Play Store"
              className="w-48 h-48 mx-auto"
              onError={(e) => {
                // Fallback if local image is not available - use QR service
                e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://q.me-qr.com/KCfK3iVI')}`;
              }}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            Or visit: <span className="font-mono text-xs break-all">https://q.me-qr.com/KCfK3iVI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
