'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PubRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PubRequestModal({ open, onOpenChange }: PubRequestModalProps) {
  const [formData, setFormData] = useState({
    pubName: '',
    postcode: '',
    managerName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/pub-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Reset form
        setFormData({
          pubName: '',
          postcode: '',
          managerName: '',
          contactEmail: '',
          contactPhone: '',
        });
        // Close modal after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit request. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Error submitting pub request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white [&>button]:text-gray-800 [&>button]:hover:text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Contact Pub Club</DialogTitle>
          <DialogDescription className="text-gray-700">
            Fill out this form to request access to the Pub Manager dashboard. We'll get back to you soon!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pubName" className="text-gray-900">Pub Name *</Label>
              <Input
                id="pubName"
                name="pubName"
                value={formData.pubName}
                onChange={handleChange}
                placeholder="The Red Lion"
                required
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode" className="text-gray-900">Postcode *</Label>
              <Input
                id="postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                placeholder="SW1A 1AA"
                required
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerName" className="text-gray-900">Your Name *</Label>
              <Input
                id="managerName"
                name="managerName"
                value={formData.managerName}
                onChange={handleChange}
                placeholder="John Smith"
                required
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email Address *</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="your.email@pub.com"
                required
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-gray-900">Phone Number *</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="+44 20 1234 5678"
                required
                disabled={loading || success}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                ✅ Request submitted successfully! We'll be in touch soon.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
              className="text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="bg-[#08d78c] hover:bg-[#06b875] text-white"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

