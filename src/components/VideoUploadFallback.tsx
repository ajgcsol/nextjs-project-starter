'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Upload, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoUploadFallbackProps {
  onUploadComplete?: (data: { s3Key: string; publicUrl: string }) => void;
}

export function VideoUploadFallback({ onUploadComplete }: VideoUploadFallbackProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const uploadViaServer = async () => {
    if (!file) return;

    // Check file size limit for server upload (4.5MB Vercel limit)
    if (file.size > 4.5 * 1024 * 1024) {
      setError('File too large for server upload. Maximum size is 4.5MB due to Vercel function limits. Use Enhanced Upload for larger files.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', 'videos');
      formData.append('userId', 'test-user');

      // Upload via AWS server route
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      });

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Server upload failed: ${xhr.status} - ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', '/api/aws/upload');
        xhr.send(formData);
      });

      const uploadResult = result as any;
      
      if (uploadResult.success) {
        setSuccess(true);
        setProgress(100);
        
        if (onUploadComplete) {
          onUploadComplete({ 
            s3Key: uploadResult.file.s3Key, 
            publicUrl: uploadResult.publicUrl 
          });
        }
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }

    } catch (err) {
      console.error('Fallback upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Fallback Upload Method</h3>
        <p className="text-yellow-700 text-sm">
          This method uploads files through the server to AWS S3. Actually limited to 4.5MB due to Vercel constraints.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="video-upload-fallback"
        />
        <label
          htmlFor="video-upload-fallback"
          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Choose Video (Max 4.5MB)
        </label>
        {file && (
          <span className="text-sm text-muted-foreground">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </span>
        )}
      </div>

      {file && !success && (
        <Button onClick={uploadViaServer} disabled={uploading} className="w-full">
          {uploading ? (
            <>Uploading via Server... {progress}%</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload via Server
            </>
          )}
        </Button>
      )}

      {uploading && (
        <Progress value={progress} className="w-full" />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Video uploaded successfully via server!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}