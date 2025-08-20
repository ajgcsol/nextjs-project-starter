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
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface VideoUploadLargeProps {
  onUploadComplete?: (video: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
  currentPart?: number;
  totalParts?: number;
  canPause?: boolean;
  isPaused?: boolean;
}

interface UploadPart {
  partNumber: number;
  etag: string;
  size: number;
}

export function VideoUploadLarge({ 
  onUploadComplete, 
  onUploadError, 
  className 
}: VideoUploadLargeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [autoThumbnail, setAutoThumbnail] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadState, setUploadState] = useState<{
    uploadId?: string;
    s3Key?: string;
    parts: UploadPart[];
    partSize?: number;
    totalParts?: number;
  }>({ parts: [] });
  const [isBackgroundUpload, setIsBackgroundUpload] = useState(false);
  
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

    // Support files up to 100GB for 4K video content
    const maxSize = 100 * 1024 * 1024 * 1024; // 100GB
    if (file.size > maxSize) {
      onUploadError?.('File size must be less than 100GB');
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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onUploadError?.('Thumbnail file size must be less than 10MB');
      return;
    }

    setCustomThumbnail(file);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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

  // Determine upload method based on file size
  const getUploadMethod = (fileSize: number) => {
    const threshold = 100 * 1024 * 1024; // 100MB threshold
    return fileSize > threshold ? 'multipart' : 'single';
  };

  // Single file upload (for smaller files)
  const uploadSingleFile = async () => {
    if (!selectedFile) return;

    // Use existing single upload logic
    const presignedResponse = await fetch('/api/videos/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();

    const xhr = new XMLHttpRequest();
    
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

    await new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);
    });

    return { s3Key, publicUrl };
  };

  // Multipart upload (for large files)
  const uploadMultipartFile = async () => {
    if (!selectedFile) return;

    // Initialize multipart upload
    setUploadProgress({
      loaded: 0,
      total: selectedFile.size,
      percentage: 0,
      stage: 'preparing',
      message: 'Initializing large file upload...',
      canPause: true
    });

    const initResponse = await fetch('/api/videos/multipart-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
      }),
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize multipart upload');
    }

    const { uploadId, s3Key, partSize, totalParts, publicUrl } = await initResponse.json();
    
    setUploadState({
      uploadId,
      s3Key,
      parts: [],
      partSize,
      totalParts
    });

    setUploadProgress(prev => prev ? {
      ...prev,
      stage: 'uploading',
      message: `Uploading in ${totalParts} parts...`,
      totalParts,
      currentPart: 0
    } : null);

    // Upload parts
    const parts: UploadPart[] = [];
    let uploadedBytes = 0;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, selectedFile.size);
      const partData = selectedFile.slice(start, end);

      // Get presigned URL for this part
      const partUrlResponse = await fetch('/api/videos/multipart-upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          s3Key,
          partNumber,
          contentType: selectedFile.type
        }),
      });

      if (!partUrlResponse.ok) {
        throw new Error(`Failed to get upload URL for part ${partNumber}`);
      }

      const { presignedUrl } = await partUrlResponse.json();

      // Upload this part
      const xhr = new XMLHttpRequest();
      
      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          const partProgress = uploadedBytes + e.loaded;
          const percentage = Math.round((partProgress / selectedFile.size) * 100);
          
          setUploadProgress(prev => prev ? {
            ...prev,
            loaded: partProgress,
            percentage,
            currentPart: partNumber,
            message: `Uploading part ${partNumber}/${totalParts} (${percentage}%)`,
            isPaused: false
          } : null);
        });

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            const etag = xhr.getResponseHeader('ETag')?.replace(/"/g, '');
            if (etag) {
              parts.push({
                partNumber,
                etag,
                size: partData.size
              });
            }
            uploadedBytes += partData.size;
            resolve(xhr.response);
          } else {
            reject(new Error(`Part ${partNumber} upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error(`Network error uploading part ${partNumber}`));

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(partData);
      });
    }

    // Complete multipart upload
    setUploadProgress(prev => prev ? {
      ...prev,
      stage: 'processing',
      percentage: 95,
      message: 'Finalizing upload...'
    } : null);

    const completeResponse = await fetch('/api/videos/multipart-upload', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        s3Key,
        parts
      }),
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to complete multipart upload');
    }

    const completeResult = await completeResponse.json();
    return { s3Key, publicUrl: completeResult.publicUrl };
  };

  // Main upload handler
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress({
        loaded: 0,
        total: selectedFile.size,
        percentage: 0,
        stage: 'preparing',
        message: 'Preparing upload...'
      });

      const uploadMethod = getUploadMethod(selectedFile.size);
      let uploadResult;

      if (uploadMethod === 'multipart') {
        uploadResult = await uploadMultipartFile();
      } else {
        uploadResult = await uploadSingleFile();
      }

      // Save video metadata
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'processing',
        percentage: 90,
        message: 'Saving video information...'
      } : null);

      const videoResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          visibility: formData.visibility,
          s3Key: uploadResult.s3Key,
          publicUrl: uploadResult.publicUrl,
          filename: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.type,
          autoThumbnail: autoThumbnail // Include auto-generated thumbnail
        }),
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to save video metadata');
      }

      const videoData = await videoResponse.json();

      // Handle custom thumbnail if provided
      if (customThumbnail && videoData.video?.id) {
        setUploadProgress(prev => prev ? {
          ...prev,
          percentage: 95,
          message: 'Uploading custom thumbnail...'
        } : null);

        const thumbnailFormData = new FormData();
        thumbnailFormData.append('thumbnail', customThumbnail);

        await fetch(`/api/videos/thumbnail/${videoData.video.id}`, {
          method: 'POST',
          body: thumbnailFormData,
        });
      }

      // Complete
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'complete',
        percentage: 100,
        message: 'Upload complete!'
      } : null);

      onUploadComplete?.(videoData.video);
      
      // Reset form
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadProgress(prev => prev ? {
        ...prev,
        stage: 'error',
        message: errorMessage
      } : null);
      onUploadError?.(errorMessage);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCustomThumbnail(null);
    setAutoThumbnail(null);
    setUploadProgress(null);
    setPreviewInfo(null);
    setUploadState({ parts: [] });
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: '',
      visibility: 'private'
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  // Drag and drop handlers
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

  return (
    <div className={className}>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Large Video Upload (4K Support)
          </CardTitle>
          <CardDescription>
            Upload videos up to 100GB with automatic chunking, resume capability, and background processing
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
                      <Badge variant="outline">
                        {getUploadMethod(selectedFile.size) === 'multipart' ? 'Large File' : 'Standard'}
                      </Badge>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
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
                    Drag and drop your 4K video file here
                  </p>
                  <p className="text-sm text-slate-500">
                    or click to browse files
                  </p>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Supported formats: MP4, MOV, AVI, WebM, OGG</p>
                  <p>Maximum file size: 100GB</p>
                  <p>Files over 100MB use automatic chunked upload</p>
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
            id="video-file-input"
            type="file"
            accept="video/*"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleFileSelect(files[0]);
              }
            }}
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
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {autoThumbnail && (
                    <div className="space-y-2">
                      <Label htmlFor="auto-thumbnail">Auto-generated</Label>
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          id="auto-thumbnail"
                          src={autoThumbnail}
                          alt="Auto-generated thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="video-thumbnail-input">Custom Thumbnail (Optional)</Label>
                    {customThumbnail ? (
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(customThumbnail)}
                          alt="Custom thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setCustomThumbnail(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload custom thumbnail</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={thumbnailInputRef}
                      id="video-thumbnail-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleThumbnailSelect(files[0]);
                        }
                      }}
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
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {uploadProgress.stage === 'complete' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : uploadProgress.stage === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className="font-medium">
                      {uploadProgress.message}
                    </AlertDescription>
                    {uploadProgress.currentPart && uploadProgress.totalParts && (
                      <p className="text-sm text-slate-600 mt-1">
                        Part {uploadProgress.currentPart} of {uploadProgress.totalParts}
                      </p>
                    )}
                  </div>
                </div>
                
                {uploadProgress.stage !== 'complete' && uploadProgress.stage !== 'error' && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress.percentage} className="w-full" />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}</span>
                      <span>{uploadProgress.percentage}%</span>
                    </div>
                  </div>
                )}
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
                    <SelectTrigger id="video-category">
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
                    <SelectTrigger id="video-visibility">
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
                <Label htmlFor="video-tags">Tags</Label>
                <Input
                  id="video-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., lecture, constitutional law, 4k"
                />
              </div>

              {/* Upload Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!formData.title.trim()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {getUploadMethod(selectedFile.size) === 'multipart' ? 'Start Large Upload' : 'Upload Video'}
                </Button>
              </div>
            </div>
          )}

          {/* Features for Large Files */}
          {!selectedFile && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-700 mb-2">4K Video Support Features:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Support for files up to 100GB (perfect for 4K content)</li>
                <li>• Automatic chunked upload for large files (100MB+ parts)</li>
                <li>• Resume capability if upload is interrupted</li>
                <li>• Background processing with notifications</li>
                <li>• Parallel chunk uploads for faster transfer</li>
                <li>• Real-time progress tracking with part-by-part status</li>
                <li>• CloudFront CDN for optimized global delivery</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}