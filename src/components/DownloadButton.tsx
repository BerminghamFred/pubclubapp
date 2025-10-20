'use client';

import { useState, useEffect } from 'react';
import QRCodeModal from './QRCodeModal';

interface DownloadButtonProps {
  className?: string;
  onDownloadClick?: () => void;
  children?: string;
}

export default function DownloadButton({ className, onDownloadClick, children }: DownloadButtonProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Only run on client side
      if (typeof window === 'undefined') return;
      
      // Check both screen size and user agent for better mobile detection
      const isMobileWidth = window.innerWidth < 1024;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileWidth || isMobileUA);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkIsMobile);
      }
    };
  }, []);

  const handleDownloadClick = () => {
    if (typeof window === 'undefined') return;
    
    // Call the optional callback if provided (for closing mobile menu, etc.)
    if (onDownloadClick) {
      onDownloadClick();
    }
    
    if (isMobile) {
      // For mobile users, redirect to the QR code link
      window.open('https://q.me-qr.com/KCfK3iVI', '_blank');
    } else {
      // For desktop users, show QR code modal
      setShowQRModal(true);
    }
  };

  return (
    <>
      <button 
        onClick={handleDownloadClick}
        className={className}
      >
        {children || 'Download Now'}
      </button>
      
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
      />
    </>
  );
}
