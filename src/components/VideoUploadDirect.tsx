'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Upload, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoUploadDirectProps {
  onUploadComplete?: (data: { s3Key: string; publicUrl: string }) => void;
}

export function VideoUploadDirect({ onUploadComplete }: VideoUploadDirectProps) {
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

  const uploadToS3 = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Get presigned URL from your API
      const response = await fetch('/api/videos/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { presignedUrl, s3Key, publicUrl } = await response.json();

      // Step 2: Upload directly to S3 using presigned URL
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      });

      // Handle completion
      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          console.log('XHR Status:', xhr.status);
          console.log('XHR Response:', xhr.responseText);
          if (xhr.status === 200 || xhr.status === 204) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = (e) => {
          console.error('XHR Error:', e);
          reject(new Error(`Network error: ${xhr.status} - ${xhr.statusText}`));
        };

        console.log('Starting upload to:', presignedUrl);
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Save video metadata to your database
      const saveResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''),
          filename: file.name,
          s3Key,
          publicUrl,
          size: file.size,
          mimeType: file.type,
          visibility: 'private',
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save video metadata');
      }

      setSuccess(true);
      setProgress(100);
      
      if (onUploadComplete) {
        onUploadComplete({ s3Key, publicUrl });
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="video-upload"
        />
        <label
          htmlFor="video-upload"
          className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Choose Video
        </label>
        {file && (
          <span className="text-sm text-muted-foreground">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </span>
        )}
      </div>

      {file && !success && (
        <Button onClick={uploadToS3} disabled={uploading} className="w-full">
          {uploading ? (
            <>Uploading... {progress}%</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
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
            Video uploaded successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}