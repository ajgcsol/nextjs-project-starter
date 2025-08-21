"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Play
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
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

          {/* Video Player */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                {streamUrl ? (
                  <video 
                    controls 
                    className="w-full h-full"
                    poster={`/api/videos/thumbnail/${video.id}`}
                    preload={video.size > 100 * 1024 * 1024 ? "none" : "metadata"} // Use "none" for large videos
                    playsInline
                    crossOrigin="anonymous"
                    onLoadStart={() => {
                      console.log('Video load started for:', video.id);
                    }}
                    onCanPlay={() => {
                      console.log('Video can play:', video.id);
                    }}
                    onError={(e) => {
                      console.error('Video error:', e);
                    }}
                    onWaiting={() => {
                      console.log('Video buffering...');
                    }}
                    onPlaying={() => {
                      console.log('Video playing');
                    }}
                  >
                    <source src={streamUrl} type="video/mp4" />
                    <source src={streamUrl} type="video/webm" />
                    <source src={streamUrl} type="video/ogg" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Video not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Large Video Notice */}
              {video.size > 100 * 1024 * 1024 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Play className="h-4 w-4" />
                    <span className="text-sm font-medium">Large Video ({formatFileSize(video.size)})</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    This video will stream on-demand to optimize loading time. Click play to start.
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
                        {new Date(video.uploadDate).toLocaleDateString()}
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
                    <p className="text-sm">{new Date(video.uploadDate).toLocaleString()}</p>
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
