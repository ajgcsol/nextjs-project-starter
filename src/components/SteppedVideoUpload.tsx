"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Play,
  Download,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime?: number;
  completedTime?: number;
  error?: string;
}

interface SteppedUploadResponse {
  success: boolean;
  videoId: string;
  steps: UploadStep[];
  currentStep: number;
  overallProgress: number;
  video?: {
    id: string;
    title: string;
    thumbnailPath: string;
    streamUrl: string;
    muxPlaybackId: string;
    status: string;
    transcriptStatus: string;
    transcriptText?: string;
  };
  error?: string;
}

interface SteppedVideoUploadProps {
  onUploadComplete?: (video: any) => void;
  onUploadError?: (error: string) => void;
}

export function SteppedVideoUpload({ onUploadComplete, onUploadError }: SteppedVideoUploadProps) {
  const [uploadState, setUploadState] = useState<SteppedUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<any>(null);

  // Smart upload to S3 (handles both regular and multipart uploads)
  const uploadToS3 = async (file: File) => {
    console.log('📤 Starting smart upload for:', file.name, `(${(file.size / (1024*1024)).toFixed(2)}MB)`);
    
    // First, initiate the upload to determine method
    const initiateResponse = await fetch('/api/videos/upload-perfect-stepped', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadMethod: 'initiate',
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: `Uploaded ${new Date().toLocaleDateString()}`
      }),
    });
    
    const initiateResult = await initiateResponse.json();
    
    if (!initiateResult.success) {
      throw new Error(initiateResult.error || 'Failed to initiate upload');
    }
    
    console.log('📋 Upload method determined:', initiateResult.uploadMethod);
    
    if (initiateResult.uploadMethod === 'multipart') {
      // Handle multipart upload
      return await handleMultipartUpload(file, initiateResult);
    } else {
      // Handle regular upload
      return await handleRegularUpload(file, initiateResult);
    }
  };

  // Handle multipart upload for large files
  const handleMultipartUpload = async (file: File, uploadInfo: any) => {
    console.log('🔄 Starting multipart upload...');
    
    const { uploadId, s3Key, partSize, totalParts } = uploadInfo.uploadInfo;
    const parts = [];
    
    // Generate thumbnail from video file for multipart uploads
    let autoThumbnail = null;
    try {
      console.log('🖼️ Generating thumbnail for multipart upload...');
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      video.muted = true;
      
      // Wait for video to load metadata
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(reject, 10000); // 10 second timeout
      });
      
      // Seek to 10% of video duration for thumbnail
      video.currentTime = video.duration * 0.1;
      
      // Wait for seek to complete
      await new Promise((resolve) => {
        video.onseeked = resolve;
        setTimeout(resolve, 2000); // 2 second timeout
      });
      
      // Set canvas dimensions
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        autoThumbnail = canvas.toDataURL('image/jpeg', 0.8);
        console.log('🖼️ ✅ Thumbnail generated for multipart upload');
      }
      
      // Clean up
      URL.revokeObjectURL(videoUrl);
      
    } catch (thumbnailError) {
      console.error('🖼️ ⚠️ Thumbnail generation failed for multipart upload:', thumbnailError);
      // Continue without thumbnail
    }
    
    // Upload each part
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const partData = file.slice(start, end);
      
      console.log(`📦 Uploading part ${partNumber}/${totalParts} (${(partData.size / (1024*1024)).toFixed(2)}MB)`);
      
      // Get presigned URL for this part
      const partUrlResponse = await fetch('/api/videos/multipart-upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          s3Key,
          partNumber,
          contentType: file.type
        }),
      });
      
      const partUrlResult = await partUrlResponse.json();
      
      if (!partUrlResult.presignedUrl) {
        throw new Error(`Failed to get presigned URL for part ${partNumber}`);
      }
      
      // Upload the part
      const uploadResponse = await fetch(partUrlResult.presignedUrl, {
        method: 'PUT',
        body: partData,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }
      
      const etag = uploadResponse.headers.get('ETag');
      if (!etag) {
        throw new Error(`No ETag received for part ${partNumber}`);
      }
      
      parts.push({
        partNumber,
        etag: etag.replace(/"/g, '') // Remove quotes from ETag
      });
    }
    
    // Complete multipart upload
    console.log('✅ All parts uploaded, completing multipart upload...');
    
    const completeResponse = await fetch('/api/videos/multipart-upload', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        s3Key,
        parts,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: `Multipart upload completed ${new Date().toLocaleDateString()}`,
        autoThumbnail // Include the generated thumbnail
      }),
    });
    
    const completeResult = await completeResponse.json();
    
    if (!completeResult.success) {
      throw new Error(completeResult.error || 'Failed to complete multipart upload');
    }
    
    // Return the complete data including video details from server
    return {
      s3Key,
      publicUrl: completeResult.publicUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      autoThumbnail: autoThumbnail,
      video: completeResult.video, // Include video record from server
      muxAssetId: completeResult.muxAssetId,
      muxPlaybackId: completeResult.muxPlaybackId
    };
  };

  // Handle regular upload for smaller files
  const handleRegularUpload = async (file: File, uploadInfo: any) => {
    console.log('📤 Starting regular upload...');
    
    const { s3Key, presignedUrl } = uploadInfo.uploadInfo;
    
    // For demo purposes, simulate upload
    // In production, you would upload to the presigned URL
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload time
    
    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'law-school-repository-content';
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    
    return {
      s3Key,
      publicUrl,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      autoThumbnail: null // Regular uploads don't generate thumbnails
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const startSteppedUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadState(null);

    try {
      // Step 0: Upload to S3 first
      console.log('📤 Uploading file to S3...');
      const s3Data = await uploadToS3(selectedFile);
      setUploadData(s3Data);

      // For multipart uploads that already created the video, call the callback immediately
      if (s3Data.video) {
        console.log('🎬 Multipart upload completed with video data, calling onUploadComplete...');
        if (onUploadComplete) {
          const uploadCompleteData = {
            ...s3Data.video,
            pendingFile: selectedFile,
            originalFilename: selectedFile.name,
            size: selectedFile.size,
            mimeType: selectedFile.type,
            s3Key: s3Data.s3Key,
            publicUrl: s3Data.publicUrl,
            autoThumbnail: s3Data.autoThumbnail,
            uploadMethod: 'multipart',
            muxAssetId: s3Data.muxAssetId,
            muxPlaybackId: s3Data.muxPlaybackId
          };
          onUploadComplete(uploadCompleteData);
        }
        setIsUploading(false);
        return;
      }

      // Step 1-3: Start the stepped processing
      const response = await fetch('/api/videos/upload-perfect-stepped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: selectedFile.name.replace(/\.[^/.]+$/, ''),
          description: `Uploaded ${new Date().toLocaleDateString()}`,
          ...s3Data
        }),
      });

      const result: SteppedUploadResponse = await response.json();
      setUploadState(result);

      if (result.success) {
        // Start polling for transcript completion
        pollTranscriptProgress(result.videoId);
        
        if (onUploadComplete) {
          // FIXED: Preserve the original File object and all required metadata
          const uploadCompleteData = {
            // Video data from the API response
            ...(result.video || {}),
            
            // Original file and metadata that needs to be preserved
            pendingFile: selectedFile,
            originalFilename: selectedFile.name,
            size: selectedFile.size,
            mimeType: selectedFile.type,
            
            // Upload metadata
            uploadMethod: selectedFile.size > 100 * 1024 * 1024 ? 'multipart' : 'single',
            s3Key: s3Data.s3Key,
            publicUrl: s3Data.publicUrl,
            
            // Auto-generated thumbnail if available
            autoThumbnail: s3Data.autoThumbnail || null,
            
            // Content metadata for the editor
            title: selectedFile.name.replace(/\.[^/.]+$/, ''),
            description: `Uploaded ${new Date().toLocaleDateString()}`,
            category: 'Lecture', // Default category
            
            // Generate a unique monitor session ID for tracking
            monitorSessionId: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          console.log('🎬 ✅ Upload complete, calling onUploadComplete with preserved data:', {
            hasFile: !!uploadCompleteData.pendingFile,
            filename: uploadCompleteData.originalFilename,
            size: uploadCompleteData.size,
            uploadMethod: uploadCompleteData.uploadMethod
          });
          
          onUploadComplete(uploadCompleteData);
        }
      } else {
        if (onUploadError) {
          onUploadError(result.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      if (onUploadError) {
        onUploadError(error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const pollTranscriptProgress = async (videoId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/upload-perfect-stepped?videoId=${videoId}`);
        const result: SteppedUploadResponse = await response.json();
        
        setUploadState(result);
        
        // Stop polling when transcript is complete or failed
        const transcriptStep = result.steps.find(s => s.step === 3);
        if (transcriptStep && (transcriptStep.status === 'completed' || transcriptStep.status === 'failed')) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to poll progress:', error);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes max
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const getStepIcon = (step: UploadStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepMainIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return <Image className="h-6 w-6" />;
      case 2:
        return <Video className="h-6 w-6" />;
      case 3:
        return <FileText className="h-6 w-6" />;
      default:
        return <Upload className="h-6 w-6" />;
    }
  };

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '';
    const duration = (endTime || Date.now()) - startTime;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* File Selection */}
      {!uploadState && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Perfect Video Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Choose a video file</p>
                <p className="text-sm text-gray-500">
                  Supports MP4, MOV, AVI, and more
                </p>
              </label>
            </div>
            
            {selectedFile && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  onClick={startSteppedUpload}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Upload...
                    </>
                  ) : (
                    'Start Perfect Upload'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadState && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload Progress</span>
                <Badge variant={uploadState.success ? "default" : "destructive"}>
                  {uploadState.overallProgress.toFixed(0)}% Complete
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={uploadState.overallProgress} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                Step {uploadState.currentStep} of 3 • Processing your video with perfection
              </p>
            </CardContent>
          </Card>

          {/* Step Details */}
          <div className="grid gap-4">
            {uploadState.steps.map((step) => (
              <Card key={step.step} className={cn(
                "transition-all duration-300",
                step.status === 'processing' && "ring-2 ring-blue-500 ring-opacity-50",
                step.status === 'completed' && "bg-green-50 border-green-200",
                step.status === 'failed' && "bg-red-50 border-red-200"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full",
                      step.status === 'completed' && "bg-green-100",
                      step.status === 'failed' && "bg-red-100",
                      step.status === 'processing' && "bg-blue-100",
                      step.status === 'pending' && "bg-gray-100"
                    )}>
                      {getStepMainIcon(step.step)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">
                          Step {step.step}: {step.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getStepIcon(step)}
                          <span className="text-sm font-medium capitalize">
                            {step.status}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{step.message}</p>
                      
                      {step.status !== 'pending' && (
                        <div className="space-y-2">
                          <Progress value={step.progress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{step.progress}% complete</span>
                            {step.startTime && (
                              <span>
                                Duration: {formatDuration(step.startTime, step.completedTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Video Preview (when ready) */}
          {uploadState.video && uploadState.video.status === 'ready' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Your Video is Ready!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={uploadState.video.thumbnailPath} 
                    alt="Video thumbnail"
                    className="w-32 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{uploadState.video.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        <Image className="h-3 w-3 mr-1" />
                        Thumbnail Ready
                      </Badge>
                      <Badge variant={uploadState.video.transcriptStatus === 'ready' ? "default" : "secondary"}>
                        <FileText className="h-3 w-3 mr-1" />
                        Transcript {uploadState.video.transcriptStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Play Video
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                  {uploadState.video.transcriptText && (
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download Transcript
                    </Button>
                  )}
                </div>
                
                {uploadState.video.transcriptText && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Generated Transcript:</h4>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {uploadState.video.transcriptText}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upload Another Video */}
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadState(null);
                setSelectedFile(null);
                setUploadData(null);
              }}
            >
              Upload Another Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SteppedVideoUpload;
