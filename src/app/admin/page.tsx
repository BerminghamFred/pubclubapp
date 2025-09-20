'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [amenitiesStatus, setAmenitiesStatus] = useState<string>('');
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadLoading(true);
    setUploadStatus('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setUploadStatus('Please select a file to upload.');
      setUploadLoading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload-pubs', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(`✅ ${result.message}`);
      } else {
        setUploadStatus(`❌ ${result.message}`);
      }
    } catch (error) {
      setUploadStatus('❌ An error occurred while uploading the file.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAmenitiesSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAmenitiesLoading(true);
    setAmenitiesStatus('');

    const formData = new FormData(event.currentTarget);
    const file = formData.get('amenitiesFile') as File;

    if (!file) {
      setAmenitiesStatus('Please select a file to upload.');
      setAmenitiesLoading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload-amenities', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setAmenitiesStatus(`✅ ${result.message} - Added ${result.newAmenitiesAdded} new amenities across ${result.updatedPubs} pubs.`);
      } else {
        setAmenitiesStatus(`❌ ${result.message}`);
      }
    } catch (error) {
      setAmenitiesStatus('❌ An error occurred while uploading the file.');
    } finally {
      setAmenitiesLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Pub Club Admin Portal</h1>
          <p className="text-xl text-gray-600">Upload and manage pub data and amenities</p>
        </div>

        {/* Pub Data Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Upload Pub Data</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">CSV Format Requirements:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Required Fields:</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong>place_id:</strong> Unique identifier for the pub</li>
                <li><strong>name:</strong> Pub name</li>
                <li><strong>address:</strong> Full address</li>
                <li><strong>lat:</strong> Latitude coordinate</li>
                <li><strong>lng:</strong> Longitude coordinate</li>
                <li><strong>types:</strong> Pub type categories</li>
                <li><strong>website:</strong> Pub website URL</li>
                <li><strong>phone:</strong> Contact phone number</li>
                <li><strong>rating:</strong> Google rating (0-5)</li>
                <li><strong>opening_hours:</strong> Opening times</li>
                <li><strong>photo_url:</strong> Main pub photo URL</li>
                <li><strong>summary:</strong> Brief description</li>
                <li><strong>borough:</strong> London borough for area filtering (optional)</li>
              </ul>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400">💡</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> The <code className="bg-blue-100 px-1 rounded">borough</code> column is <strong>optional</strong> but highly recommended. Pubs without borough data will still be displayed but won't appear in area filtering, limiting visitor search options.
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="font-medium text-gray-900 mb-2">Auto-Generated from Your Data:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>id:</strong> Used directly from place_id</li>
                <li><strong>description:</strong> Used directly from summary</li>
                <li><strong>area:</strong> Used directly from borough column for filtering (empty if borough missing)</li>
                <li><strong>type:</strong> Extracted from types column</li>
                <li><strong>features:</strong> Extracted from types column</li>
                <li><strong>reviewCount:</strong> Random number between 50-500</li>
                <li><strong>openingHours:</strong> Used directly from opening_hours</li>
                <li><strong>_internal.lat:</strong> Used directly from lat</li>
                <li><strong>_internal.lng:</strong> Used directly from lng</li>
                <li><strong>_internal.photo_url:</strong> Used directly from photo_url</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Common London Boroughs:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
              <span>Camden</span>
              <span>Westminster</span>
              <span>Islington</span>
              <span>Hackney</span>
              <span>Tower Hamlets</span>
              <span>Southwark</span>
              <span>Lambeth</span>
              <span>Wandsworth</span>
              <span>Hammersmith & Fulham</span>
              <span>Kensington & Chelsea</span>
              <span>Greenwich</span>
              <span>Lewisham</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                id="file"
                name="file"
                accept=".csv"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>
            
            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {uploadLoading ? 'Uploading...' : 'Upload Pub Data'}
            </button>
          </form>

          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-lg ${
              uploadStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Amenities Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🍽️ Upload Pub Amenities</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Amenities CSV Format:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Required Structure:</h4>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li><strong>place_id:</strong> Must match the <code>id</code> from your pub data</li>
                <li><strong>Column headers:</strong> Each amenity gets its own column (e.g., "Fish and Chips", "Sky Sports")</li>
                <li><strong>Values:</strong> Use "TRUE" for pubs that have the amenity, "FALSE" for those that don't</li>
              </ul>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400">💡</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Flexible Format:</strong> Your CSV can contain additional fields (like pub names, addresses, etc.) - the system will automatically ignore them and only process the amenity columns. This makes it easy to work with existing data exports.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-amber-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      <strong>Important:</strong> The <code className="bg-amber-100 px-1 rounded">unique_code</code> must exactly match the <code>place_id</code> from your pub data. This ensures amenities are correctly assigned to the right pubs.
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="font-medium text-gray-900 mb-2 mt-4">Example CSV Structure:</h4>
              <div className="bg-white p-3 rounded border text-xs font-mono overflow-x-auto">
                place_id,pub_name,address,Fish and Chips,Sky Sports,Real Ale,Outdoor Seating<br/>
                ChIJ123456789,The Red Lion,123 Main St,TRUE,FALSE,TRUE,TRUE<br/>
                ChIJ987654321,The Crown,456 High St,FALSE,TRUE,FALSE,TRUE
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Note: <code>pub_name</code> and <code>address</code> columns will be ignored - only amenity columns are processed.
              </p>
            </div>
          </div>

          <form onSubmit={handleAmenitiesSubmit} className="space-y-4">
            <div>
              <label htmlFor="amenitiesFile" className="block text-sm font-medium text-gray-700 mb-2">
                Select Amenities CSV File
              </label>
              <input
                type="file"
                id="amenitiesFile"
                name="amenitiesFile"
                accept=".csv"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08d78c] focus:border-transparent"
              />
            </div>
            
            <button
              type="submit"
              disabled={amenitiesLoading}
              className="w-full px-4 py-2 bg-[#08d78c] hover:bg-[#06b875] disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {amenitiesLoading ? 'Uploading...' : 'Upload Amenities Data'}
            </button>
          </form>

          {amenitiesStatus && (
            <div className={`mt-4 p-3 rounded-lg ${
              amenitiesStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {amenitiesStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 