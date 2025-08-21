'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  Subtitles,
  Download,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerWithCaptionsProps {
  videoId: string;
  src: string;
  poster?: string;
  title?: string;
  duration?: number;
  onTranscribe?: () => void;
  onProcessAudio?: () => void;
}

interface Caption {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

export default function VideoPlayerWithCaptions({
  videoId,
  src,
  poster,
  title,
  duration,
  onTranscribe,
  onProcessAudio
}: VideoPlayerWithCaptionsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [showCaptions, setShowCaptions] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [captionsLoaded, setCaptionsLoaded] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [showTranscript, setShowTranscript] = useState(false);

  // Load captions when component mounts
  useEffect(() => {
    loadCaptions();
  }, [videoId]);

  // Update current caption based on video time
  useEffect(() => {
    if (captions.length > 0 && showCaptions) {
      const current = captions.find(
        caption => currentTime >= caption.startTime && currentTime <= caption.endTime
      );
      setCurrentCaption(current || null);
    } else {
      setCurrentCaption(null);
    }
  }, [currentTime, captions, showCaptions]);

  const loadCaptions = async () => {
    try {
      const response = await fetch(`/api/videos/transcribe?action=get-captions&videoId=${videoId}`);
      const data = await response.json();
      
      if (data.success && data.captions) {
        // For demo purposes, create sample captions
        const sampleCaptions: Caption[] = [
          {
            startTime: 0,
            endTime: 5,
            text: "Welcome to today's lecture on constitutional law.",
            speaker: "Professor Smith"
          },
          {
            startTime: 5,
            endTime: 12,
            text: "We'll be discussing the fundamental principles that govern our legal system.",
            speaker: "Professor Smith"
          },
          {
            startTime: 12,
            endTime: 18,
            text: "The Constitution serves as the supreme law of the land.",
            speaker: "Professor Smith"
          },
          {
            startTime: 18,
            endTime: 25,
            text: "It establishes the framework for government and protects individual rights.",
            speaker: "Professor Smith"
          }
        ];
        
        setCaptions(sampleCaptions);
        setCaptionsLoaded(true);
        
        // Generate transcript text
        const transcript = sampleCaptions.map(caption => 
          caption.speaker ? `${caption.speaker}: ${caption.text}` : caption.text
        ).join('\n\n');
        setTranscriptText(transcript);
      }
    } catch (error) {
      console.error('Failed to load captions:', error);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const downloadTranscript = () => {
    if (transcriptText) {
      const blob = new Blob([transcriptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || videoId}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadCaptions = (format: 'vtt' | 'srt') => {
    if (captions.length === 0) return;

    let content = '';
    
    if (format === 'vtt') {
      content = 'WEBVTT\n\n';
      captions.forEach((caption, index) => {
        const startTime = formatWebVTTTime(caption.startTime);
        const endTime = formatWebVTTTime(caption.endTime);
        content += `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n\n`;
      });
    } else if (format === 'srt') {
      captions.forEach((caption, index) => {
        const startTime = formatSRTTime(caption.startTime);
        const endTime = formatSRTTime(caption.endTime);
        content += `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || videoId}_captions.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatWebVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const formatSRTTime = (seconds: number): string => {
    return formatWebVTTTime(seconds).replace('.', ',');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />

        {/* Caption Overlay */}
        {showCaptions && currentCaption && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded max-w-[80%] text-center">
            {currentCaption.speaker && (
              <div className="text-sm text-gray-300 mb-1">{currentCaption.speaker}</div>
            )}
            <div className="text-lg">{currentCaption.text}</div>
          </div>
        )}

        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={videoDuration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Caption Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                className={`text-white hover:bg-white/20 ${showCaptions ? 'bg-white/20' : ''}`}
                disabled={!captionsLoaded}
              >
                <Subtitles className="h-5 w-5" />
              </Button>

              {/* Settings Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Video Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {onTranscribe && (
                    <DropdownMenuItem onClick={onTranscribe}>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Transcript
                    </DropdownMenuItem>
                  )}
                  
                  {onProcessAudio && (
                    <DropdownMenuItem onClick={onProcessAudio}>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Enhance Audio
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {transcriptText && (
                    <DropdownMenuItem onClick={downloadTranscript}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Transcript
                    </DropdownMenuItem>
                  )}
                  
                  {captions.length > 0 && (
                    <>
                      <DropdownMenuItem onClick={() => downloadCaptions('vtt')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download WebVTT
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadCaptions('srt')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download SRT
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Caption Status */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {captionsLoaded ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Subtitles className="h-3 w-3 mr-1" />
              Captions Available
            </Badge>
          ) : (
            <Badge variant="outline">
              <Subtitles className="h-3 w-3 mr-1" />
              No Captions
            </Badge>
          )}
          
          {transcriptText && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <FileText className="h-3 w-3 mr-1" />
              Transcript Available
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTranscript(!showTranscript)}
          disabled={!transcriptText}
        >
          <FileText className="h-4 w-4 mr-2" />
          {showTranscript ? 'Hide' : 'Show'} Transcript
        </Button>
      </div>

      {/* Transcript Panel */}
      {showTranscript && transcriptText && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Video Transcript</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTranscript}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {transcriptText}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
