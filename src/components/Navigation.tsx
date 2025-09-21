'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-black text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#08d78c] rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold">Pub Club</span>
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
              href="/map-live" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              🗺️ Map
            </Link>
            <Link 
              href="/download" 
              className="hover:text-[#08d78c] transition-colors duration-200"
            >
              Download App
            </Link>
            <Link 
              href="/pub-manager/login" 
              className="text-[#08d78c] hover:text-[#06b875] transition-colors duration-200"
            >
              Pub Manager
            </Link>
            {session?.user ? (
              <>
                <Link 
                  href="/profile" 
                  className="hover:text-[#08d78c] transition-colors duration-200"
                >
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="hover:text-[#08d78c] transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="hover:text-[#08d78c] transition-colors duration-200"
              >
                Sign In
              </Link>
            )}
            <Link 
              href="/admin" 
              className="bg-[#08d78c] hover:bg-[#06b875] text-black px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
            >
              Admin
            </Link>
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
                href="/map-live" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                🗺️ Map
              </Link>
              <Link 
                href="/download" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Download App
              </Link>
              <Link 
                href="/pub-manager/login" 
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Pub Manager
              </Link>
              {session?.user ? (
                <>
                  <Link 
                    href="/profile" 
                    className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium hover:text-[#08d78c] transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
              <Link 
                href="/admin" 
                className="block px-3 py-2 rounded-md text-base font-medium bg-[#08d78c] text-black rounded-lg font-semibold hover:bg-[#06b875] transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 