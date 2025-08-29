"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Cloud
} from "lucide-react";

interface SmartVideoPlayerProps {
  videoId: string;
  playbackId?: string;
  title?: string;
  poster?: string;
  s3Key?: string;
  filePath?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  captions?: {
    label: string;
    src: string;
    srcLang: string;
    default?: boolean;
  }[];
  captionsUrl?: string;
  captionsStatus?: string;
  transcriptText?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function SmartVideoPlayer({
  videoId,
  playbackId,
  title,
  poster,
  s3Key,
  filePath,
  className,
  autoplay = false,
  muted = false,
  showControls = true,
  captions,
  captionsUrl,
  captionsStatus,
  transcriptText,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded
}: SmartVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<'mux' | 's3' | 'api'>('mux');
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Auto-hide controls timeout
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Generate video source URLs
  const getMuxUrl = () => playbackId ? `https://stream.mux.com/${playbackId}/high.mp4` : null;
  const getS3Url = () => filePath || (s3Key ? `https://d24qjgz9z4yzof.cloudfront.net/${s3Key}` : null);
  const getApiUrl = () => `/api/videos/stream/${videoId}`;
  const getThumbnailUrl = () => {
    if (poster) return poster;
    if (playbackId) return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`;
    return `/api/videos/thumbnail/${videoId}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try loading video sources in order: Mux -> S3 -> API
    const tryLoadVideo = async () => {
      setIsLoading(true);
      setError(null);

      // First try Mux if we have a playback ID
      const muxUrl = getMuxUrl();
      if (muxUrl && currentSource === 'mux') {
        console.log('🎬 Trying Mux URL:', muxUrl);
        video.src = muxUrl;
        setCurrentSource('mux');
        return;
      }

      // Then try S3/CloudFront
      const s3Url = getS3Url();
      if (s3Url && currentSource === 's3') {
        console.log('☁️ Trying S3/CloudFront URL:', s3Url);
        video.src = s3Url;
        setCurrentSource('s3');
        return;
      }

      // Finally try API endpoint
      const apiUrl = getApiUrl();
      console.log('🔗 Trying API URL:', apiUrl);
      video.src = apiUrl;
      setCurrentSource('api');
    };

    const handleLoadedData = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setError(null);
      console.log(`✅ Video loaded successfully from ${currentSource.toUpperCase()}`);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const progress = (bufferedEnd / video.duration) * 100;
        setLoadProgress(progress);
      }
    };

    const handleError = (e: Event) => {
      console.error(`❌ Video error from ${currentSource.toUpperCase()}:`, e);
      setIsBuffering(false);
      
      // Try fallback sources
      if (currentSource === 'mux') {
        console.log('🔄 Mux failed, trying S3...');
        setCurrentSource('s3');
        setError(null);
        return;
      } else if (currentSource === 's3') {
        console.log('🔄 S3 failed, trying API...');
        setCurrentSource('api');
        setError(null);
        return;
      } else {
        // All sources failed
        setIsLoading(false);
        setError('Unable to load video. Please try again later.');
      }
    };

    const handleLoadStart = () => {
      console.log(`🔄 Loading video from ${currentSource.toUpperCase()}...`);
      setIsLoading(true);
      setError(null);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("error", handleError);
    video.addEventListener("loadstart", handleLoadStart);

    // Start loading
    tryLoadVideo();

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
    };
  }, [videoId, playbackId, s3Key, filePath, currentSource]);

  // Retry with next source when current source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || error) return;

    const tryCurrentSource = async () => {
      if (currentSource === 'mux') {
        const muxUrl = getMuxUrl();
        if (muxUrl) {
          video.src = muxUrl;
          video.load();
        } else {
          setCurrentSource('s3');
        }
      } else if (currentSource === 's3') {
        const s3Url = getS3Url();
        if (s3Url) {
          // Test S3/CloudFront URL before using it
          try {
            const response = await fetch(s3Url, { method: 'HEAD' });
            if (response.ok) {
              video.src = s3Url;
              video.load();
            } else {
              console.log(`❌ S3/CloudFront returned ${response.status}, trying API...`);
              setCurrentSource('api');
            }
          } catch (fetchError) {
            console.log('❌ S3/CloudFront fetch failed, trying API...', fetchError);
            setCurrentSource('api');
          }
        } else {
          setCurrentSource('api');
        }
      } else if (currentSource === 'api') {
        const apiUrl = getApiUrl();
        // Fetch JSON metadata from API to get actual video URL
        try {
          console.log('🔄 Loading video from API...');
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.videoUrl) {
              console.log('✅ Got video URL from API:', data.videoUrl);
              
              // Validate the URL format before using it
              if (data.videoUrl.startsWith('http')) {
                video.src = data.videoUrl;
                video.load();
                
                // Set a timeout to detect if this URL also fails to load
                setTimeout(() => {
                  if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                    console.log('⚠️ API video URL failed to load after timeout');
                    setError('Video file could not be loaded. The file may be corrupted or unavailable.');
                  }
                }, 5000);
              } else {
                console.log('❌ Invalid video URL format from API:', data.videoUrl);
                setError('Invalid video URL returned from server.');
              }
            } else {
              console.log('❌ API returned no video URL:', data.error || 'Unknown error');
              setError(data.error || 'Video URL not available from API.');
            }
          } else {
            console.log(`❌ API returned ${response.status}, no more sources available`);
            setError('Video is not available. The file may have been moved or deleted.');
          }
        } catch (fetchError) {
          console.log('❌ API fetch failed, no more sources available', fetchError);
          setError('Video is not available. Please check your connection and try again.');
        }
      }
    };

    tryCurrentSource();
  }, [currentSource]);

  // Handle mouse movement for auto-hiding controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControlsOverlay(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      if (isPlaying) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControlsOverlay(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", () => {
        if (isPlaying) {
          hideControlsTimeout.current = setTimeout(() => {
            setShowControlsOverlay(false);
          }, 1000);
        }
      });

      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        if (hideControlsTimeout.current) {
          clearTimeout(hideControlsTimeout.current);
        }
      };
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
  };

  const changeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    video.volume = newVolume;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, currentTime + 10);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, currentTime - 10);
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
      console.error("Fullscreen error:", error);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const retry = () => {
    setError(null);
    setCurrentSource('mux'); // Start over with Mux
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getSourceIcon = () => {
    switch (currentSource) {
      case 'mux': return <Zap className="h-4 w-4" />;
      case 's3': return <Cloud className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getSourceLabel = () => {
    switch (currentSource) {
      case 'mux': return 'Mux Streaming';
      case 's3': return 'CloudFront CDN';
      default: return 'Direct Stream';
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden group shadow-xl sm:shadow-2xl",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        "min-h-0 flex-shrink", // Ensure proper sizing
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={getThumbnailUrl()}
        autoPlay={autoplay}
        muted={muted}
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black"
        onClick={togglePlayPause}
      >
        {/* Enhanced subtitle tracks */}
        {captions && captions.map((caption, index) => (
          <track
            key={index}
            kind="subtitles"
            src={caption.src}
            srcLang={caption.srcLang}
            label={caption.label}
            default={caption.default}
          />
        ))}
        {/* Fallback caption from enhanced transcription */}
        {captionsUrl && (
          <track
            kind="subtitles"
            src={captionsUrl}
            srcLang="en"
            label="Enhanced AI Transcription"
            default={true}
          />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {(isLoading || isBuffering) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
            <p className="text-white text-lg font-medium">
              {isLoading ? `Loading from ${getSourceLabel()}...` : "Buffering..."}
            </p>
            {loadProgress > 0 && (
              <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
          <div className="text-center space-y-4 max-w-md mx-auto px-6">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <div className="text-red-400 text-lg font-semibold">Video Playback Error</div>
            <p className="text-white text-sm">{error}</p>
            <Button
              onClick={retry}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Title & Source Overlay */}
      {title && (
        <div className="absolute top-6 left-6 right-6 z-10">
          <div className="bg-black bg-opacity-50 backdrop-blur-md rounded-xl px-4 py-3 border border-white border-opacity-20">
            <h3 className="text-white text-xl font-semibold">{title}</h3>
            <div className="flex items-center space-x-2 mt-2 text-sm">
              {getSourceIcon()}
              <span className="text-white opacity-75">{getSourceLabel()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Button
            onClick={togglePlayPause}
            className="pointer-events-auto bg-white bg-opacity-10 hover:bg-opacity-20 backdrop-blur-md border border-white border-opacity-20 rounded-full p-6 transition-all duration-300 hover:scale-110"
          >
            <Play className="h-12 w-12 text-white fill-current ml-1" />
          </Button>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-300 z-20",
            showControlsOverlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {/* Progress Bar */}
          <div className="px-6 pb-3">
            <div className="relative group">
              <Slider
                value={[currentTime]}
                onValueChange={([value]) => seek(value)}
                max={duration}
                step={0.1}
                className="w-full cursor-pointer"
              />
              {/* Buffer Progress */}
              <div 
                className="absolute top-1/2 left-0 h-1 bg-white bg-opacity-30 rounded-full -translate-y-1/2 pointer-events-none"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between px-6 pb-6">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 h-12 w-12 rounded-full backdrop-blur-sm"
              >
                {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipBackward}
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-full"
              >
                <SkipBack className="h-5 w-5 text-white" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-full"
              >
                <SkipForward className="h-5 w-5 text-white" />
              </Button>

              <div className="flex items-center space-x-3 group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                </Button>

                <div className="w-24 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={([value]) => {
                      const video = videoRef.current;
                      if (video) {
                        video.volume = value;
                        video.muted = false;
                      }
                    }}
                    max={1}
                    step={0.1}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              <span className="text-white text-sm font-mono bg-black bg-opacity-50 px-3 py-1 rounded-full">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "text-white hover:bg-white hover:bg-opacity-20 rounded-full",
                    showSettings && "bg-white bg-opacity-20"
                  )}
                >
                  <Settings className="h-5 w-5 text-white" />
                </Button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-3 bg-black/90 backdrop-blur-sm rounded-lg p-3 min-w-[200px] border border-white/10 z-50 shadow-2xl">
                    <div className="space-y-2">
                      <div className="px-1 py-1">
                        <p className="text-white/90 text-sm font-semibold">Playback Speed</p>
                      </div>
                      <div className="space-y-1">
                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                          <button
                            key={rate}
                            onClick={() => changePlaybackRate(rate)}
                            className={cn(
                              "w-full px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95",
                              playbackRate === rate
                                ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/50"
                                : "text-white/90 hover:bg-white/15 hover:text-white"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{rate}x</span>
                              {rate === 1 && <span className="text-xs text-white/60">Normal</span>}
                              {playbackRate === rate && (
                                <span className="text-xs text-white/80">●</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 rounded-full"
              >
                {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
