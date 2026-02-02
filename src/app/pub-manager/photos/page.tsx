'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Photo {
  id: string;
  url: string;
  isCover: boolean;
  uploadedBy?: string;
  createdAt: string;
}

export default function PhotoManagementPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadPhotos();
  }, [selectedPubId]);

  const loadPhotos = async () => {
    const token = localStorage.getItem('pub-manager-token');
    const pubId = selectedPubId || localStorage.getItem('pub-manager-pub-id');
    
    if (!token || !pubId) {
      router.push('/pub-manager/login');
      return;
    }

    try {
      const response = await fetch(`/api/pub-manager/photos?pubId=${pubId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('pub-manager-token');
    const pubId = selectedPubId || localStorage.getItem('pub-manager-pub-id');
    
    if (!token || !pubId) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pubId', pubId);

        const response = await fetch('/api/pub-manager/photos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          await loadPhotos();
        }
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    const token = localStorage.getItem('pub-manager-token');
    if (!token) return;

    try {
      const response = await fetch(`/api/pub-manager/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await loadPhotos();
      } else {
        alert('Failed to delete photo');
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo');
    }
  };

  const handleSetCover = async (photoId: string) => {
    const token = localStorage.getItem('pub-manager-token');
    if (!token) return;

    try {
      const response = await fetch(`/api/pub-manager/photos/${photoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isCover: true }),
      });

      const data = await response.json();
      if (data.success) {
        await loadPhotos();
      } else {
        alert('Failed to set cover photo');
      }
    } catch (error) {
      console.error('Failed to set cover photo:', error);
      alert('Failed to set cover photo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#08d78c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/pub-manager/dashboard')}
                className="inline-flex items-center gap-2 bg-[#08d78c] hover:bg-[#06b875] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Photo Gallery</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photos</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="photo-upload"
              className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#08d78c] hover:bg-[#06b875] transition-colors duration-200 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Select Photos to Upload
                </>
              )}
            </label>
            <p className="mt-2 text-sm text-gray-500">
              You can upload multiple photos at once
            </p>
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500">No photos uploaded yet. Upload your first photo above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg shadow-md overflow-hidden relative group">
                {photo.isCover && (
                  <div className="absolute top-2 left-2 bg-[#08d78c] text-white px-2 py-1 rounded text-xs font-semibold z-10">
                    Cover
                  </div>
                )}
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={photo.url}
                    alt="Pub photo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                    }}
                  />
                </div>
                <div className="p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-2">
                  {!photo.isCover && (
                    <button
                      onClick={() => handleSetCover(photo.id)}
                      className="bg-[#08d78c] hover:bg-[#06b875] text-white px-3 py-1 rounded text-sm"
                    >
                      Set Cover
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

