"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SteppedVideoUpload } from "./SteppedVideoUpload";
import { UploadFirstServerlessModal } from "./UploadFirstServerlessModal";

interface ContentData {
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
  status: string;
  metadata: {
    abstract?: string;
    transcript?: string;
    instructions?: string;
    eventDate?: string;
    location?: string;
    dueDate?: string;
    duration?: string;
    visibility?: string;
    publishDate?: string;
    author?: string;
    videoId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    originalFilename?: string;
    pendingFile?: File;
    autoThumbnail?: string;
    customThumbnail?: File;
    uploadMethod?: string;
    monitorSessionId?: string;
    [key: string]: unknown;
  };
}

interface ContentEditorProps {
  contentType: "article" | "video" | "event" | "assignment";
  initialContent?: Partial<ContentData>;
  onSave?: (content: ContentData) => void;
  onPublish?: (content: ContentData) => void;
  className?: string;
}

export function ContentEditor({
  contentType,
  initialContent,
  onSave,
  onPublish,
  className
}: ContentEditorProps) {
  const [content, setContent] = useState<ContentData>({
    title: "",
    description: "",
    body: "",
    category: "",
    tags: [] as string[],
    status: "draft",
    metadata: {},
    ...initialContent
  });

  const [currentTag, setCurrentTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean;
    currentStep: string;
    percentage: number;
    currentPart?: number;
    totalParts?: number;
    bytesUploaded?: number;
    totalBytes?: number;
    estimatedTimeRemaining?: string;
  }>({
    isUploading: false,
    currentStep: '',
    percentage: 0
  });
  const [hasUploadedVideo, setHasUploadedVideo] = useState(false);
  const [showServerlessPublishModal, setShowServerlessPublishModal] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content.body || content.title) {
        handleAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [content]);

  // Word count
  useEffect(() => {
    const words = content.body.split(/\s+/).filter((word: string) => word.length > 0).length;
    setWordCount(words);
  }, [content.body]);

  const handleAutoSave = async () => {
    // Skip auto-save if there's a pending video file to prevent duplicate uploads
    if (content.metadata.pendingFile && !hasUploadedVideo) {
      console.log('🎬 ⚠️ Skipping auto-save - pending video file detected');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        onSave({ ...content, status: "draft" });
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // Prevent multiple simultaneous publish attempts
    if (isSaving || showServerlessPublishModal) {
      console.log('🎬 ⚠️ Publish already in progress, ignoring duplicate request');
      return;
    }

    console.log('🎬 Starting serverless publish with video preview and stepped modal...');
    
    // Show the serverless stepped progress modal
    setShowServerlessPublishModal(true);
  };

  const handleServerlessPublishComplete = async (success: boolean, result?: any) => {
    setShowServerlessPublishModal(false);
    
    if (success) {
      console.log('🎬 ✅ Serverless publish completed successfully:', result);
      
      // Update content status and call onPublish if provided
      const publishedContent = { ...content, status: "published" };
      setContent(publishedContent);
      
      if (onPublish) {
        onPublish(publishedContent);
      }
      
      setLastSaved(new Date());
      setHasUploadedVideo(true);
      
      // Clear pending file data since it's now published
      setContent(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          pendingFile: undefined,
          autoThumbnail: undefined,
          customThumbnail: undefined,
          uploadMethod: undefined,
          monitorSessionId: undefined
        }
      }));
      
    } else {
      console.error('🎬 ❌ Serverless publish failed:', result?.error);
      alert(`Publish failed: ${result?.error || 'Unknown error'}`);
    }
  };

  const handleSaveAsDraft = async () => {
    console.log('🎬 Saving as draft:', { 
      title: content.title, 
      hasPendingFile: !!content.metadata.pendingFile,
      metadata: content.metadata 
    });
    
    setIsSaving(true);
    try {
      // If there's a pending video file, upload it first
      if (content.metadata.pendingFile) {
        console.log('🎬 Starting video upload before save...');
        await handleActualVideoUpload();
        console.log('🎬 Video upload completed, proceeding with save...');
      }
      
      if (onSave) {
        onSave({ ...content, status: "draft" });
      } else {
        console.log('🎬 No onSave handler provided, content saved locally');
      }
      setLastSaved(new Date());
      console.log('🎬 ✅ Save as draft completed successfully');
    } catch (error) {
      console.error('🎬 ❌ Save draft failed:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: Handle the actual video upload when saving/publishing
  const handleActualVideoUpload = async () => {
    const pendingFile = content.metadata.pendingFile as File;
    const autoThumbnail = content.metadata.autoThumbnail as string;
    const customThumbnail = content.metadata.customThumbnail as File;
    const uploadMethod = content.metadata.uploadMethod as string;
    const monitorSessionId = content.metadata.monitorSessionId as string;

    if (!pendingFile) return;

    // Prevent duplicate uploads
    if (hasUploadedVideo) {
      console.log('🎬 ⚠️ Video already uploaded, skipping duplicate upload');
      return;
    }

    const logStep = async (step: string, status: 'success' | 'error' | 'pending', details: any = {}, error?: string) => {
      if (monitorSessionId) {
        try {
          await fetch('/api/debug/upload-monitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'log',
              sessionId: monitorSessionId,
              data: { step, status, details, error }
            })
          });
        } catch (e) {
          console.warn('Failed to log step:', e);
        }
      }
    };

    try {
      console.log('🎬 Starting actual video upload for:', pendingFile.name);
      
      await logStep('content_editor_upload_start', 'pending', {
        filename: pendingFile.name,
        fileSize: pendingFile.size,
        uploadMethod: uploadMethod,
        contentTitle: content.title,
        contentDescription: content.description
      });

      let uploadResult;

      await logStep('s3_upload_start', 'pending', { uploadMethod });

      if (uploadMethod === 'multipart') {
        uploadResult = await uploadMultipartFile(pendingFile);
      } else {
        uploadResult = await uploadSingleFile(pendingFile);
      }

      await logStep('s3_upload_complete', 'success', {
        s3Key: uploadResult.s3Key,
        publicUrl: uploadResult.publicUrl
      });

      // Save video metadata to database
      await logStep('database_save_start', 'pending');

      const videoResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          description: content.description,
          category: content.category,
          tags: content.tags.join(','),
          visibility: content.metadata.visibility || 'private',
          s3Key: uploadResult.s3Key,
          publicUrl: uploadResult.publicUrl,
          filename: pendingFile.name,
          size: pendingFile.size,
          mimeType: pendingFile.type,
          autoThumbnail: autoThumbnail
        }),
      });

      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        await logStep('database_save_failed', 'error', { 
          status: videoResponse.status,
          statusText: videoResponse.statusText,
          response: errorText
        }, `Failed to save video metadata: ${videoResponse.status} - ${errorText}`);
        throw new Error('Failed to save video metadata');
      }

      const videoData = await videoResponse.json();

      await logStep('database_save_complete', 'success', {
        videoId: videoData.video?.id,
        videoTitle: videoData.video?.title
      });

      // Handle custom thumbnail if provided
      if (customThumbnail && videoData.video?.id) {
        await logStep('custom_thumbnail_upload_start', 'pending');

        const thumbnailFormData = new FormData();
        thumbnailFormData.append('thumbnail', customThumbnail);

        const thumbnailResponse = await fetch(`/api/videos/thumbnail/${videoData.video.id}`, {
          method: 'POST',
          body: thumbnailFormData,
        });

        if (thumbnailResponse.ok) {
          await logStep('custom_thumbnail_upload_complete', 'success');
        } else {
          await logStep('custom_thumbnail_upload_failed', 'error', {}, 'Custom thumbnail upload failed');
        }
      }

      // Update content metadata with the real video data
      setContent(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          videoId: videoData.video.id,
          videoUrl: videoData.video.streamUrl,
          thumbnailUrl: videoData.video.thumbnailPath,
          // Remove pending file data
          pendingFile: undefined,
          autoThumbnail: undefined,
          customThumbnail: undefined,
          uploadMethod: undefined,
          monitorSessionId: undefined
        }
      }));

      await logStep('content_editor_upload_complete', 'success', {
        finalVideoId: videoData.video.id,
        finalVideoUrl: videoData.video.streamUrl,
        finalThumbnailUrl: videoData.video.thumbnailPath
      });

      // Mark session as complete
      if (monitorSessionId) {
        await fetch('/api/debug/upload-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            sessionId: monitorSessionId,
            data: {
              videoId: videoData.video.id,
              title: content.title,
              finalUrl: videoData.video.streamUrl
            }
          })
        });
      }

      // Mark video as uploaded to prevent duplicates
      setHasUploadedVideo(true);
      
      console.log('🎬 ✅ Video upload completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      await logStep('content_editor_upload_failed', 'error', {
        stack: error instanceof Error ? error.stack : undefined
      }, errorMessage);

      // Mark session as failed
      if (monitorSessionId) {
        await fetch('/api/debug/upload-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'error',
            sessionId: monitorSessionId,
            data: {
              error: errorMessage,
              details: {
                contentTitle: content.title,
                filename: pendingFile?.name
              }
            }
          })
        });
      }

      console.error('🎬 ❌ Video upload failed:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  // Helper functions for video upload
  const uploadSingleFile = async (file: File) => {
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

    // Upload file to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    return { s3Key, publicUrl };
  };

  const uploadMultipartFile = async (file: File) => {
    console.log('🎬 Starting multipart upload for large file:', file.name, file.size);
    
    // Initialize progress tracking
    setUploadProgress({
      isUploading: true,
      currentStep: 'Initializing multipart upload...',
      percentage: 0,
      totalBytes: file.size,
      bytesUploaded: 0
    });
    
    // Initialize multipart upload
    const initResponse = await fetch('/api/videos/multipart-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!initResponse.ok) {
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
      throw new Error('Failed to initialize multipart upload');
    }

    const { uploadId, s3Key, bucketName, partSize, totalParts, publicUrl } = await initResponse.json();
    console.log('🎬 Multipart upload initialized:', { uploadId: uploadId.substring(0, 20) + '...', totalParts });

    setUploadProgress(prev => ({
      ...prev,
      currentStep: `Uploading ${totalParts} parts...`,
      totalParts,
      currentPart: 0,
      percentage: 5
    }));

    const parts = [];
    let bytesUploaded = 0;
    const startTime = Date.now();
    
    // Upload each part
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const partData = file.slice(start, end);
      
      // Calculate estimated time remaining
      const elapsedTime = Date.now() - startTime;
      const avgTimePerPart = elapsedTime / (partNumber - 1 || 1);
      const remainingParts = totalParts - partNumber + 1;
      const estimatedTimeRemaining = remainingParts * avgTimePerPart;
      const timeRemainingStr = estimatedTimeRemaining > 60000 
        ? `${Math.ceil(estimatedTimeRemaining / 60000)}m` 
        : `${Math.ceil(estimatedTimeRemaining / 1000)}s`;
      
      const partPercentage = 5 + ((partNumber - 1) / totalParts) * 85; // 5% for init, 85% for upload, 10% for completion
      
      setUploadProgress(prev => ({
        ...prev,
        currentStep: `Uploading part ${partNumber}/${totalParts} (${(partData.size / (1024*1024)).toFixed(1)}MB)`,
        percentage: Math.round(partPercentage),
        currentPart: partNumber,
        bytesUploaded,
        estimatedTimeRemaining: partNumber > 1 ? timeRemainingStr : undefined
      }));
      
      console.log(`🎬 Uploading part ${partNumber}/${totalParts} (${(partData.size / (1024*1024)).toFixed(1)}MB)`);
      
      // Get presigned URL for this part
      const partUrlResponse = await fetch('/api/videos/multipart-upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          s3Key,
          partNumber,
          contentType: file.type
        }),
      });

      if (!partUrlResponse.ok) {
        setUploadProgress(prev => ({ ...prev, isUploading: false }));
        throw new Error(`Failed to get upload URL for part ${partNumber}`);
      }

      const { presignedUrl } = await partUrlResponse.json();

      // Upload the part
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: partData,
      });

      if (!uploadResponse.ok) {
        setUploadProgress(prev => ({ ...prev, isUploading: false }));
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      const etag = uploadResponse.headers.get('ETag');
      if (!etag) {
        setUploadProgress(prev => ({ ...prev, isUploading: false }));
        throw new Error(`No ETag received for part ${partNumber}`);
      }

      parts.push({
        partNumber,
        etag: etag.replace(/"/g, '') // Remove quotes from ETag
      });

      bytesUploaded += partData.size;
    }

    console.log('🎬 All parts uploaded, completing multipart upload...');

    setUploadProgress(prev => ({
      ...prev,
      currentStep: 'Finalizing upload...',
      percentage: 95,
      bytesUploaded: file.size
    }));

    // Complete multipart upload
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
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
      throw new Error('Failed to complete multipart upload');
    }

    const result = await completeResponse.json();
    console.log('🎬 ✅ Multipart upload completed successfully');

    setUploadProgress(prev => ({
      ...prev,
      currentStep: 'Upload completed successfully!',
      percentage: 100
    }));

    // Clear progress after a short delay
    setTimeout(() => {
      setUploadProgress({
        isUploading: false,
        currentStep: '',
        percentage: 0
      });
    }, 2000);

    return {
      s3Key,
      publicUrl: result.publicUrl || publicUrl
    };
  };

  const addTag = () => {
    if (currentTag && !content.tags.includes(currentTag)) {
      setContent({
        ...content,
        tags: [...content.tags, currentTag]
      });
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setContent({
      ...content,
      tags: content.tags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  const getContentTypeConfig = () => {
    switch (contentType) {
      case "article":
        return {
          title: "Article Editor",
          description: "Create and edit articles with rich formatting",
          categories: ["Constitutional Law", "Corporate Law", "Criminal Law", "Environmental Law", "International Law"],
          showAbstract: true,
          showCitations: true
        };
      case "video":
        return {
          title: "Video Content Editor",
          description: "Upload and manage video content",
          categories: ["Lecture", "Tutorial", "Seminar", "Conference", "Documentary"],
          showVideoUrl: true,
          showDuration: true,
          showTranscript: true
        };
      case "event":
        return {
          title: "Event Editor",
          description: "Create and manage events",
          categories: ["Conference", "Workshop", "Seminar", "Symposium", "Guest Lecture"],
          showDate: true,
          showLocation: true,
          showRegistration: true
        };
      case "assignment":
        return {
          title: "Assignment Editor",
          description: "Create and manage student assignments",
          categories: ["Essay", "Research Paper", "Case Study", "Presentation", "Group Project"],
          showDueDate: true,
          showInstructions: true,
          showRubric: true
        };
      default:
        return {
          title: "Content Editor",
          description: "Create and edit content",
          categories: [],
          showAbstract: false
        };
    }
  };

  const config = getContentTypeConfig();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-sm text-slate-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <Badge variant="secondary">Saving...</Badge>
              )}
              <Badge variant={content.status === "published" ? "default" : "outline"}>
                {content.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  placeholder="Enter title..."
                  className="text-lg"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={content.description}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>

              {config.showAbstract && (
                <div>
                  <Label htmlFor="abstract">Abstract</Label>
                  <Textarea
                    id="abstract"
                    value={content.metadata.abstract || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, abstract: e.target.value }
                    })}
                    placeholder="Article abstract..."
                    rows={4}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="body">Content Body</Label>
                  <span className="text-sm text-slate-500">
                    {wordCount} words
                  </span>
                </div>
                <Textarea
                  id="body"
                  value={content.body}
                  onChange={(e) => setContent({ ...content, body: e.target.value })}
                  placeholder="Start writing..."
                  rows={20}
                  className="font-mono"
                />
              </div>

              {config.showVideoUrl && (
                <div className="space-y-4">
                  <SteppedVideoUpload
                    onUploadComplete={(videoData) => {
                      // Store the video data for later upload when saving/publishing
                      setContent({
                        ...content,
                        title: content.title || videoData.title,
                        description: content.description || videoData.description,
                        category: videoData.category,
                        metadata: {
                          ...content.metadata,
                          // Store pending file data instead of creating video immediately
                          pendingFile: videoData.pendingFile,
                          autoThumbnail: videoData.autoThumbnail,
                          customThumbnail: videoData.customThumbnail,
                          uploadMethod: videoData.uploadMethod,
                          monitorSessionId: videoData.monitorSessionId,
                          duration: videoData.duration,
                          fileSize: videoData.size,
                          originalFilename: videoData.originalFilename
                        }
                      });
                    }}
                    onUploadError={(error) => {
                      console.error("Video upload preparation failed:", error);
                    }}
                  />
                </div>
              )}

              {config.showTranscript && (
                <div>
                  <Label htmlFor="transcript">Transcript</Label>
                  <Textarea
                    id="transcript"
                    value={content.metadata.transcript || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, transcript: e.target.value }
                    })}
                    placeholder="Video transcript..."
                    rows={10}
                  />
                </div>
              )}

              {config.showInstructions && (
                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={content.metadata.instructions || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, instructions: e.target.value }
                    })}
                    placeholder="Assignment instructions..."
                    rows={8}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={content.category} 
                  onValueChange={(value) => setContent({ ...content, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button onClick={addTag} type="button">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag: string) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {config.showDate && (
                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    id="eventDate"
                    type="datetime-local"
                    value={content.metadata.eventDate || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, eventDate: e.target.value }
                    })}
                  />
                </div>
              )}

              {config.showLocation && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={content.metadata.location || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, location: e.target.value }
                    })}
                    placeholder="Event location..."
                  />
                </div>
              )}

              {config.showDueDate && (
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={content.metadata.dueDate || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, dueDate: e.target.value }
                    })}
                  />
                </div>
              )}

              {config.showDuration && (
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={content.metadata.duration || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, duration: e.target.value }
                    })}
                    placeholder="Video duration..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>This is how your content will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <article className="prose prose-slate max-w-none">
                <h1>{content.title || "Untitled"}</h1>
                {content.description && (
                  <p className="lead">{content.description}</p>
                )}
                {content.category && (
                  <div className="mb-4">
                    <Badge>{content.category}</Badge>
                  </div>
                )}
                {content.metadata.abstract && (
                  <div className="mb-6">
                    <h3>Abstract</h3>
                    <p>{content.metadata.abstract}</p>
                  </div>
                )}
                
                {/* Video Preview */}
                {content.metadata.videoUrl && (
                  <div className="mb-6">
                    <h3>Video</h3>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                      <video 
                        controls 
                        className="w-full h-full object-cover"
                        poster={content.metadata.thumbnailUrl}
                      >
                        <source src={content.metadata.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    {content.metadata.duration && (
                      <p className="text-sm text-slate-600 mt-2">
                        Duration: {Math.floor(Number(content.metadata.duration) / 60)}:{(Number(content.metadata.duration) % 60).toString().padStart(2, '0')} | 
                        Size: {content.metadata.fileSize ? (Number(content.metadata.fileSize) / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown'}
                      </p>
                    )}
                  </div>
                )}
                
                <Separator className="my-6" />
                <div className="whitespace-pre-wrap">{content.body}</div>
                {content.tags.length > 0 && (
                  <div className="mt-6">
                    <h4>Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {content.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
              <CardDescription>Configure how your content is published</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select 
                  value={content.metadata.visibility || "public"} 
                  onValueChange={(value) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, visibility: value }
                  })}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="publishDate">Publish Date</Label>
                <Input
                  id="publishDate"
                  type="datetime-local"
                  value={content.metadata.publishDate || ""}
                  onChange={(e) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, publishDate: e.target.value }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={content.metadata.author || ""}
                  onChange={(e) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, author: e.target.value }
                  })}
                  placeholder="Author name..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleSaveAsDraft}
                disabled={isSaving || !content.title.trim()}
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="outline">
                Preview
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                Schedule
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={isSaving || !content.title.trim()}
              >
                {isSaving ? 'Publishing...' : 'Publish Now'}
              </Button>
            </div>
          </div>
          
          {/* Upload Progress Indicator */}
          {uploadProgress.isUploading && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-900">Uploading Video</span>
                </div>
                <span className="text-sm font-bold text-blue-700">{uploadProgress.percentage}%</span>
              </div>
              
              <Progress value={uploadProgress.percentage} className="mb-3 h-2" />
              
              <div className="space-y-1">
                <p className="text-sm text-blue-700 font-medium">
                  {uploadProgress.currentStep}
                </p>
                
                {uploadProgress.currentPart && uploadProgress.totalParts && (
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>Part {uploadProgress.currentPart} of {uploadProgress.totalParts}</span>
                    {uploadProgress.estimatedTimeRemaining && (
                      <span>~{uploadProgress.estimatedTimeRemaining} remaining</span>
                    )}
                  </div>
                )}
                
                {uploadProgress.bytesUploaded && uploadProgress.totalBytes && (
                  <div className="text-xs text-blue-600">
                    {(uploadProgress.bytesUploaded / (1024*1024*1024)).toFixed(2)}GB / {(uploadProgress.totalBytes / (1024*1024*1024)).toFixed(2)}GB uploaded
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                💡 <strong>Please don't close this page or click publish again.</strong> Your large video is being uploaded in parts for reliability.
              </div>
            </div>
          )}

          {content.metadata.pendingFile && !uploadProgress.isUploading && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                ✅ Video ready: {(content.metadata.pendingFile as File)?.name || 'Unknown'} ({(content.metadata.pendingFile as File)?.size ? ((content.metadata.pendingFile as File).size / (1024*1024)).toFixed(1) : '0'}MB)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Click "Save Draft" or "Publish Now" to upload and save your video content.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload-First Serverless Publish Modal with Video Preview */}
      {showServerlessPublishModal && (
        <UploadFirstServerlessModal
          isOpen={showServerlessPublishModal}
          onClose={() => setShowServerlessPublishModal(false)}
          onComplete={handleServerlessPublishComplete}
          contentData={content}
        />
      )}
    </div>
  );
}
