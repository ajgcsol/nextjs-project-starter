"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Clock, 
  Eye, 
  Calendar,
  FileVideo,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipBack,
  SkipForward
} from 'lucide-react';
import Link from 'next/link';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  uploadDate: string;
  category: string;
  status: 'processing' | 'ready' | 'error';
  size: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  transcriptUrl?: string;
  captionsUrl?: string;
}

// Simple, reliable video player component
function VideoPlayer({ video }: { video: Video }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try multiple video sources in order of preference
    const tryVideoSources = async () => {
      setIsLoading(true);
      setError(null);

      const sources = [
        video.videoUrl, // Direct video URL if available
        `/api/videos/stream/${video.id}`, // API streaming endpoint
        `https://d24qjgz9z4yzof.cloudfront.net/videos/${video.id}.mp4`, // CloudFront direct
        `https://d24qjgz9z4yzof.cloudfront.net/videos/${video.id}.wmv`, // CloudFront WMV
      ].filter(Boolean);

      for (const source of sources) {
        try {
          // Test if source is accessible
          const response = await fetch(source!, { method: 'HEAD' });
          if (response.ok) {
            setVideoSrc(source!);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.log(`Source ${source} failed, trying next...`);
        }
      }

      // If all sources fail, try the API for metadata
      try {
        const response = await fetch(`/api/videos/stream/${video.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.videoUrl) {
            setVideoSrc(data.videoUrl);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('API metadata fetch failed');
      }

      setError('Video is not available for playback');
      setIsLoading(false);
    };

    tryVideoSources();
  }, [video.id, video.videoUrl]);

  const togglePlayPause = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play();
    }
  };

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    setCurrentTime(videoEl.currentTime);
  };

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    setDuration(videoEl.duration);
    setIsLoading(false);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSeek = (time: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = time;
  };

  const toggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsMuted(videoEl.muted);
  };

  const handleVolumeChange = (newVolume: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.volume = newVolume;
    setVolume(newVolume);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoSrc) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{error || 'Video not available'}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-black"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={() => setError('Failed to load video')}
        poster={video.thumbnailUrl}
        preload="metadata"
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            size="lg"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm border border-white border-opacity-20 rounded-full p-6"
          >
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </Button>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="relative h-1 bg-white bg-opacity-30 rounded-full cursor-pointer">
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={togglePlayPause}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <Button
                onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleMute}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20 h-1 bg-white bg-opacity-30 rounded-full"
                />
              </div>

              <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              onClick={toggleFullscreen}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoWatchPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchVideo(params.id as string);
    }
  }, [params.id]);

  const fetchVideo = async (id: string) => {
    try {
      const response = await fetch(`/api/videos/${id}`);
      if (response.ok) {
        const data = await response.json();
        setVideo(data);
        
        // Increment view count
        fetch(`/api/videos/${id}/view`, { method: 'POST' }).catch(() => {});
      } else {
        setError('Video not found');
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Not Found</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link href="/videos">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Videos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Back Button */}
        <Link href="/videos">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
        </Link>

        {/* Video Player */}
        <Card>
          <CardContent className="p-6">
            <VideoPlayer video={video} />
          </CardContent>
        </Card>

        {/* Video Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {video.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(video.uploadDate)}
                      </span>
                      <Badge 
                        variant={video.status === 'ready' ? 'default' : video.status === 'processing' ? 'secondary' : 'destructive'}
                      >
                        {video.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {video.description || 'No description available.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Transcript Section */}
            <TranscriptDisplay
              videoId={video.id}
              transcriptText={video.transcriptUrl ? undefined : undefined} // Will fetch from API
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

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Video Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Video Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="outline">{video.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Size:</span>
                    <span className="font-medium">{formatFileSize(video.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge 
                      variant={video.status === 'ready' ? 'default' : video.status === 'processing' ? 'secondary' : 'destructive'}
                    >
                      {video.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                  {video.transcriptUrl && (
                    <Button className="w-full" variant="outline">
                      <FileVideo className="h-4 w-4 mr-2" />
                      Download Transcript
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
