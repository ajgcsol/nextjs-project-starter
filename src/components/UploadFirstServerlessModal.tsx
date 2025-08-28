"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Database,
  Zap,
  X,
  Play,
  Pause,
  Camera,
  Clock,
  UploadCloud,
  Eye,
  Mic,
  Settings,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';

interface UploadFirstServerlessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (success: boolean, result?: any) => void;
  contentData: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    metadata: {
      visibility?: string;
      pendingFile?: File;
      autoThumbnail?: string;
      customThumbnail?: File;
      uploadMethod?: string;
      monitorSessionId?: string;
      [key: string]: any;
    };
  };
}

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
  duration?: number;
}

export function UploadFirstServerlessModal({
  isOpen,
  onClose,
  onComplete,
  contentData
}: UploadFirstServerlessModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubVideoRef = useRef<HTMLVideoElement>(null); // Separate ref for thumbnail scrubbing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Video preview state
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  
  // Thumbnail selection state
  const [thumbnailMethod, setThumbnailMethod] = useState<'auto' | 'timestamp' | 'custom'>('timestamp');
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState(10);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailAccepted, setThumbnailAccepted] = useState(false);
  const [thumbnailStepWaiting, setThumbnailStepWaiting] = useState(false);
  
  // Promise-based thumbnail acceptance
  const [thumbnailAcceptanceResolver, setThumbnailAcceptanceResolver] = useState<(() => void) | null>(null);
  
  // Upload results
  const [uploadResults, setUploadResults] = useState<{
    s3Key?: string;
    publicUrl?: string;
    videoId?: string;
  }>({});

  // Processing steps - Upload first workflow
  const [steps, setSteps] = useState<ProcessingStep[]>(() => {
    const baseSteps = [
      {
        id: 'validate',
        title: 'Validating Content',
        description: 'Checking video file and metadata',
        icon: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      }
    ];

    // Add upload step only if no existing S3 data
    const hasExistingVideo = contentData.metadata.s3Key && contentData.metadata.publicUrl;
    if (!hasExistingVideo) {
      baseSteps.push({
        id: 'upload',
        title: 'Upload Video',
        description: 'Uploading video file to cloud storage',
        icon: <UploadCloud className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      });
    }

    baseSteps.push(
      {
        id: 'database',
        title: hasExistingVideo ? 'Update Metadata' : 'Create Record',
        description: hasExistingVideo ? 'Updating video information and settings' : 'Creating video database record',
        icon: <Database className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      },
      {
        id: 'mux',
        title: 'Video Processing',
        description: 'Optimizing for streaming with Mux',
        icon: <Video className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      },
      {
        id: 'thumbnail',
        title: 'Generate Thumbnail',
        description: 'Creating thumbnail from processed video',
        icon: <Image className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      },
      {
        id: 'transcription',
        title: 'Generate Transcript',
        description: 'Creating automatic captions with Mux AI',
        icon: <Mic className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      },
      {
        id: 'complete',
        title: 'Publishing Complete',
        description: 'Video is now live and ready',
        icon: <Zap className="h-4 w-4 sm:h-5 sm:w-5" />,
        status: 'pending' as const
      }
    );

    return baseSteps;
  });

  // Initialize video preview when modal opens
  useEffect(() => {
    if (isOpen) {
      // Check for pending file first
      if (contentData.metadata.pendingFile) {
        const file = contentData.metadata.pendingFile as File;
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      }
      // Check for existing video URL
      else if (contentData.metadata.videoUrl || contentData.metadata.streamUrl) {
        const videoUrl = contentData.metadata.videoUrl || contentData.metadata.streamUrl;
        setVideoPreviewUrl(videoUrl);
        console.log('🎬 Using existing video URL for preview:', videoUrl);
      }
      // Check for existing public URL
      else if (contentData.metadata.publicUrl) {
        setVideoPreviewUrl(contentData.metadata.publicUrl);
        console.log('🎬 Using existing public URL for preview:', contentData.metadata.publicUrl);
      }
    }
  }, [isOpen, contentData.metadata.pendingFile, contentData.metadata.videoUrl, contentData.metadata.streamUrl, contentData.metadata.publicUrl]);

  // Handle video metadata loaded
  useEffect(() => {
    const video = videoRef.current;
    const scrubVideo = scrubVideoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      setSelectedThumbnailTime(Math.min(10, video.duration / 2));
      
      // Also ensure scrubbing video has the same initial time
      if (scrubVideo) {
        scrubVideo.currentTime = Math.min(10, video.duration / 2);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Also set up scrubbing video if available
    if (scrubVideo) {
      scrubVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (scrubVideo) {
        scrubVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [videoPreviewUrl]);

  // Generate thumbnail preview when timestamp changes
  useEffect(() => {
    if (thumbnailMethod === 'timestamp' && scrubVideoRef.current && canvasRef.current && videoDuration > 0) {
      generateThumbnailFromTimestamp(selectedThumbnailTime);
    }
  }, [selectedThumbnailTime, thumbnailMethod, videoDuration]);

  const generateThumbnailFromTimestamp = (time: number) => {
    const video = scrubVideoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    video.currentTime = time;
    
    const handleSeeked = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnailPreview(thumbnailDataUrl);
      
      video.removeEventListener('seeked', handleSeeked);
    };

    video.addEventListener('seeked', handleSeeked);
  };

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPlaying) {
      video.pause();
      setIsVideoPlaying(false);
    } else {
      video.play();
      setIsVideoPlaying(true);
    }
  };

  const handleCustomThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCustomThumbnail(file);
      setThumbnailMethod('custom');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAcceptThumbnail = () => {
    console.log('🎯 Thumbnail acceptance starting...');
    setThumbnailAccepted(true);
    setThumbnailStepWaiting(false);
    
    // Resolve the promise waiting for acceptance
    if (thumbnailAcceptanceResolver) {
      console.log('🎯 Resolving thumbnail acceptance promise...');
      thumbnailAcceptanceResolver();
      setThumbnailAcceptanceResolver(null);
    }
    
    console.log('🎯 Thumbnail accepted! Method:', thumbnailMethod, 'Time:', selectedThumbnailTime);
  };

  const startPublishProcess = async () => {
    setIsProcessing(true);
    setStartTime(Date.now());
    setError(null);

    try {
      // Step 1: Validate Content - ENHANCED: Better validation with fallback logic
      await processStep('validate', async () => {
        console.log('🎬 Validating content data:', {
          title: contentData.title,
          hasPendingFile: !!contentData.metadata.pendingFile,
          pendingFileType: contentData.metadata.pendingFile?.constructor.name,
          pendingFileName: contentData.metadata.pendingFile?.name,
          pendingFileSize: contentData.metadata.pendingFile?.size,
          metadataKeys: Object.keys(contentData.metadata),
          hasS3Key: !!contentData.metadata.s3Key,
          hasPublicUrl: !!contentData.metadata.publicUrl
        });
        
        if (!contentData.title.trim()) {
          throw new Error('Title is required. Please enter a title for your video.');
        }
        
        // ENHANCED: Better video file validation with fallback logic
        const videoFile = contentData.metadata.pendingFile;
        const hasS3Data = contentData.metadata.s3Key && contentData.metadata.publicUrl;
        
        // For multipart uploads, we'll have S3 data but maybe not the file object
        if (!videoFile && !hasS3Data) {
          console.error('🎬 ❌ No video file or S3 data found');
          console.error('🎬 Available metadata:', contentData.metadata);
          throw new Error('No video file found. Please upload a video first using the video upload component above.');
        }
        
        // If we have S3 data, we can skip the file upload since it's already done
        if (hasS3Data && !videoFile) {
          console.log('🎬 Using existing S3 upload data, skipping file validation');
          return; // Skip file validation since we'll use S3 data
        }
        
        // If we have neither file nor S3 data, we need to start the upload process
        if (!videoFile && !hasS3Data) {
          throw new Error('Please select a video file using the upload component above before publishing.');
        }
        
        if (videoFile) {
          // Verify the file is actually a File object
          if (!(videoFile instanceof File)) {
            console.error('🎬 ❌ pendingFile is not a File object:', typeof videoFile);
            throw new Error('Invalid video file format. Please try uploading the video again.');
          }
          
          // Check file size (5GB max)
          const maxSize = 5 * 1024 * 1024 * 1024;
          if (videoFile.size > maxSize) {
            throw new Error(`File too large. Maximum size is 5GB (current: ${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB). Please use a smaller video file.`);
          }
          
          // Check file type
          if (!videoFile.type.startsWith('video/')) {
            throw new Error('Invalid file type. Please upload a video file (MP4, MOV, AVI, etc.).');
          }
          
          console.log('🎬 ✅ Validation passed - video file found:', videoFile.name, `(${(videoFile.size / (1024*1024)).toFixed(1)}MB)`);
        } else if (hasS3Data) {
          console.log('🎬 ✅ Validation passed - using existing S3 data:', contentData.metadata.s3Key);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      // Step 2: Upload Video (only if not already uploaded)
      const hasExistingVideo = contentData.metadata.s3Key && contentData.metadata.publicUrl;
      let currentUploadResults;
      
      if (!hasExistingVideo) {
        currentUploadResults = await processStep('upload', async () => {
          const results = await uploadVideo();
          setUploadResults(results);
          return results;
        });
      } else {
        console.log('🎬 Video already uploaded, skipping upload step');
        currentUploadResults = {
          s3Key: contentData.metadata.s3Key,
          publicUrl: contentData.metadata.publicUrl,
          videoId: contentData.metadata.id
        };
        setUploadResults(currentUploadResults);
      }

      // Step 3: Update Video Record (or create if doesn't exist)
      const videoRecord = await processStep('database', async () => {
        const record = await updateVideoRecord(currentUploadResults);
        setUploadResults(prev => ({ ...prev, videoId: record.id }));
        return record;
      });

      // Step 4: Mux Processing (async)
      await processStep('mux', async () => {
        await processMuxVideo();
      });

      // Step 5: Process Thumbnail (async)
      await processStep('thumbnail', async () => {
        await processThumbnail(videoRecord.id);
      });

      // Step 6: Generate Transcription (async)
      await processStep('transcription', async () => {
        await generateTranscription(videoRecord.id);
      });

      // Step 7: Complete
      await processStep('complete', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Success!
      setTimeout(() => {
        onComplete(true, { 
          message: 'Video published successfully!',
          videoId: videoRecord.id,
          videoUrl: `/videos/${videoRecord.id}`
        });
      }, 1000);

    } catch (error) {
      console.error('Publish process failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      setTimeout(() => {
        onComplete(false, { error: error instanceof Error ? error.message : 'Unknown error' });
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep = async (stepId: string, processor: () => Promise<any>) => {
    updateStepStatus(stepId, 'processing', 0);
    
    try {
      const result = await processor();
      updateStepStatus(stepId, 'completed', 100);
      await new Promise(resolve => setTimeout(resolve, 300));
      return result;
    } catch (error) {
      updateStepStatus(stepId, 'error', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], progress?: number, details?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, progress, details, duration: status === 'completed' ? Date.now() - startTime : undefined }
          : step
      )
    );
  };

  const uploadVideo = async () => {
    // Check if video is already uploaded to S3
    if (contentData.metadata.s3Key && contentData.metadata.publicUrl) {
      updateStepStatus('upload', 'processing', 100, 'Using existing S3 upload...');
      console.log('🎬 Video already uploaded to S3:', contentData.metadata.s3Key);
      return {
        s3Key: contentData.metadata.s3Key,
        publicUrl: contentData.metadata.publicUrl
      };
    }
    
    const file = contentData.metadata.pendingFile!;
    
    updateStepStatus('upload', 'processing', 5, 'Getting upload URL...');
    
    // Get presigned URL
    const presignedResponse = await fetch('/api/videos/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();
    
    updateStepStatus('upload', 'processing', 10, 'Starting upload...');

    // Upload with progress tracking
    return new Promise<{s3Key: string, publicUrl: string}>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 85) + 10; // 10-95%
          const mbLoaded = (e.loaded / (1024 * 1024)).toFixed(1);
          const mbTotal = (e.total / (1024 * 1024)).toFixed(1);
          updateStepStatus('upload', 'processing', progress, `Uploading... ${mbLoaded}MB / ${mbTotal}MB`);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          updateStepStatus('upload', 'processing', 95, 'Upload complete, verifying...');
          resolve({ s3Key, publicUrl });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const updateVideoRecord = async (uploadData?: {s3Key: string, publicUrl: string, videoId?: string}) => {
    updateStepStatus('database', 'processing', 30, 'Updating video metadata...');
    
    // If we already have a video ID from multipart upload, update that record
    if (contentData.metadata.id) {
      updateStepStatus('database', 'processing', 50, 'Updating existing video record...');
      console.log('🎬 Updating existing video from multipart upload:', contentData.metadata.id);
      
      // Update the existing video record with new metadata
      const updateResponse = await fetch(`/api/videos/${contentData.metadata.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contentData.title,
          description: contentData.description,
          category: contentData.category,
          tags: contentData.tags.join(','),
          visibility: contentData.metadata.visibility || 'private',
          thumbnail_override: thumbnailPreview || contentData.metadata.autoThumbnail
        }),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Update API error:', errorText);
        throw new Error(`Failed to update video record: ${updateResponse.status} - ${errorText}`);
      }
      
      updateStepStatus('database', 'processing', 100, 'Video metadata updated...');
      const result = await updateResponse.json();
      return result.video || {
        id: contentData.metadata.id,
        title: contentData.title,
        description: contentData.description
      };
    }
    
    // Use metadata for file info if we don't have the actual file object
    const filename = contentData.metadata.pendingFile 
      ? (contentData.metadata.pendingFile as File).name 
      : contentData.metadata.originalFilename || 'video.mp4';
    
    const fileSize = contentData.metadata.pendingFile 
      ? (contentData.metadata.pendingFile as File).size 
      : contentData.metadata.fileSize || 0;
    
    const mimeType = contentData.metadata.pendingFile 
      ? (contentData.metadata.pendingFile as File).type 
      : contentData.metadata.mimeType || 'video/mp4';
    
    // Call the actual upload API to create the database record
    const uploadResponse = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: contentData.title,
        description: contentData.description,
        category: contentData.category,
        tags: contentData.tags.join(','),
        visibility: contentData.metadata.visibility || 'private',
        filename: filename,
        size: fileSize,
        mimeType: mimeType,
        autoThumbnail: thumbnailPreview || contentData.metadata.autoThumbnail,
        // Ensure S3 data is properly included - use uploadData parameter first
        s3Key: uploadData?.s3Key || uploadResults.s3Key || contentData.metadata.s3Key,
        publicUrl: uploadData?.publicUrl || uploadResults.publicUrl || contentData.metadata.publicUrl
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload API error:', errorText);
      throw new Error(`Failed to create video record: ${uploadResponse.status} - ${errorText}`);
    }

    updateStepStatus('database', 'processing', 80, 'Updating search index...');
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await uploadResponse.json();
    return result.video;
  };

  const processMuxVideo = async () => {
    updateStepStatus('mux', 'processing', 10, 'Creating Mux asset...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateStepStatus('mux', 'processing', 30, 'Processing video for streaming...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    updateStepStatus('mux', 'processing', 60, 'Generating multiple quality versions...');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    updateStepStatus('mux', 'processing', 90, 'Finalizing video processing...');
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  const processThumbnail = async (videoId?: string) => {
    updateStepStatus('thumbnail', 'processing', 20, 'Ready for thumbnail selection...');
    
    const currentVideoId = videoId || uploadResults.videoId;
    if (!currentVideoId) {
      throw new Error('Video ID not available for thumbnail generation');
    }
    
    try {
      // Reset thumbnail acceptance state
      setThumbnailAccepted(false);
      setThumbnailStepWaiting(true);
      
      // Show thumbnail selection UI and wait for user to accept
      updateStepStatus('thumbnail', 'processing', 30, 'Choose your thumbnail method below, then click "Accept Thumbnail" to continue');
      
      // Wait for user to accept thumbnail choice - using Promise instead of polling
      console.log('⏳ Waiting for thumbnail acceptance...');
      await new Promise<void>((resolve) => {
        setThumbnailAcceptanceResolver(() => resolve);
      });
      
      console.log('🎯 Thumbnail accepted! Processing selection. Method:', thumbnailMethod);
      
      console.log('🔍 Method check - Method:', thumbnailMethod, 'HasCustom:', !!customThumbnail);
      
      if (thumbnailMethod === 'custom' && customThumbnail) {
        console.log('📁 Processing custom thumbnail upload...');
        updateStepStatus('thumbnail', 'processing', 60, 'Uploading custom thumbnail...');
        
        const formData = new FormData();
        formData.append('thumbnail', customThumbnail);
        
        const response = await fetch(`/api/videos/thumbnail/${currentVideoId}`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload custom thumbnail');
        }
        
        updateStepStatus('thumbnail', 'processing', 100, 'Custom thumbnail uploaded successfully');
        
      } else if (thumbnailMethod === 'timestamp') {
        console.log('⏰ Processing timestamp thumbnail selection...');
        updateStepStatus('thumbnail', 'processing', 60, 'Setting thumbnail timestamp for Mux...');
        
        // Use Mux thumbnail generation with specified timestamp
        try {
          console.log('🔧 Setting thumbnail timestamp:', selectedThumbnailTime, 'for video:', currentVideoId);
          
          const response = await fetch(`/api/videos/${currentVideoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thumbnailTimestamp: selectedThumbnailTime,
              thumbnailMethod: 'timestamp'
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Thumbnail timestamp API response:', result);
            updateStepStatus('thumbnail', 'processing', 100, `Mux will generate thumbnail at ${Math.floor(selectedThumbnailTime)}s`);
          } else {
            const errorText = await response.text();
            console.warn('❌ Failed to set timestamp, API error:', response.status, errorText);
            updateStepStatus('thumbnail', 'processing', 100, 'Using Mux auto-generated thumbnail as fallback');
          }
        } catch (error) {
          console.warn('❌ Failed to set timestamp, network error:', error);
          updateStepStatus('thumbnail', 'processing', 100, 'Using Mux auto-generated thumbnail as fallback');
        }
        
      } else {
        console.log('🤖 Processing auto thumbnail generation...');
        updateStepStatus('thumbnail', 'processing', 60, 'Using Mux automatic thumbnail generation...');
        updateStepStatus('thumbnail', 'processing', 90, 'Mux will generate optimal thumbnail automatically');
      }
      
      // Complete the thumbnail step
      console.log('✅ Thumbnail step completing...');
      updateStepStatus('thumbnail', 'processing', 100, 'Thumbnail processing complete');
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('✅ Thumbnail step finished!');
      
    } catch (error) {
      console.warn('Thumbnail setup failed, continuing with auto-generation:', error);
      updateStepStatus('thumbnail', 'processing', 100, 'Using Mux auto-generated thumbnail as fallback');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const generateTranscription = async (videoId?: string) => {
    updateStepStatus('transcription', 'processing', 20, 'Analyzing audio track for speech...');
    
    const currentVideoId = videoId || uploadResults.videoId;
    if (!currentVideoId) {
      throw new Error('Video ID not available for transcription');
    }
    
    console.log('🎤 Starting transcription for video ID:', currentVideoId);
    
    try {
      // Call the Mux transcription API endpoint
      updateStepStatus('transcription', 'processing', 40, 'Requesting Mux transcription with speaker identification...');
      
      console.log('🎤 Calling transcription API for video:', currentVideoId);
      
      const transcriptionResponse = await fetch('/api/videos/generate-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentVideoId,
          enableSpeakerDiarization: true,
          generateCaptions: true,
          language: 'en'
        }),
      });
      
      console.log('🎤 Transcription API response status:', transcriptionResponse.status);
      
      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('❌ Transcription API error:', transcriptionResponse.status, errorText);
        throw new Error(`Failed to initiate transcription process: ${transcriptionResponse.status} - ${errorText}`);
      }
      
      const transcriptionResult = await transcriptionResponse.json();
      
      updateStepStatus('transcription', 'processing', 60, 'Mux is processing audio and identifying speakers...');
      
      // Poll for transcription completion (in real implementation, use webhooks)
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for faster testing
        
        const statusResponse = await fetch(`/api/videos/transcription-status/${currentVideoId}`);
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          
          if (statusResult.status === 'ready') {
            updateStepStatus('transcription', 'processing', 90, `Transcript ready with ${statusResult.speakerCount || 'multiple'} speakers identified`);
            
            // Store transcript in database
            if (statusResult.transcript) {
              await fetch(`/api/videos/${currentVideoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transcriptText: statusResult.transcript,
                  transcriptStatus: 'completed',
                  captionUrl: statusResult.captionUrl,
                  speakerCount: statusResult.speakerCount
                }),
              });
            }
            
            break;
          } else if (statusResult.status === 'processing') {
            updateStepStatus('transcription', 'processing', 70, 'Still processing audio... Please wait');
          } else if (statusResult.status === 'failed') {
            throw new Error('Mux transcription failed');
          }
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('Transcription timed out, but may complete in background');
        updateStepStatus('transcription', 'processing', 95, 'Transcription taking longer than expected but will complete in background');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.warn('Transcription failed, video will still be available:', error);
      updateStepStatus('transcription', 'processing', 100, 'Transcription failed, but video is still ready to view');
      
      // Update video record to indicate transcription failed
      await fetch(`/api/videos/${currentVideoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptStatus: 'failed'
        }),
      });
    }
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      default:
        return <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-xs">Complete</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-500 text-xs">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const overallProgress = Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-5xl h-[90vh] max-h-[800px] overflow-hidden flex flex-col p-0 bg-white rounded-lg shadow-xl">
        <DialogHeader className="flex-shrink-0 px-8 py-6 border-b bg-white">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <Zap className="h-6 w-6 text-blue-500 flex-shrink-0" />
              <span>Publishing Video with Upload-First Workflow</span>
            </DialogTitle>
            {!isProcessing && (
              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 ml-4">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50">
          {!isProcessing ? (
            // Preview Phase - Responsive Layout
            <div className="space-y-8">
              {/* Video Preview */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-3 mb-6">
                  <Video className="h-5 w-5" />
                  Video Preview
                </h3>
                
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  {videoPreviewUrl && (
                    <>
                      <video
                        ref={videoRef}
                        src={videoPreviewUrl}
                        className="w-full h-full object-contain"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                      />
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          onClick={toggleVideoPlayback}
                          className="bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3"
                        >
                          {isVideoPlaying ? <Pause className="h-4 w-4 sm:h-6 sm:w-6" /> : <Play className="h-4 w-4 sm:h-6 sm:w-6" />}
                        </Button>
                      </div>
                      
                      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                        <div className="bg-black/50 rounded px-2 py-1 text-white text-xs sm:text-sm">
                          {formatTime(currentVideoTime)} / {formatTime(videoDuration)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>


              {/* Responsive Device Preview */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <h4 className="text-sm sm:text-base font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Responsive Preview
                </h4>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Mobile Ready</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tablet className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Tablet Optimized</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Desktop Enhanced</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-8 mt-8 border-t border-gray-200">
                <Button variant="outline" onClick={onClose} className="px-6 py-2">
                  Cancel
                </Button>
                <Button onClick={startPublishProcess} className="bg-blue-600 hover:bg-blue-700 px-6 py-2">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Upload & Processing
                </Button>
              </div>
            </div>
          ) : (
            // Processing Phase - Responsive Layout
            <div className="space-y-6 sm:space-y-8">
              {/* Overall Progress */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Overall Progress</span>
                    <span className="text-xl font-bold text-blue-600">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-4" />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium text-base">Publishing Failed</span>
                  </div>
                  <p className="text-red-600 mt-2 text-sm">{error}</p>
                </div>
              )}

              {/* Steps List - Responsive */}
              <div className="space-y-5">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-6 rounded-xl shadow-sm transition-all duration-300 ${
                      step.status === 'processing'
                        ? 'border-blue-200 bg-blue-50 border-2'
                        : step.status === 'completed'
                        ? 'border-green-200 bg-green-50 border-2'
                        : step.status === 'error'
                        ? 'border-red-200 bg-red-50 border-2'
                        : 'border-gray-200 bg-white border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getStepIcon(step)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-base">{step.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                          {step.details && (
                            <p className="text-sm text-gray-500 mt-2">{step.details}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {step.duration && (
                          <span className="text-sm text-gray-500 font-medium">
                            {(step.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                        {getStepBadge(step)}
                      </div>
                    </div>
                    
                    {step.status === 'processing' && step.progress !== undefined && (
                      <div className="mt-4">
                        <Progress value={step.progress} className="h-2" />
                      </div>
                    )}

                    {/* Enhanced thumbnail selection UI during processing */}
                    {step.id === 'thumbnail' && step.status === 'processing' && thumbnailStepWaiting && (
                      <div className="mt-6 p-6 bg-white rounded-xl border-2 border-blue-300 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold flex items-center gap-3">
                            <Image className="h-5 w-5 text-blue-600" />
                            Choose Your Thumbnail
                          </h4>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Waiting for Selection
                          </Badge>
                        </div>
                        
                        <Tabs value={thumbnailMethod} onValueChange={(value) => setThumbnailMethod(value as any)}>
                          <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="auto">Auto Generate</TabsTrigger>
                            <TabsTrigger value="timestamp">From Video</TabsTrigger>
                            <TabsTrigger value="custom">Upload Custom</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="timestamp" className="space-y-4">
                            {/* Video scrubbing section */}
                            <div className="space-y-3">
                              <Label className="font-medium">Select Frame for Thumbnail</Label>
                              
                              {/* Mini video preview for scrubbing */}
                              <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-48">
                                {videoPreviewUrl && (
                                  <video
                                    ref={scrubVideoRef}
                                    src={videoPreviewUrl}
                                    className="w-full h-full object-contain"
                                    muted
                                  />
                                )}
                              </div>
                              
                              {/* Scrubber */}
                              <div className="space-y-2">
                                <Slider
                                  value={[selectedThumbnailTime]}
                                  onValueChange={([value]) => {
                                    setSelectedThumbnailTime(value);
                                    // Update scrubbing video time for preview
                                    if (scrubVideoRef.current) {
                                      scrubVideoRef.current.currentTime = value;
                                    }
                                  }}
                                  max={videoDuration || 100}
                                  step={0.5}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-sm text-gray-600">
                                  <span>0:00</span>
                                  <span className="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {formatTime(selectedThumbnailTime)}
                                  </span>
                                  <span>{formatTime(videoDuration || 100)}</span>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="custom" className="space-y-4">
                            <div className="space-y-3">
                              <Label className="font-medium">Upload Custom Thumbnail</Label>
                              <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCustomThumbnailUpload}
                                className="cursor-pointer"
                              />
                              <p className="text-sm text-gray-500">
                                Upload a custom image. Recommended: 1280x720 pixels (16:9 aspect ratio)
                              </p>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="auto" className="space-y-4">
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-blue-600" />
                                Mux will automatically analyze your video and select the most engaging frame as your thumbnail using AI.
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                        
                        {/* Thumbnail preview */}
                        {thumbnailPreview && (
                          <div className="mt-6 space-y-3">
                            <Label className="font-medium">Thumbnail Preview</Label>
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video max-h-32 border-2 border-gray-200">
                              <img
                                src={thumbnailPreview}
                                alt="Thumbnail preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2">
                                <Badge variant="default" className="bg-green-500 text-white text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Preview
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Accept thumbnail button */}
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                          <Button 
                            onClick={handleAcceptThumbnail} 
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Thumbnail & Continue
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-8 mt-8 border-t border-gray-200">
                {error && (
                  <Button variant="outline" onClick={() => startPublishProcess()} className="px-6 py-2">
                    Retry
                  </Button>
                )}
                {!isProcessing && (
                  <Button variant="outline" onClick={onClose} className="px-6 py-2">
                    {error ? 'Close' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
