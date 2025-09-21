export default function TestPubPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Test Pub Page</h1>
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-4">The Shy Horse</h2>
          <p className="text-gray-600 mb-4">This is a test page to verify routing works.</p>
          <div className="space-y-2">
            <p><strong>Area:</strong> Kingston upon Thames</p>
            <p><strong>Type:</strong> Gastro Pub</p>
            <p><strong>Rating:</strong> 4.3</p>
          </div>
        </div>
      </div>
    </div>
  );
}
