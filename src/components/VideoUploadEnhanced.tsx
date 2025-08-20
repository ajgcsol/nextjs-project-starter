'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Video, 
  CheckCircle, 
  AlertCircle, 
  X,
  FileVideo,
  Clock,
  HardDrive,
  Settings,
  Eye,
  EyeOff,
  Camera,
  Play
} from 'lucide-react';

interface VideoUploadEnhancedProps {
  onUploadComplete?: (video: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'thumbnail' | 'complete' | 'error';
  message: string;
}

export function VideoUploadEnhanced({ 
  onUploadComplete, 
  onUploadError, 
  className 
}: VideoUploadEnhancedProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [autoThumbnail, setAutoThumbnail] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    visibility: 'private' as 'public' | 'private' | 'unlisted'
  });
  const [previewInfo, setPreviewInfo] = useState<{
    duration: number;
    size: string;
    type: string;
    dimensions?: string;
  } | null>(null);

  // Video categories
  const categories = [
    'Constitutional Law',
    'Contract Law',
    'Criminal Law',
    'Corporate Law',
    'Environmental Law',
    'International Law',
    'Tort Law',
    'Civil Procedure',
    'Evidence',
    'Legal Research',
    'Moot Court',
    'Ethics',
    'Other'
  ];

  // Generate thumbnail from video
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        // Seek to 10% of the video duration for thumbnail
        video.currentTime = video.duration * 0.1;
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailDataUrl);
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to generate thumbnail'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      onUploadError?.('Please select a valid video file');
      return;
    }

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB limit (using presigned URLs)
    if (file.size > maxSize) {
      onUploadError?.('File size must be less than 5GB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title if empty
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, title: nameWithoutExt }));
    }

    // Get basic file info and generate thumbnail
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.onloadedmetadata = async () => {
      setPreviewInfo({
        duration: video.duration,
        size: formatFileSize(file.size),
        type: file.type,
        dimensions: `${video.videoWidth}x${video.videoHeight}`
      });
      
      // Generate auto thumbnail
      try {
        const thumbnail = await generateThumbnail(file);
        setAutoThumbnail(thumbnail);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      }
      
      URL.revokeObjectURL(url);
    };
    
    video.src = url;
  };

  // Handle custom thumbnail selection
  const handleThumbnailSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onUploadError?.('Please select a valid image file for thumbnail');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB for thumbnails
    if (file.size > maxSize) {
      onUploadError?.('Thumbnail file size must be less than 10MB');
      return;
    }

    setCustomThumbnail(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle thumbnail input change
  const handleThumbnailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleThumbnailSelect(files[0]);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload video using presigned URL
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      console.log('🚀 Starting video upload process:', {
        fileName: selectedFile.name,
        fileSize: `${(selectedFile.size / (1024*1024)).toFixed(2)}MB`,
        fileType: selectedFile.type
      });

      setUploadProgress({
        loaded: 0,
        total: selectedFile.size,
        percentage: 0,
        stage: 'uploading',
        message: 'Preparing upload...'
      });

      // Step 1: Get presigned URL
      console.log('📡 Requesting presigned URL...');
      const presignedResponse = await fetch('/api/videos/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();

      setUploadProgress(prev => prev ? {
        ...prev,
        message: 'Uploading to cloud storage...'
      } : null);

      // Step 2: Upload directly to S3
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => prev ? {
            ...prev,
            loaded: e.loaded,
            total: e.total,
            percentage,
            message: `Uploading... ${percentage}%`
          } : null);
        }
      });

      // Handle upload completion
      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          console.log('S3 Upload Response:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText,
            headers: xhr.getAllResponseHeaders(),
            fileSize: selectedFile.size,
            fileName: selectedFile.name
          });
          
          if (xhr.status === 200 || xhr.status === 204) {
            resolve(xhr.response);
          } else {
            const errorMsg = `S3 upload failed with status ${xhr.status} (${xhr.statusText}). File: ${selectedFile.name} (${(selectedFile.size / (1024*1024)).toFixed(2)}MB). Response: ${xhr.responseText}`;
            console.error('S3 Upload Error:', errorMsg);
            reject(new Error(errorMsg));
          }
        };
        xhr.onerror = () => {
          const errorMsg = `Network error during S3 upload. File: ${selectedFile.name} (${(selectedFile.size / (1024*1024)).toFixed(2)}MB)`;
          console.error('S3 Network Error:', errorMsg);
          reject(new Error(errorMsg));
        };

        console.log('Starting S3 upload:', {
          fileSize: selectedFile.size,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          presignedUrlLength: presignedUrl.length
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(selectedFile);
      });

      // Step 3: Save video metadata
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'processing',
        percentage: 90,
        message: 'Saving video information...'
      } : null);

      const metadataPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        visibility: formData.visibility,
        s3Key,
        publicUrl,
        filename: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type
      };

      console.log('💾 Saving video metadata:', {
        payloadSize: JSON.stringify(metadataPayload).length,
        title: metadataPayload.title,
        filename: metadataPayload.filename,
        size: `${(metadataPayload.size / (1024*1024)).toFixed(2)}MB`
      });

      const videoResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadataPayload),
      });

      console.log('💾 Metadata save response:', {
        status: videoResponse.status,
        statusText: videoResponse.statusText,
        ok: videoResponse.ok
      });

      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('💾 Metadata save failed:', {
          status: videoResponse.status,
          statusText: videoResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to save video metadata: ${videoResponse.status} ${videoResponse.statusText} - ${errorText}`);
      }

      const videoData = await videoResponse.json();

      // Step 4: Upload thumbnail if custom one is provided (skip auto-thumbnail to save memory)
      if (customThumbnail && videoData.video?.id) {
        setUploadProgress(prev => prev ? {
          ...prev,
          stage: 'thumbnail',
          percentage: 95,
          message: 'Uploading custom thumbnail...'
        } : null);

        try {
          // Only upload custom thumbnails to avoid memory issues with large auto-generated ones
          const thumbnailFormData = new FormData();
          thumbnailFormData.append('thumbnail', customThumbnail);

          const thumbnailResponse = await fetch(`/api/videos/thumbnail/${videoData.video.id}`, {
            method: 'POST',
            body: thumbnailFormData,
          });

          if (!thumbnailResponse.ok) {
            console.warn('Custom thumbnail upload failed, continuing without it');
          }
        } catch (thumbnailError) {
          console.warn('Custom thumbnail upload error:', thumbnailError);
          // Don't fail the entire upload for thumbnail issues
        }
      }

      // Step 5: Complete
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'complete',
        percentage: 100,
        message: 'Upload complete!'
      } : null);

      onUploadComplete?.(videoData.video);
      
      // Reset form after success
      setTimeout(() => {
        setSelectedFile(null);
        setCustomThumbnail(null);
        setAutoThumbnail(null);
        setUploadProgress(null);
        setPreviewInfo(null);
        setFormData({
          title: '',
          description: '',
          category: '',
          tags: '',
          visibility: 'private'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      }, 2000);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('❌ Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size
      });
      
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'error',
        message: errorMessage
      } : null);
      onUploadError?.(errorMessage);
    }
  };

  return (
    <div className={className}>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Enhanced Video Upload
          </CardTitle>
          <CardDescription>
            Upload videos up to 5GB with automatic thumbnail generation and custom thumbnails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : selectedFile 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-slate-300 hover:border-slate-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <FileVideo className="h-12 w-12 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-sm text-green-600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                  {previewInfo && (
                    <div className="flex justify-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(previewInfo.duration)}
                      </span>
                      {previewInfo.dimensions && (
                        <span>{previewInfo.dimensions}</span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewInfo(null);
                    setAutoThumbnail(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Upload className="h-12 w-12 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700">
                    Drag and drop your video file here
                  </p>
                  <p className="text-sm text-slate-500">
                    or click to browse files
                  </p>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Supported formats: MP4, MOV, AVI, WebM, OGG</p>
                  <p>Maximum file size: 5GB</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            id="video-file-input-enhanced"
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Thumbnail Section */}
          {selectedFile && (
            <Card className="bg-slate-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Video Thumbnail
                </CardTitle>
                <CardDescription>
                  Choose between auto-generated or custom thumbnail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Auto-generated thumbnail */}
                  {autoThumbnail && (
                    <div className="space-y-2">
                      <Label htmlFor="auto-thumbnail-enhanced">Auto-generated (10% into video)</Label>
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          id="auto-thumbnail-enhanced"
                          src={autoThumbnail}
                          alt="Auto-generated thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom thumbnail */}
                  <div className="space-y-2">
                    <Label htmlFor="video-thumbnail-input-enhanced">Custom Thumbnail (Optional)</Label>
                    {customThumbnail ? (
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(customThumbnail)}
                          alt="Custom thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setCustomThumbnail(null);
                              if (thumbnailInputRef.current) {
                                thumbnailInputRef.current.value = '';
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload custom thumbnail</p>
                          <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={thumbnailInputRef}
                      id="video-thumbnail-input-enhanced"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailInputChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <Alert className={`${
              uploadProgress.stage === 'error' 
                ? 'border-red-200 bg-red-50' 
                : uploadProgress.stage === 'complete'
                  ? 'border-green-200 bg-green-50'
                  : 'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                {uploadProgress.stage === 'complete' ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : uploadProgress.stage === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                ) : (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <AlertDescription className="font-medium">
                    {uploadProgress.message}
                  </AlertDescription>
                  {uploadProgress.stage !== 'complete' && uploadProgress.stage !== 'error' && (
                    <Progress value={uploadProgress.percentage} className="w-full" />
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Video Metadata Form */}
          {selectedFile && !uploadProgress && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="video-title">Title *</Label>
                <Input
                  id="video-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="video-description">Description</Label>
                <Textarea
                  id="video-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your video content"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="video-category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="video-visibility">Visibility</Label>
                  <Select 
                    value={formData.visibility} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <EyeOff className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                      <SelectItem value="unlisted">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Unlisted
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="video-tags">Tags (comma-separated)</Label>
                <Input
                  id="video-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., lecture, constitutional law, introduction"
                />
              </div>

              {/* Upload Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setCustomThumbnail(null);
                    setAutoThumbnail(null);
                    setPreviewInfo(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!formData.title.trim()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </Button>
              </div>
            </div>
          )}

          {/* Upload Tips */}
          {!selectedFile && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-700 mb-2">Enhanced Upload Features:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Direct upload to cloud storage (up to 5GB)</li>
                <li>• Automatic thumbnail generation from video</li>
                <li>• Custom thumbnail support (JPG, PNG up to 10MB)</li>
                <li>• Real-time upload progress tracking</li>
                <li>• CloudFront CDN for fast global delivery</li>
                <li>• Automatic video optimization and transcoding</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}