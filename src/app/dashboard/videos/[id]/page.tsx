'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Edit, Trash2, Play, Clock, FileVideo } from 'lucide-react';
import { MuxVideoPlayer } from '@/components/MuxVideoPlayer';

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
  mux_asset_id?: string;
  mux_playback_id?: string;
  processing_status?: string;
  transcript?: string;
  captions_url?: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <button className="p-2 text-gray-600 hover:text-blue-600 rounded">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-blue-600 rounded">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-blue-600 rounded">
              <Edit className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-red-600 rounded">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                {video.mux_playback_id ? (
                  <MuxVideoPlayer
                    playbackId={video.mux_playback_id}
                    title={video.title}
                    poster={video.thumbnail_path}
                    showCaptions={!!video.captions_url}
                    showTranscript={!!video.transcript}
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Processing Video</h3>
                      <p className="text-gray-500 text-sm">
                        Your video is being processed. This usually takes a few minutes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
              
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
      </div>
    </div>
  );
}
