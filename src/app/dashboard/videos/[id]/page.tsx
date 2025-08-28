'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Edit, Trash2, Play, Clock, FileVideo, Globe, Lock, Users, AlertTriangle } from 'lucide-react';
import { SmartVideoPlayer } from '@/components/SmartVideoPlayer';
import { VideoEditModal } from '@/components/VideoEditModal';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Video {
  id: string;
  title: string;
  description?: string;
  filename: string;
  file_size: number;
  duration?: number;
  created_at: string;
  updated_at: string;
  s3_key?: string;
  thumbnail_path?: string;
  thumbnailUrl?: string;
  streamUrl?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  processing_status?: string;
  transcript?: string;
  captions_url?: string;
  audio_enhanced?: boolean;
  tags?: string[];
  category?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  is_public?: boolean;
  status?: string;
  views?: number;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/videos/${videoId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVideo(data.video);
      } else {
        throw new Error(data.error || 'Failed to load video');
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEditVideo = async (updatedVideo: Partial<Video>) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedVideo),
      });

      if (!response.ok) {
        throw new Error('Failed to update video');
      }

      const data = await response.json();
      
      if (data.success) {
        setVideo(data.video);
        setIsEditModalOpen(false);
        // Simple success notification (you could replace with a proper toast)
        alert('Video updated successfully!');
      } else {
        throw new Error(data.error || 'Failed to update video');
      }
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Failed to update video. Please try again.');
    }
  };

  const handleDeleteVideo = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      const data = await response.json();
      
      if (data.success) {
        // Redirect to videos list after successful deletion
        router.push('/dashboard/videos');
      } else {
        throw new Error(data.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDownload = () => {
    if (video?.streamUrl) {
      window.open(video.streamUrl, '_blank');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/videos/${videoId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title,
          text: video?.description,
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        alert('Video link copied to clipboard!');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Video link copied to clipboard!');
    }
  };

  const getVisibilityIcon = (visibility?: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4 text-green-600" />;
      case 'unlisted':
        return <Users className="h-4 w-4 text-yellow-600" />;
      default:
        return <Lock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getVisibilityLabel = (visibility?: string) => {
    switch (visibility) {
      case 'public':
        return 'Public';
      case 'unlisted':
        return 'Unlisted';
      default:
        return 'Private';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="aspect-video bg-gray-200 rounded mb-6"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/dashboard/videos" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Videos
          </Link>
          
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error || 'The requested video could not be found.'}
            </p>
            <Link 
              href="/dashboard/videos"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Videos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/dashboard/videos" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Videos
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-gray-600 hover:text-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-gray-600 hover:text-blue-600"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-gray-600 hover:text-blue-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-gray-600 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <SmartVideoPlayer
                  videoId={video.id}
                  playbackId={video.mux_playback_id}
                  title={video.title}
                  poster={video.thumbnailUrl || video.thumbnail_path}
                  s3Key={video.s3_key}
                  filePath={video.streamUrl}
                  className="w-full aspect-video"
                />
              </div>
            </div>

            {/* Enhanced Transcript Section */}
            <TranscriptDisplay
              videoId={video.id}
              transcriptText={video.transcript}
              onTimestampClick={(timestamp) => {
                // Find video element and seek to timestamp
                const videoElement = document.querySelector('video');
                if (videoElement) {
                  videoElement.currentTime = timestamp;
                }
              }}
              showSpeakerStats={true}
              showSearch={true}
              showDownload={true}
            />
          </div>

          {/* Video Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
                <div className="flex items-center space-x-2">
                  {getVisibilityIcon(video.visibility || (video.is_public ? 'public' : 'private'))}
                  <Badge variant={video.is_public ? 'default' : 'secondary'}>
                    {getVisibilityLabel(video.visibility || (video.is_public ? 'public' : 'private'))}
                  </Badge>
                </div>
              </div>
              
              {video.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm">{video.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">File Size</span>
                  <span className="font-medium">{formatFileSize(video.file_size)}</span>
                </div>
                
                {video.duration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{formatDuration(video.duration)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Format</span>
                  <span className="font-medium">{video.filename.split('.').pop()?.toUpperCase()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Uploaded</span>
                  <span className="font-medium">
                    {new Date(video.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Mux Status */}
            {video.mux_asset_id && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-green-600" />
                  Mux Integration
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Asset ID</span>
                    <span className="font-mono text-xs">{video.mux_asset_id.substring(0, 12)}...</span>
                  </div>
                  
                  {video.mux_playback_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Playback ID</span>
                      <span className="font-mono text-xs">{video.mux_playback_id.substring(0, 12)}...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileVideo className="w-5 h-5 mr-2 text-blue-600" />
                Technical Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Video ID</span>
                  <span className="font-mono text-xs">{video.id}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Filename</span>
                  <span className="text-xs">{video.filename}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium">
                    {new Date(video.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {video && (
          <VideoEditModal
            video={video}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleEditVideo}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Delete Video
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{video?.title}"? This action cannot be undone.
                The video file and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVideo}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Video'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
