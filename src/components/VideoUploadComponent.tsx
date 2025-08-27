"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  EyeOff
} from "lucide-react";

interface VideoUploadProps {
  onUploadComplete?: (video: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

export function VideoUploadComponent({ 
  onUploadComplete, 
  onUploadError, 
  className 
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Handle file selection - Mux supports ALL video formats!
  const handleFileSelect = (file: File) => {
    // Mux supports virtually any video format, so we're very permissive
    if (!file.type.startsWith('video/') && !file.name.match(/\.(wmv|avi|mov|mp4|mkv|flv|webm|ogv|3gp|m4v|asf|rm|rmvb|vob|ts|mts|m2ts)$/i)) {
      onUploadError?.('Please select a valid video file');
      return;
    }

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB limit (increased for Mux)
    if (file.size > maxSize) {
      onUploadError?.('File size must be less than 5GB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title if empty
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, title: nameWithoutExt }));
    }

    // Get basic file info
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      setPreviewInfo({
        duration: video.duration,
        size: formatFileSize(file.size),
        type: file.type,
        dimensions: `${video.videoWidth}x${video.videoHeight}`
      });
      URL.revokeObjectURL(url);
    };
    
    video.src = url;
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

  // Upload video
  const handleUpload = async () => {
    if (!selectedFile) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('category', formData.category);
    uploadFormData.append('tags', formData.tags);
    uploadFormData.append('visibility', formData.visibility);

    try {
      setUploadProgress({
        loaded: 0,
        total: selectedFile.size,
        percentage: 0,
        stage: 'uploading',
        message: 'Uploading video file...'
      });

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => prev ? {
            ...prev,
            loaded: event.loaded,
            total: event.total,
            percentage,
            message: `Uploading... ${percentage}%`
          } : null);
        }
      });

      // Handle upload completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploadProgress(prev => prev ? {
            ...prev,
            stage: 'processing',
            percentage: 100,
            message: 'Processing video...'
          } : null);

          try {
            const response = JSON.parse(xhr.responseText);
            
            // Simulate processing time
            setTimeout(() => {
              setUploadProgress(prev => prev ? {
                ...prev,
                stage: 'complete',
                message: 'Upload complete!'
              } : null);

              onUploadComplete?.(response.video);
              
              // Reset form after success
              setTimeout(() => {
                setSelectedFile(null);
                setUploadProgress(null);
                setPreviewInfo(null);
                setFormData({
                  title: '',
                  description: '',
                  category: '',
                  tags: '',
                  visibility: 'private'
                });
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }, 2000);

            }, 2000);

          } catch (parseError) {
            throw new Error('Invalid server response');
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed due to network error');
      });

      xhr.open('POST', '/api/videos/upload');
      xhr.send(uploadFormData);

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

  return (
    <div className={className}>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload Video
          </CardTitle>
          <CardDescription>
            Upload your video files directly to the platform for streaming
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
                  <p>Supported formats: ALL video formats (MP4, WMV, AVI, MOV, MKV, FLV, WebM, and more)</p>
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
            type="file"
            accept="video/*"
            onChange={handleInputChange}
            className="hidden"
          />

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
                    setPreviewInfo(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
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
              <h4 className="font-medium text-slate-700 mb-2">Upload Tips:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use MP4 format for best compatibility</li>
                <li>• Higher resolution videos may take longer to process</li>
                <li>• Videos are automatically transcoded to multiple qualities</li>
                <li>• Thumbnails are automatically generated</li>
                <li>• Processing time varies based on video length and quality</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}