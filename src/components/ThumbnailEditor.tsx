"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon, Crop, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThumbnailEditorProps {
  videoId: string;
  currentThumbnail?: string;
  onThumbnailUpdate?: (newThumbnailUrl: string) => void;
  className?: string;
}

export function ThumbnailEditor({
  videoId,
  currentThumbnail,
  onThumbnailUpdate,
  className
}: ThumbnailEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const generateFromVideo = useCallback(async () => {
    if (!videoId) return;

    try {
      setIsUploading(true);
      
      // Create a video element to capture frame
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = `/uploads/videos/${videoId}_original.mp4`;
      
      video.addEventListener('loadedmetadata', () => {
        // Seek to 25% of the video duration
        video.currentTime = video.duration * 0.25;
      });

      video.addEventListener('seeked', () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 1280;
            canvas.height = 720;
            
            // Calculate scaling to maintain aspect ratio
            const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            const scaledWidth = video.videoWidth * scale;
            const scaledHeight = video.videoHeight * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
            
            // Convert canvas to blob and set preview
            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                setSelectedFile(file);
                setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
              }
            }, 'image/jpeg', 0.8);
          }
        }
      });

    } catch (error) {
      console.error('Error generating thumbnail:', error);
    } finally {
      setIsUploading(false);
    }
  }, [videoId]);

  const uploadThumbnail = useCallback(async () => {
    if (!selectedFile || !videoId) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('thumbnail', selectedFile);
      
      const response = await fetch(`/api/videos/thumbnail/${videoId}`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        onThumbnailUpdate?.(data.thumbnailUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('Upload failed:', data.error);
      }
      
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, videoId, onThumbnailUpdate]);

  const resetThumbnail = useCallback(() => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Thumbnail Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current/Preview Thumbnail */}
        <div className="space-y-2">
          <Label>Current Thumbnail</Label>
          <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            ) : currentThumbnail ? (
              <img
                src={`${currentThumbnail}?t=${Date.now()}`}
                alt="Current thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = `/api/videos/thumbnail/${videoId}`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="space-y-2">
          <Label>Upload New Thumbnail</Label>
          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-500">
              PNG, JPG up to 10MB
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={generateFromVideo}
            disabled={isUploading}
            variant="outline"
            size="sm"
          >
            {isUploading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Crop className="h-4 w-4 mr-2" />
            )}
            Generate from Video
          </Button>
          
          {selectedFile && (
            <>
              <Button
                onClick={uploadThumbnail}
                disabled={isUploading}
                size="sm"
              >
                {isUploading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Thumbnail
              </Button>
              
              <Button
                onClick={resetThumbnail}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas
          ref={canvasRef}
          className="hidden"
          width={1280}
          height={720}
        />
      </CardContent>
    </Card>
  );
}