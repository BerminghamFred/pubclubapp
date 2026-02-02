'use client';

import Link from 'next/link';
import Image from 'next/image';
import DownloadButton from './DownloadButton';

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Image 
                src="/pubclub-logo.svg" 
                alt="Pub Club" 
                width={100} 
                height={100}
                className="h-20 w-auto"
              />
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Discover London's best pubs with Pub Club. Find traditional pubs, modern bars, 
              and everything in between with our comprehensive directory.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/pubs" className="text-gray-300 hover:text-white transition-colors duration-200">
                  Find Pubs
                </Link>
              </li>
              <li>
                <div className="text-gray-300 hover:text-white transition-colors duration-200">
                  <DownloadButton 
                    className="text-gray-300 hover:text-white transition-colors duration-200 bg-transparent border-none p-0 cursor-pointer" 
                    children="Download App"
                  />
                </div>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="text-gray-300">
                <a href="mailto:enquiries@pubclubapp.co.uk" className="hover:text-white transition-colors duration-200">
                  enquiries@pubclubapp.co.uk
                </a>
              </li>
              <li className="text-gray-300">
                <a href="tel:+447513506399" className="hover:text-white transition-colors duration-200">
                  +447513506399
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Pub Club. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 