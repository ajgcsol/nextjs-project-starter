"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoUploadLarge } from "@/components/VideoUploadLarge";
import { 
  Upload, 
  Video, 
  Play, 
  Pause, 
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Users,
  Calendar,
  RefreshCw
} from "lucide-react";

interface VideoFile {
  id: string;
  title: string;
  description: string;
  filename: string;
  duration: number;
  size: number;
  uploadDate: string;
  status: "processing" | "ready" | "failed" | "draft";
  visibility: "public" | "private" | "unlisted";
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  views: number;
  createdBy: string;
}

// Mock video data
const MOCK_VIDEOS: VideoFile[] = [
  {
    id: "1",
    title: "Constitutional Law: Introduction to Civil Rights",
    description: "Comprehensive overview of civil rights law and constitutional interpretation",
    filename: "civil-rights-intro.mp4",
    duration: 3600, // 1 hour in seconds
    size: 1024 * 1024 * 250, // 250MB
    uploadDate: "2024-01-15",
    status: "ready",
    visibility: "public",
    category: "Constitutional Law",
    tags: ["civil rights", "constitution", "lecture"],
    views: 234,
    createdBy: "Prof. Sarah Johnson"
  },
  {
    id: "2", 
    title: "Contract Formation Principles",
    description: "Essential principles of contract formation including offer, acceptance, and consideration",
    filename: "contract-formation.mp4",
    duration: 2700, // 45 minutes
    size: 1024 * 1024 * 180,
    uploadDate: "2024-01-12",
    status: "ready",
    visibility: "public", 
    category: "Contract Law",
    tags: ["contracts", "formation", "consideration"],
    views: 156,
    createdBy: "Prof. Michael Chen"
  },
  {
    id: "3",
    title: "Criminal Procedure Workshop",
    description: "Hands-on workshop covering search and seizure procedures",
    filename: "criminal-procedure-workshop.mp4", 
    duration: 1800, // 30 minutes
    size: 1024 * 1024 * 120,
    uploadDate: "2024-01-10",
    status: "processing",
    visibility: "private",
    category: "Criminal Law",
    tags: ["criminal procedure", "workshop", "search seizure"],
    views: 0,
    createdBy: "Prof. David Kim"
  }
];

const VIDEO_CATEGORIES = [
  "All Categories",
  "Constitutional Law",
  "Contract Law", 
  "Criminal Law",
  "Corporate Law",
  "Environmental Law",
  "International Law",
  "Tort Law"
];

export default function VideoManagementPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);


  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("videos", "upload") && !canAccess("*", "*")) {
      router.push("/dashboard");
      return;
    }
    
    // Fetch videos from API
    fetchVideos();
  }, [isAuthenticated, canAccess, router]);

  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      // Use working API for now
      const response = await fetch('/api/videos/upload');
      const data = await response.json();
      console.log('Fetched videos:', data);
      if (data.videos) {
        setVideos(data.videos);
        console.log('Updated video list with', data.videos.length, 'videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };


  const handlePublishVideo = async (videoId: string) => {
    try {
      const response = await fetch('/api/videos/upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: videoId,
          status: 'ready'
        }),
      });

      if (response.ok) {
        // Refresh the video list
        await fetchVideos();
      } else {
        console.error('Failed to publish video');
        alert('Failed to publish video. Please try again.');
      }
    } catch (error) {
      console.error('Error publishing video:', error);
      alert('Error publishing video. Please try again.');
    }
  };

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Video deleted successfully');
        // Refresh the video list
        await fetchVideos();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete video:', errorData);
        alert(`Failed to delete video: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video. Please try again.');
    }
  };

  const handlePlayVideo = (videoId: string) => {
    // Navigate to the video player page instead of direct stream
    router.push(`/dashboard/videos/${videoId}`);
  };

  const handleGenerateThumbnails = async () => {
    try {
      setIsLoadingVideos(true);
      console.log('🖼️ Starting thumbnail generation...');
      
      const response = await fetch('/api/videos/generate-thumbnails/batch', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Thumbnail generation completed! Processed ${data.processed} videos. ${data.successCount} successful, ${data.failureCount} failed.`);
        // Refresh videos to show new thumbnails
        await fetchVideos();
      } else {
        alert(`Thumbnail generation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      alert('Error generating thumbnails. Please try again.');
    } finally {
      setIsLoadingVideos(false);
    }
  };


  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All Categories" || video.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      case "oldest":
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      case "views":
        return b.views - a.views;
      case "duration":
        return b.duration - a.duration;
      default:
        return 0;
    }
  });

  // Filter videos by status - handle both API response formats
  const publishedVideos = sortedVideos.filter(video => 
    video.status === 'ready' || 
    (video.status as any) === 'published' || 
    (video.visibility === 'public' && video.status !== 'draft')
  );
  const draftVideos = sortedVideos.filter(video => 
    video.status === 'draft' || 
    video.status === 'processing'
  );

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Redirecting to login...</p>
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
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Video Management</h1>
              <p className="text-slate-600 mt-2">
                Upload, manage, and organize your educational video content
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard/editor?type=video")}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Video className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">{videos.length}</p>
                    <p className="text-sm text-slate-600">Total Videos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">{videos.reduce((sum, v) => sum + v.views, 0)}</p>
                    <p className="text-sm text-slate-600">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-purple-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.floor(videos.reduce((sum, v) => sum + v.duration, 0) / 3600)}h
                    </p>
                    <p className="text-sm text-slate-600">Total Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-orange-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">{videos.filter(v => v.visibility === "public").length}</p>
                    <p className="text-sm text-slate-600">Public Videos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="library" className="space-y-6">
            <TabsList>
              <TabsTrigger value="library">Published</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="upload">Upload Video</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-6">
              {/* Search and Filters */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search videos by title, description, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="views">Most Views</SelectItem>
                        <SelectItem value="duration">Longest First</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => fetchVideos()}
                      disabled={isLoadingVideos}
                      title="Refresh videos"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleGenerateThumbnails}
                      disabled={isLoadingVideos}
                      title="Generate missing thumbnails"
                    >
                      Generate Thumbnails
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedVideos.map(video => (
                  <Card key={video.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div 
                        className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-4 relative group cursor-pointer"
                        onClick={() => handlePlayVideo(video.id)}
                      >
                        <img
                          src={`/api/videos/thumbnail/${video.id}`}
                          alt={`${video.title} thumbnail`}
                          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder');
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        
                        {/* Video Preview on Hover - Only for smaller videos */}
                        {video.size < 100 * 1024 * 1024 && ( // Only show preview for videos under 100MB
                          <video
                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            muted
                            loop
                            preload="none"
                            playsInline
                            onMouseEnter={(e) => {
                              const videoEl = e.target as HTMLVideoElement;
                              if (videoEl.src !== `/api/videos/stream/${video.id}`) {
                                videoEl.src = `/api/videos/stream/${video.id}`;
                                videoEl.load();
                              }
                              // Start at random time (between 10% and 70% of video duration)
                              const randomStart = Math.floor(video.duration * (0.1 + Math.random() * 0.6));
                              videoEl.currentTime = randomStart;
                              
                              // Try to play with better error handling
                              const playPromise = videoEl.play();
                              if (playPromise !== undefined) {
                                playPromise.catch((error) => {
                                  // Only log unexpected errors, not autoplay prevention
                                  if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
                                    console.log('Preview play failed for video:', video.id, error.name);
                                  }
                                });
                              }
                            }}
                            onMouseLeave={(e) => {
                              const videoEl = e.target as HTMLVideoElement;
                              videoEl.pause();
                              videoEl.currentTime = 0;
                              // Clear src to stop any ongoing loading
                              videoEl.src = '';
                            }}
                            onLoadedData={(e) => {
                              const videoEl = e.target as HTMLVideoElement;
                              // Set random start time when video loads
                              const randomStart = Math.floor(video.duration * (0.1 + Math.random() * 0.6));
                              videoEl.currentTime = randomStart;
                            }}
                            onCanPlay={(e) => {
                              const videoEl = e.target as HTMLVideoElement;
                              // Try to play when video is ready
                              if (videoEl.matches(':hover')) {
                                const playPromise = videoEl.play();
                                if (playPromise !== undefined) {
                                  playPromise.catch(() => {
                                    // Silently handle autoplay prevention
                                  });
                                }
                              }
                            }}
                            onError={(e) => {
                              // Silently handle preview errors - they're not critical
                              const error = e.currentTarget.error;
                              if (error && error.code !== MediaError.MEDIA_ERR_ABORTED) {
                                console.log('Preview error for video:', video.id, 'Error code:', error.code);
                              }
                            }}
                          />
                        )}
                        
                        {/* Large Video Indicator - Show for videos over 100MB */}
                        {video.size >= 100 * 1024 * 1024 && (
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                <span>Large Video ({formatFileSize(video.size)})</span>
                              </div>
                              <div className="text-xs opacity-75 mt-1">Click to play</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="thumbnail-placeholder w-full h-full flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
                          <Video className="h-12 w-12 text-slate-400" />
                        </div>
                        
                        {/* Play overlay - only show when not hovering */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity delay-1000">
                            <Play className="h-6 w-6 text-slate-800" fill="currentColor" />
                          </div>
                        </div>
                        
                        {/* Preview indicator */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Preview
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {video.description}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={video.status === "ready" ? "default" : video.status === "processing" ? "secondary" : "destructive"}
                          className="ml-2"
                        >
                          {video.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(video.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {video.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            {video.visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {video.visibility}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {video.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {video.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{video.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-slate-500">
                            {new Date(video.uploadDate).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handlePlayVideo(video.id)}
                              title="Play video"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Edit video"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Share video"
                            >
                              <Share className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteVideo(video.id, video.title)}
                              title="Delete video"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              {/* Search and Filters */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search draft videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => fetchVideos()}
                      disabled={isLoadingVideos}
                      title="Refresh videos"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Draft Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftVideos.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Draft Videos</h3>
                    <p className="text-slate-600">Upload a video to get started with drafts.</p>
                  </div>
                ) : (
                  draftVideos.map(video => (
                    <Card key={video.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-4 relative group">
                          <img
                            src={`/api/videos/thumbnail/${video.id}`}
                            alt={`${video.title} thumbnail`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                          <div className="thumbnail-placeholder w-full h-full flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
                            <Video className="h-12 w-12 text-slate-400" />
                          </div>
                          {/* Draft indicator */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {video.status === 'processing' ? 'Processing' : 'Draft'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {video.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDuration(video.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(video.uploadDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-slate-500">
                              Created: {new Date(video.uploadDate).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8"
                                onClick={() => handlePublishVideo(video.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Publish
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="upload">
              <VideoUploadLarge 
                onUploadComplete={(video) => {
                  console.log('Video uploaded successfully:', video);
                  // Refresh video list
                  fetchVideos();
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                  alert(`Upload failed: ${error}`);
                }}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Video Analytics</CardTitle>
                  <CardDescription>
                    Track performance metrics for your video content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Analytics Coming Soon</h3>
                    <p className="text-slate-600">
                      Detailed video analytics and performance metrics will be available here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}