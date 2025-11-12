'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import DownloadButton from './DownloadButton';
import LoginModal from './LoginModal';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const pathname = usePathname();
  const [isMapView, setIsMapView] = useState(false);

  useEffect(() => {
    const checkViewParam = () => {
      const params = new URLSearchParams(window.location.search);
      setIsMapView(pathname === '/pubs' && params.get('view') === 'map');
    };
    
    // Check immediately and on pathname changes
    checkViewParam();
    
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', checkViewParam);
    return () => window.removeEventListener('popstate', checkViewParam);
  }, [pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };


  return (
    <nav className={`bg-black text-white shadow-lg ${isMapView ? 'hidden md:block' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24 py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/pubclub-logo.svg" 
              alt="Pub Club" 
              width={100} 
              height={100}
              className="h-20 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Home
            </Link>
            <Link 
              href="/blog" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Blog
            </Link>
            <Link 
              href="/pubs" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Find Pubs
            </Link>
            <Link 
              href="/pubs?view=map" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Map
            </Link>
            <Link 
              href="/random" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Pub Randomiser
            </Link>
            <DownloadButton 
              className="text-white bg-transparent border-none p-0 cursor-pointer hover:text-[#08d78c] transition-colors duration-200"
              children="Download App"
            />
            <Link 
              href="/pub-manager/login" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors duration-200"
            >
              Pub Manager
            </Link>
            {session?.user ? (
              <Link 
                href="/profile" 
                className="hover:text-[#08d78c] transition-colors duration-200"
              >
                Profile
              </Link>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="hover:text-[#08d78c] transition-colors duration-200"
              >
                Create Profile
              </button>
            )}
            {/* Admin link hidden from public navigation */}
            {/* <Link 
              href="/admin" 
              className="bg-[#08d78c] hover:bg-[#06b875] text-black px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
            >
              Admin
            </Link> */}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white hover:text-[#08d78c] focus:outline-none focus:text-[#08d78c]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-900 rounded-lg mt-2">
              <Link 
                href="/" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/blog" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              <Link 
                href="/pubs" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Find Pubs
              </Link>
              <Link 
                href="/pubs?view=map" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Map
              </Link>
              <Link 
                href="/random" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Pub Randomiser
              </Link>
              <DownloadButton 
                className="block w-full px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200 cursor-pointer text-white bg-transparent border-none"
                onDownloadClick={() => setIsMenuOpen(false)}
                children="Download App"
              />
              <Link 
                href="/pub-manager/login" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Pub Manager
              </Link>
              {session?.user ? (
                <Link 
                  href="/profile" 
                  className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                >
                  Create Profile
                </button>
              )}
              {/* Admin link hidden from public navigation */}
              {/* <Link 
                href="/admin" 
                className="block px-3 py-2 rounded-md text-base font-medium bg-[#08d78c] text-black font-semibold hover:bg-[#06b875] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link> */}
            </div>
          </div>
        )}
      </div>
      
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action="save"
      />
    </nav>
  );
} 