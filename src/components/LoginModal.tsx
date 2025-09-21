'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { X, Star, Heart, CheckCircle, User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: 'save' | 'checkin' | 'review';
}

export default function LoginModal({ isOpen, onClose, action = 'save' }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await signIn('email', { email, redirect: false });
      onClose();
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn('google', { redirect: false });
      onClose();
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'save':
        return 'save this pub to your wishlist';
      case 'checkin':
        return 'check in to this pub';
      case 'review':
        return 'write a review for this pub';
      default:
        return 'perform this action';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'save':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'checkin':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />;
      default:
        return <User className="w-5 h-5 text-[#08d78c]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {getActionIcon()}
              <h2 className="text-xl font-semibold text-gray-900">
                Sign in to {getActionText()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Create an account or sign in to {getActionText()}. It's quick and easy!
            </p>

            {/* Email Sign In */}
            <form onSubmit={handleEmailSignIn} className="mb-6">
              <div className="mb-4">
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="modal-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-300 text-black py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Benefits */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">With an account you can:</h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-[#08d78c]" />
                  Write reviews for pubs
                </li>
                <li className="flex items-center gap-2">
                  <Heart className="w-3 h-3 text-[#08d78c]" />
                  Save pubs to wishlist
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[#08d78c]" />
                  Check in to visited pubs
                </li>
                <li className="flex items-center gap-2">
                  <User className="w-3 h-3 text-[#08d78c]" />
                  Track your experiences
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
