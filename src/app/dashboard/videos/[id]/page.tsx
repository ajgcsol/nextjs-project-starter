"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MuxVideoPlayer } from "@/components/MuxVideoPlayer";
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Users,
  Calendar,
  Play,
  Sparkles,
  Captions,
  Volume2
} from "lucide-react";

interface VideoData {
  id: string;
  title: string;
  description: string;
  filename: string;
  duration: number;
  size: number;
  uploadDate: string;
  status: string;
  visibility: string;
  category: string;
  tags: string[];
  views: number;
  createdBy: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  // Mux integration fields
  mux_asset_id?: string;
  mux_playback_id?: string;
  mux_status?: string;
  mux_thumbnail_url?: string;
  mux_streaming_url?: string;
  transcript_text?: string;
  captions_webvtt_url?: string;
  audio_enhanced?: boolean;
}

export default function VideoPlayerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchVideo();
  }, [params.id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/videos/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Video not found');
      }
      
      const data = await response.json();
      if (data.success && data.video) {
        setVideo(data.video);
        // Set the stream URL for the video player
        setStreamUrl(`/api/videos/stream/${params.id}`);
      } else {
        throw new Error('Failed to load video');
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (streamUrl) {
      // Create a temporary link to download the video
      const link = document.createElement('a');
      link.href = streamUrl;
      link.download = video?.filename || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async () => {
    if (!video) return;
    
    if (!confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/videos');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete video: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video. Please try again.');
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown';
    
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Loading video...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Video not found'}</p>
            <Button onClick={() => router.push('/dashboard/videos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/videos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Videos
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Modern Video Player */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              {video.mux_playback_id ? (
                // Use Mux player if we have a Mux playback ID
                <MuxVideoPlayer
                  playbackId={video.mux_playback_id}
                  assetId={video.mux_asset_id}
                  title={video.title}
                  poster={video.mux_thumbnail_url || video.thumbnailUrl}
                  className="w-full aspect-video rounded-lg overflow-hidden"
                  showCaptions={true}
                  showTranscript={true}
                  showDownload={true}
                  showShare={true}
                  enableAdaptiveStreaming={true}
                />
              ) : (
                // Fallback to enhanced HTML5 player for non-Mux videos
                <div className="relative bg-gradient-to-br from-slate-900 to-black rounded-xl overflow-hidden group shadow-2xl">
                  <video 
                    controls 
                    className="w-full h-full object-contain bg-black rounded-xl"
                    poster={`/api/videos/thumbnail/${video.id}`}
                    preload="metadata"
                    playsInline
                    crossOrigin="anonymous"
                    style={{ aspectRatio: '16/9' }}
                  >
                    <source src={`/api/videos/stream/${video.id}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Enhanced overlay for non-Mux videos */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs">
                    Enhanced Streaming
                  </div>
                </div>
              )}
              
              {/* Enhanced Features Notice */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <div className="text-sm">
                    <div className="font-medium text-purple-800">Universal Format Support</div>
                    <div className="text-purple-600 text-xs">WMV, AVI, MOV, MP4 & more</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                  <Captions className="h-4 w-4 text-blue-600" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800">Auto Transcripts</div>
                    <div className="text-blue-600 text-xs">AI-generated captions</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <Volume2 className="h-4 w-4 text-green-600" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800">Enhanced Audio</div>
                    <div className="text-green-600 text-xs">Noise reduction & clarity</div>
                  </div>
                </div>
              </div>
              
              {/* Processing Status */}
              {video.status === "processing" && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                    <span className="text-sm font-medium">Processing Video</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Your video is being processed with Mux for optimal streaming, thumbnail generation, and transcript creation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{video.title}</CardTitle>
                      <CardDescription className="text-base">
                        {video.description}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={video.status === "ready" ? "default" : video.status === "processing" ? "secondary" : "destructive"}
                    >
                      {video.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {video.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {video.uploadDate ? new Date(video.uploadDate).toLocaleDateString() : 'Unknown date'}
                      </span>
                      <span className="flex items-center gap-1">
                        {video.visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {video.visibility}
                      </span>
                    </div>
                    
                    {video.tags.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {video.tags.map(tag => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Details */}
            <div>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Video Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Duration</label>
                    <p className="text-sm">{formatDuration(video.duration)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">File Size</label>
                    <p className="text-sm">{formatFileSize(video.size)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">Filename</label>
                    <p className="text-sm font-mono text-xs break-all">{video.filename}</p>
                  </div>
                  
                  {video.category && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Category</label>
                      <p className="text-sm">{video.category}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">Uploaded By</label>
                    <p className="text-sm">{video.createdBy}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">Upload Date</label>
                    <p className="text-sm">{video.uploadDate ? new Date(video.uploadDate).toLocaleString() : 'Unknown date'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
