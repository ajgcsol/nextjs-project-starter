"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ThumbnailEditor } from "@/components/ThumbnailEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Edit, Eye, Clock, Calendar, User } from "lucide-react";

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
  streamUrl: string;
  thumbnailPath: string;
  duration: number;
  views: number;
  uploadDate: string;
  createdBy: string;
  status: string;
  size: number;
  width: number;
  height: number;
}

export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideoDetails();
  }, [videoId]);

  const fetchVideoDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos/upload');
      const data = await response.json();
      
      const foundVideo = data.videos.find((v: VideoDetails) => v.id === videoId);
      
      if (foundVideo) {
        console.log('Found video:', foundVideo);
        console.log('Video stream URL:', foundVideo.streamUrl);
        setVideo(foundVideo);
        
        // Increment views
        try {
          await fetch(`/api/videos/${videoId}/view`, { method: 'POST' });
        } catch (viewError) {
          console.warn('Failed to increment view count:', viewError);
        }
        
        // Preload the video
        if (foundVideo.streamUrl) {
          const preloadLink = document.createElement('link');
          preloadLink.rel = 'preload';
          preloadLink.as = 'video';
          preloadLink.href = foundVideo.streamUrl;
          document.head.appendChild(preloadLink);
        }
      } else {
        setError('Video not found');
        console.error('Video not found with ID:', videoId);
        console.log('Available videos:', data.videos.map((v: any) => ({ id: v.id, title: v.title })));
      }
    } catch (err) {
      setError('Failed to load video');
      console.error('Error fetching video:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-sm max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600 mb-4">{error || 'Video not found'}</p>
            <Button onClick={() => router.push('/dashboard/videos')} className="w-full">
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
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/videos')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <VideoPlayer
                  src={video.streamUrl}
                  videoId={video.id}
                  title={video.title}
                  poster={video.thumbnailPath}
                  className="w-full aspect-video"
                  showDownload={true}
                  showShare={true}
                  qualities={['original']}
                  defaultQuality="original"
                  captions={[]}
                  onTimeUpdate={(current, duration) => {
                    // Could be used for analytics
                    console.log(`Progress: ${current}/${duration}`);
                  }}
                  onEnded={() => {
                    console.log('Video ended');
                  }}
                />
              </CardContent>
            </Card>

            {/* Video Info */}
            <Card className="border-0 shadow-sm mt-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{video.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {video.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={video.visibility === 'public' ? 'default' : 'secondary'}
                  >
                    {video.visibility}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {video.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Views
                    </p>
                    <p className="font-medium">{video.views}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Duration
                    </p>
                    <p className="font-medium">{formatDuration(video.duration)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Uploaded
                    </p>
                    <p className="font-medium">
                      {new Date(video.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Created by
                    </p>
                    <p className="font-medium">{video.createdBy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Video Details */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
                <Button className="w-full" variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button className="w-full" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </CardContent>
            </Card>

            {/* Thumbnail Editor */}
            <ThumbnailEditor
              videoId={video.id}
              currentThumbnail={video.thumbnailPath}
              onThumbnailUpdate={(newUrl) => {
                setVideo(prev => prev ? { ...prev, thumbnailPath: newUrl } : null);
              }}
            />

            {/* Technical Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Resolution</p>
                  <p className="font-medium">{video.width} × {video.height}</p>
                </div>
                <div>
                  <p className="text-slate-500">File Size</p>
                  <p className="font-medium">{formatFileSize(video.size)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Category</p>
                  <p className="font-medium">{video.category}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge 
                    variant={video.status === 'ready' ? 'default' : 'secondary'}
                  >
                    {video.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Video ID</p>
                  <p className="font-mono text-xs">{video.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Related Videos */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Related Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Related videos will appear here based on category and tags.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}