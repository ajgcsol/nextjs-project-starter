'use client';

import { VideoUploadDirect } from '@/components/VideoUploadDirect';
import { VideoUploadFallback } from '@/components/VideoUploadFallback';

export default function TestUploadPage() {
  const handleUploadComplete = (data: { s3Key: string; publicUrl: string }) => {
    alert(`Upload successful!\nS3 Key: ${data.s3Key}\nPublic URL: ${data.publicUrl}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Video Upload Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Direct Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Method 1: Direct S3 Upload</h2>
            <p className="text-gray-600 mb-6">
              Upload files up to 5GB directly to S3 using presigned URLs. 
              Bypasses Vercel's serverless function limits.
            </p>
            
            <VideoUploadDirect onUploadComplete={handleUploadComplete} />
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
                <li>Client requests presigned URL</li>
                <li>Direct upload to S3</li>
                <li>Metadata saved to database</li>
              </ol>
            </div>
          </div>

          {/* Fallback Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Method 2: Server Upload</h2>
            <p className="text-gray-600 mb-6">
              Upload files up to 100MB through the server to S3. 
              More reliable for smaller files if CORS issues occur.
            </p>
            
            <VideoUploadFallback onUploadComplete={handleUploadComplete} />
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Benefits:</h3>
              <ul className="list-disc list-inside text-green-800 space-y-1 text-sm">
                <li>No CORS configuration needed</li>
                <li>Works with all browsers</li>
                <li>Server-side validation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current Domain:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
            </div>
            <div>
              <strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
            </div>
          </div>
          <p className="mt-4 text-gray-600 text-sm">
            Check browser console for detailed error messages during upload.
          </p>
        </div>
      </div>
    </div>
  );
}