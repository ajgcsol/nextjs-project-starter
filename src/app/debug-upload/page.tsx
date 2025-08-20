'use client';

import { VideoUploadEnhanced } from '@/components/VideoUploadEnhanced';
import { VideoUploadDirect } from '@/components/VideoUploadDirect';
import { VideoUploadFallback } from '@/components/VideoUploadFallback';
import { VideoUploadLarge } from '@/components/VideoUploadLarge';

// This is a debug page to test uploads without authentication

export default function DebugUploadPage() {
  const handleUploadComplete = (data: { s3Key: string; publicUrl: string }) => {
    alert(`Upload successful!\nS3 Key: ${data.s3Key}\nPublic URL: ${data.publicUrl}`);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Debug Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Enhanced Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Enhanced Upload (Recommended)</h2>
            <p className="text-gray-600 mb-6">
              Direct S3 upload with presigned URLs. Supports up to 5GB files.
            </p>
            
            <VideoUploadEnhanced 
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Direct Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Direct Upload (Original)</h2>
            <p className="text-gray-600 mb-6">
              Original direct S3 upload implementation. Up to 5GB files.
            </p>
            
            <VideoUploadDirect 
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {/* Large File Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Large File Upload (4K)</h2>
            <p className="text-gray-600 mb-6">
              Multipart upload for 4K videos. Supports up to 100GB files with chunking and resume.
            </p>
            
            <VideoUploadLarge 
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Fallback Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Fallback Upload (Server)</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm font-medium">⚠️ Known Issue</p>
              <p className="text-red-700 text-sm">This method advertises 100MB support but fails with 413 errors for files >4.5MB due to Vercel's function request body limit. Use Enhanced Upload instead.</p>
            </div>
            <p className="text-gray-600 mb-6">
              Server-side upload through Vercel. Advertises 100MB limit but actually limited to ~4.5MB.
            </p>
            
            <VideoUploadFallback 
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A'}...</p>
            <p><strong>Environment:</strong> Production</p>
            <p><strong>CloudFront Domain:</strong> d24qjgz9z4yzof.cloudfront.net</p>
          </div>
        </div>
      </div>
    </div>
  );
}