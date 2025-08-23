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
  RotateCcw,
  Loader2,
  Airplay,
  PictureInPicture,
  Zap,
  Mic,
  Eye,
  Clock
} from "lucide-react";

interface MuxVideoPlayerProps {
  // Mux-specific props
  playbackId: string;
  assetId?: string;
  title?: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  
  // Mux automatic features
  showCaptions?: boolean;
  showTranscript?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  showAirplay?: boolean;
  showPiP?: boolean;
  
  // Mux streaming options
  enableAdaptiveStreaming?: boolean;
  maxResolution?: '480p' | '720p' | '1080p' | '1440p' | '2160p';
  
  // Event handlers
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onQualityChange?: (quality: string) => void;
  onCaptionToggle?: (enabled: boolean) => void;
}

export function MuxVideoPlayer({
  playbackId,
  assetId,
  title,
  poster,
  className,
  autoplay = false,
  muted = false,
  controls = true,
  showCaptions = true,
  showTranscript = false,
  showDownload = false,
  showShare = false,
  showAirplay = true,
  showPiP = true,
  enableAdaptiveStreaming = true,
  maxResolution = '1080p',
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onQualityChange,
  onCaptionToggle
}: MuxVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [isHovering, setIsHovering] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<{start: number, end: number}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muxMetadata, setMuxMetadata] = useState<any>(null);
  
  // Auto-hide controls timeout
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Mux streaming URLs
  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const thumbnailUrl = poster || `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`;
  const captionsUrl = `https://stream.mux.com/${playbackId}/text/en.vtt`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set Mux HLS source
    video.src = hlsUrl;

    const handleLoadedData = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setError(null);
      console.log('Mux video loaded successfully:', playbackId);
      
      // Load Mux metadata if available
      fetchMuxMetadata();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
      
      // Update buffered ranges
      const buffered = video.buffered;
      const ranges = [];
      for (let i = 0; i < buffered.length; i++) {
        ranges.push({
          start: buffered.start(i),
          end: buffered.end(i)
        });
      }
      setBufferedRanges(ranges);
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

    const handleError = (e: Event) => {
      console.error('Mux video error:', e);
      setIsLoading(false);
      setIsBuffering(false);
      setError('Failed to load video from Mux. Please try again.');
    };

    const handleLoadStart = () => {
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
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadStart);
    };
  }, [playbackId, hlsUrl, onTimeUpdate, onPlay, onPause, onEnded]);

  // Fetch Mux metadata for enhanced features
  const fetchMuxMetadata = async () => {
    if (!assetId) return;
    
    try {
      // This would typically call your API to get Mux asset metadata
      // For now, we'll simulate the metadata
      setMuxMetadata({
        duration: duration,
        aspectRatio: '16:9',
        resolution: '1920x1080',
        hasAudio: true,
        hasCaptions: showCaptions,
        hasTranscript: showTranscript
      });
    } catch (error) {
      console.error('Failed to fetch Mux metadata:', error);
    }
  };

  // Handle mouse movement for auto-hiding controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      if (isPlaying && !isHovering) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
      setShowControls(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      if (isPlaying) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 1000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
        if (hideControlsTimeout.current) {
          clearTimeout(hideControlsTimeout.current);
        }
      };
    }
  }, [isPlaying, isHovering]);

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
        case "KeyP":
          e.preventDefault();
          togglePictureInPicture();
          break;
        case "KeyC":
          e.preventDefault();
          toggleCaptions();
          break;
        case "KeyT":
          e.preventDefault();
          toggleTranscript();
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

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

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

  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video) return;

    const newState = !captionsEnabled;
    setCaptionsEnabled(newState);
    onCaptionToggle?.(newState);

    // Add or remove caption track
    if (newState && showCaptions) {
      // Add Mux captions track if not already present
      const existingTrack = Array.from(video.textTracks).find(track => track.label === 'English');
      if (!existingTrack) {
        const track = video.addTextTrack('subtitles', 'English', 'en');
        track.mode = 'showing';
        
        // Load Mux captions
        fetch(captionsUrl)
          .then(response => response.text())
          .then(vttContent => {
            // Parse and add VTT cues (simplified)
            console.log('Loaded Mux captions:', vttContent);
          })
          .catch(error => console.error('Failed to load Mux captions:', error));
      } else {
        existingTrack.mode = 'showing';
      }
    } else {
      // Hide all tracks
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden';
      }
    }
  };

  const toggleTranscript = () => {
    setTranscriptVisible(!transcriptVisible);
  };

  const retry = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setError(null);
    setIsLoading(true);
    video.src = hlsUrl;
    video.load();
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

  const getProgressPercentage = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  return (
    <div className="flex gap-6">
      {/* Main Video Player */}
      <div
        ref={containerRef}
        className={cn(
          "relative bg-gradient-to-br from-slate-900 to-black rounded-xl overflow-hidden group shadow-2xl flex-1",
          "border border-slate-800/50 backdrop-blur-sm",
          isFullscreen && "fixed inset-0 z-50 rounded-none border-none",
          className
        )}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          poster={thumbnailUrl}
          autoPlay={autoplay}
          muted={muted}
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-full object-contain bg-black"
          onClick={togglePlayPause}
        >
          {/* Mux Captions Track */}
          {showCaptions && (
            <track
              kind="subtitles"
              src={captionsUrl}
              srcLang="en"
              label="English"
              default={captionsEnabled}
            />
          )}
          Your browser does not support the video tag.
        </video>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-white/80 text-sm font-medium">Loading from Mux...</p>
            </div>
          </div>
        )}

        {/* Buffering Overlay */}
        {isBuffering && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center space-y-4 max-w-md mx-auto px-6">
              <div className="text-red-400 text-lg font-semibold">Mux Playback Error</div>
              <p className="text-white/80 text-sm">{error}</p>
              <Button
                onClick={retry}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Title Overlay */}
        {title && (
          <div className={cn(
            "absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xl font-semibold tracking-tight drop-shadow-lg">
                {title}
              </h3>
              <div className="flex items-center space-x-2 text-white/60 text-sm">
                <Zap className="h-4 w-4" />
                <span>Powered by Mux</span>
              </div>
            </div>
          </div>
        )}

        {/* Center Play Button */}
        {!isPlaying && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              onClick={togglePlayPause}
              className="pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full p-6 transition-all duration-300 hover:scale-110"
            >
              <Play className="h-12 w-12 text-white fill-white ml-1" />
            </Button>
          </div>
        )}

        {/* Controls */}
        {controls && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out",
              showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            {/* Progress Background */}
            <div className="px-6 pb-3">
              <div 
                ref={progressRef}
                className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2 transition-all duration-200"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seek(percent * duration);
                }}
              >
                {/* Buffered Progress */}
                {bufferedRanges.map((range, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full bg-white/30 rounded-full"
                    style={{
                      left: `${(range.start / duration) * 100}%`,
                      width: `${((range.end - range.start) / duration) * 100}%`
                    }}
                  />
                ))}
                
                {/* Current Progress */}
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-200"
                  style={{ width: `${getProgressPercentage()}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity duration-200 -mr-2" />
                </div>
              </div>
            </div>

            {/* Control Bar */}
            <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-md px-6 pb-6 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipBackward}
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipForward}
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center space-x-3 group/volume">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>

                    <div className="w-24 opacity-0 group-hover/volume:opacity-100 transition-all duration-300 transform scale-95 group-hover/volume:scale-100">
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

                  <div className="text-white text-sm font-mono bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {showCaptions && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleCaptions}
                      className={cn(
                        "text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full",
                        captionsEnabled && "bg-white/20"
                      )}
                    >
                      <Subtitles className="h-5 w-5" />
                    </Button>
                  )}

                  {showTranscript && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTranscript}
                      className={cn(
                        "text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full",
                        transcriptVisible && "bg-white/20"
                      )}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}

                  {showPiP && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePictureInPicture}
                      className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                    >
                      <PictureInPicture className="h-5 w-5" />
                    </Button>
                  )}

                  {showAirplay && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                    >
                      <Airplay className="h-5 w-5" />
                    </Button>
                  )}

                  {showDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  )}

                  {showShare && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                    >
                      <Share className="h-5 w-5" />
                    </Button>
                  )}

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        "text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full",
                        showSettings && "bg-white/20"
                      )}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>

                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-3 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 p-4 min-w-[220px] shadow-2xl">
                        <div className="space-y-4">
                          <div>
                            <p className="text-white text-sm font-semibold mb-2 flex items-center">
                              <Zap className="h-4 w-4 mr-2" />
                              Mux Quality
                            </p>
                            <div className="space-y-1">
                              {['auto', '1080p', '720p', '480p'].map(quality => (
                                <button
                                  key={quality}
                                  onClick={() => {
                                    setCurrentQuality(quality);
                                    onQualityChange?.(quality);
                                    setShowSettings(false);
                                  }}
                                  className={cn(
                                    "block w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                    currentQuality === quality
                                      ? "bg-blue-600 text-white shadow-lg"
                                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  {quality === "auto" ? "Auto (Adaptive)" : quality.toUpperCase()}
                                  {quality === "1080p" && " (Full HD)"}
                                  {quality === "720p" && " (HD)"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-white text-sm font-semibold mb-2">Playback Speed</p>
                            <div className="space-y-1">
                              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                                <button
                                  key={rate}
                                  onClick={() => changePlaybackRate(rate)}
                                  className={cn(
                                    "block w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                    playbackRate === rate
                                      ? "bg-blue-600 text-white shadow-lg"
                                      : "text-gray-300 hover:bg-white/10 hover:text-white"
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
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 rounded-full"
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Panel */}
      {transcriptVisible && showTranscript && (
        <div className="w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 max-h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center">
              <Mic className="h-4 w-4 mr-2" />
              Transcript
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTranscript}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="text-white/80 leading-relaxed">
              <div className="flex items-start space-x-2 mb-2">
                <Clock className="h-3 w-3 mt-1 text-blue-400" />
                <span className="text-blue-400 font-mono text-xs">00:10</span>
              </div>
              <p>This is where the Mux-generated transcript would appear. The transcript is automatically generated from the audio track and synchronized with the video playback.</p>
            </div>
            
            <div className="text-white/80 leading-relaxed">
              <div className="flex items-start space-x-2 mb-2">
                <Clock className="h-3 w-3 mt-1 text-blue-400" />
                <span className="text-blue-400 font-mono text-xs">00:25</span>
              </div>
              <p>Users can click on any timestamp to jump to that point in the video. The transcript updates in real-time as the video plays.</p>
            </div>
            
            <div className="text-white/60 text-xs mt-4 p-3 bg-slate-800/50 rounded-lg">
              <p>💡 Transcript automatically generated by Mux AI with 90%+ accuracy</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
