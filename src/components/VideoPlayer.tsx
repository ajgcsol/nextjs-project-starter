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
  Share
} from "lucide-react";

interface VideoPlayerProps {
  src: string;
  videoId?: string; // For our custom streaming
  title?: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  qualities?: string[]; // Available quality options
  defaultQuality?: string;
  captions?: {
    label: string;
    src: string;
    srcLang: string;
    default?: boolean;
  }[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onQualityChange?: (quality: string) => void;
}

export function VideoPlayer({
  src,
  videoId,
  title,
  poster,
  className,
  autoplay = false,
  muted = false,
  controls = true,
  showDownload = false,
  showShare = false,
  qualities = [],
  defaultQuality = "original",
  captions = [],
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onQualityChange
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [selectedCaption, setSelectedCaption] = useState<string>("");
  const [currentQuality, setCurrentQuality] = useState(defaultQuality);
  const [availableQualities, setAvailableQualities] = useState<string[]>(qualities);
  
  // Auto-hide controls timeout
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setDuration(video.duration);
      setIsLoading(false);
      console.log('Video loaded successfully:', src);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
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

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      console.error('Video src:', video.src);
      console.error('Video readyState:', video.readyState);
      console.error('Video networkState:', video.networkState);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      console.log('Video load started for:', src);
      setIsLoading(true);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("error", handleError);
    video.addEventListener("loadstart", handleLoadStart);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
    };
  }, [onTimeUpdate, onPlay, onPause, onEnded]);

  // Handle mouse movement for auto-hiding controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      if (isPlaying) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", () => {
        if (isPlaying) {
          hideControlsTimeout.current = setTimeout(() => {
            setShowControls(false);
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
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const changeQuality = (quality: string) => {
    if (!videoId) return;
    
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    // Update video source with quality parameter
    const newSrc = `/api/videos/stream/${videoId}?quality=${quality}`;
    video.src = newSrc;
    
    // Restore playback position and state
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play();
      }
    }, { once: true });

    setCurrentQuality(quality);
    setShowSettings(false);
    onQualityChange?.(quality);
  };

  const toggleCaptions = (trackIndex?: number) => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    
    // Hide all tracks first
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = "hidden";
    }

    if (trackIndex !== undefined && tracks[trackIndex]) {
      tracks[trackIndex].mode = "showing";
      setSelectedCaption(captions[trackIndex]?.label || "");
      setShowCaptions(true);
    } else {
      setShowCaptions(false);
      setSelectedCaption("");
    }
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        muted={muted}
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
      >
        {captions.map((caption, index) => (
          <track
            key={index}
            kind="subtitles"
            src={caption.src}
            srcLang={caption.srcLang}
            label={caption.label}
            default={caption.default}
          />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Title Overlay */}
      {title && (
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white text-lg font-medium bg-black bg-opacity-50 px-3 py-2 rounded">
            {title}
          </h3>
        </div>
      )}

      {/* Controls */}
      {controls && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress Bar */}
          <div className="px-4 pb-2">
            <Slider
              value={[currentTime]}
              onValueChange={([value]) => seek(value)}
              max={duration}
              step={0.1}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipBackward}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-2 group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>

                <div className="w-20 opacity-0 group-hover:opacity-100 transition-opacity">
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

              <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {captions.length > 0 && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCaptions(!showCaptions)}
                    className={cn(
                      "text-white hover:bg-white hover:bg-opacity-20",
                      showCaptions && "bg-white bg-opacity-20"
                    )}
                  >
                    <Subtitles className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {showDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {showShare && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <Share className="h-4 w-4" />
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "text-white hover:bg-white hover:bg-opacity-20",
                    showSettings && "bg-white bg-opacity-20"
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 rounded-lg p-3 min-w-[200px]">
                    <div className="space-y-3">
                      {availableQualities.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-1">Quality</p>
                          <div className="space-y-1">
                            {availableQualities.map(quality => (
                              <button
                                key={quality}
                                onClick={() => changeQuality(quality)}
                                className={cn(
                                  "block w-full text-left px-2 py-1 rounded text-sm transition-colors",
                                  currentQuality === quality
                                    ? "bg-white bg-opacity-20 text-white"
                                    : "text-gray-300 hover:bg-white hover:bg-opacity-10"
                                )}
                              >
                                {quality === "original" ? "Original" : quality.toUpperCase()}
                                {quality === "1080p" && " (HD)"}
                                {quality === "720p" && " (HD)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-white text-sm font-medium mb-1">Playback Speed</p>
                        <div className="space-y-1">
                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                            <button
                              key={rate}
                              onClick={() => changePlaybackRate(rate)}
                              className={cn(
                                "block w-full text-left px-2 py-1 rounded text-sm transition-colors",
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

                      {captions.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-1">Captions</p>
                          <div className="space-y-1">
                            <button
                              onClick={() => toggleCaptions()}
                              className={cn(
                                "block w-full text-left px-2 py-1 rounded text-sm transition-colors",
                                !showCaptions
                                  ? "bg-white bg-opacity-20 text-white"
                                  : "text-gray-300 hover:bg-white hover:bg-opacity-10"
                              )}
                            >
                              Off
                            </button>
                            {captions.map((caption, index) => (
                              <button
                                key={index}
                                onClick={() => toggleCaptions(index)}
                                className={cn(
                                  "block w-full text-left px-2 py-1 rounded text-sm transition-colors",
                                  selectedCaption === caption.label
                                    ? "bg-white bg-opacity-20 text-white"
                                    : "text-gray-300 hover:bg-white hover:bg-opacity-10"
                                )}
                              >
                                {caption.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}