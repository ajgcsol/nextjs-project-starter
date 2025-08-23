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
  Subtitles,
  Download,
  Share,
  PictureInPicture,
  Loader2,
  AudioWaveform,
  FileText,
  Eye,
  Zap
} from "lucide-react";

interface PremiumMuxPlayerProps {
  playbackId: string;
  title?: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  showTranscript?: boolean;
  showAnalytics?: boolean;
  audioEnhanced?: boolean;
  captionsAvailable?: boolean;
  transcriptText?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onQualityChange?: (quality: string) => void;
}

export function PremiumMuxPlayer({
  playbackId,
  title,
  poster,
  className,
  autoplay = false,
  muted = false,
  showControls = true,
  showTranscript = false,
  showAnalytics = false,
  audioEnhanced = false,
  captionsAvailable = false,
  transcriptText,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onQualityChange
}: PremiumMuxPlayerProps) {
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
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(showTranscript);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Mux streaming URLs
  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10&width=1920&height=1080`;
  
  // Available quality options for Mux
  const qualityOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '1080p', label: '1080p HD' },
    { value: '720p', label: '720p HD' },
    { value: '480p', label: '480p' },
    { value: '360p', label: '360p' }
  ];

  // Auto-hide controls timeout
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check Picture-in-Picture support
    setIsPiPSupported('pictureInPictureEnabled' in document);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up HLS streaming
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
    } else {
      // For other browsers, we'd typically use hls.js here
      // For now, fallback to MP4
      video.src = `https://stream.mux.com/${playbackId}/high.mp4`;
    }

    const handleLoadedData = () => {
      setDuration(video.duration);
      setIsLoading(false);
      console.log('🎬 Mux video loaded successfully');
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
      console.error('❌ Mux video error:', e);
      setIsLoading(false);
      setIsBuffering(false);
    };

    const handleLoadStart = () => {
      console.log('🔄 Mux video loading started');
      setIsLoading(true);
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
  }, [playbackId, hlsUrl, onTimeUpdate, onPlay, onPause, onEnded]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyT":
          e.preventDefault();
          setShowTranscriptPanel(!showTranscriptPanel);
          break;
        case "KeyC":
          e.preventDefault();
          setShowCaptions(!showCaptions);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showTranscriptPanel, showCaptions]);

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

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || !isPiPSupported) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const changeQuality = (quality: string) => {
    // For Mux, quality changes would typically be handled by the adaptive streaming
    setCurrentQuality(quality);
    setShowSettings(false);
    onQualityChange?.(quality);
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

  const getThumbnailAtTime = (time: number) => {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=160&height=90`;
  };

  return (
    <div className={cn("flex", showTranscriptPanel ? "gap-6" : "", className)}>
      {/* Main Video Player */}
      <div
        ref={containerRef}
        className={cn(
          "relative bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-2xl overflow-hidden group shadow-2xl",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          showTranscriptPanel ? "flex-1" : "w-full"
        )}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          poster={poster || thumbnailUrl}
          autoPlay={autoplay}
          muted={muted}
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-full object-contain bg-black"
          onClick={togglePlayPause}
        >
          Your browser does not support the video tag.
        </video>

        {/* Loading Overlay */}
        {(isLoading || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
              <p className="text-white text-lg font-medium">
                {isLoading ? "Loading video..." : "Buffering..."}
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

        {/* Title Overlay */}
        {title && (
          <div className="absolute top-6 left-6 right-6 z-10">
            <div className="bg-black bg-opacity-50 backdrop-blur-md rounded-xl px-4 py-3 border border-white border-opacity-20">
              <h3 className="text-white text-xl font-semibold">{title}</h3>
              <div className="flex items-center space-x-4 mt-2">
                {audioEnhanced && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <AudioWaveform className="h-4 w-4" />
                    <span className="text-sm">Enhanced Audio</span>
                  </div>
                )}
                {captionsAvailable && (
                  <div className="flex items-center space-x-1 text-blue-400">
                    <Subtitles className="h-4 w-4" />
                    <span className="text-sm">Captions Available</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-purple-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Powered by Mux</span>
                </div>
              </div>
            </div>
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
                  className="text-white hover:bg-white hover:bg-opacity-20 h-12 w-12 rounded-full backdrop-blur-sm"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBackward}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>

                <div className="flex items-center space-x-3 group">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
                {transcriptText && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTranscriptPanel(!showTranscriptPanel)}
                    className={cn(
                      "text-white hover:bg-white hover:bg-opacity-20 rounded-full",
                      showTranscriptPanel && "bg-white bg-opacity-20"
                    )}
                  >
                    <FileText className="h-5 w-5" />
                  </Button>
                )}

                {captionsAvailable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCaptions(!showCaptions)}
                    className={cn(
                      "text-white hover:bg-white hover:bg-opacity-20 rounded-full",
                      showCaptions && "bg-white bg-opacity-20"
                    )}
                  >
                    <Subtitles className="h-5 w-5" />
                  </Button>
                )}

                {isPiPSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePictureInPicture}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                  >
                    <PictureInPicture className="h-5 w-5" />
                  </Button>
                )}

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
                    <Settings className="h-5 w-5" />
                  </Button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-3 bg-black bg-opacity-90 backdrop-blur-md rounded-xl p-4 min-w-[240px] border border-white border-opacity-20">
                      <div className="space-y-4">
                        <div>
                          <p className="text-white text-sm font-medium mb-2">Quality</p>
                          <div className="space-y-1">
                            {qualityOptions.map(option => (
                              <button
                                key={option.value}
                                onClick={() => changeQuality(option.value)}
                                className={cn(
                                  "block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                  currentQuality === option.value
                                    ? "bg-white bg-opacity-20 text-white"
                                    : "text-gray-300 hover:bg-white hover:bg-opacity-10"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-white text-sm font-medium mb-2">Playback Speed</p>
                          <div className="space-y-1">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                              <button
                                key={rate}
                                onClick={() => changePlaybackRate(rate)}
                                className={cn(
                                  "block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                  playbackRate === rate
                                    ? "bg-white bg-opacity-20 text-white"
                                    : "text-gray-300 hover:bg-white hover:bg-opacity-10"
                                )}
                              >
                                {rate}x {rate === 1 && "(Normal)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Panel */}
      {showTranscriptPanel && transcriptText && (
        <div className="w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transcript</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTranscriptPanel(false)}
                className="h-8 w-8"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {transcriptText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
