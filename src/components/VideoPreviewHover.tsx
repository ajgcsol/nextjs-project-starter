"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VideoPreviewHoverProps {
  videoId: string;
  thumbnailUrl?: string;
  spriteSheetUrl?: string;
  webVttUrl?: string;
  duration?: number;
  className?: string;
  children: React.ReactNode;
  previewWidth?: number;
  previewHeight?: number;
  showOnHover?: boolean;
}

interface ThumbnailCue {
  startTime: number;
  endTime: number;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function VideoPreviewHover({
  videoId,
  thumbnailUrl,
  spriteSheetUrl,
  webVttUrl,
  duration = 0,
  className,
  children,
  previewWidth = 160,
  previewHeight = 90,
  showOnHover = true
}: VideoPreviewHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
  const [currentThumbnail, setCurrentThumbnail] = useState<ThumbnailCue | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load WebVTT thumbnail data
  useEffect(() => {
    if (webVttUrl && showOnHover) {
      loadWebVTT(webVttUrl);
    }
  }, [webVttUrl, showOnHover]);

  // Update current thumbnail based on preview time
  useEffect(() => {
    if (thumbnailCues.length > 0) {
      const cue = thumbnailCues.find(
        c => previewTime >= c.startTime && previewTime < c.endTime
      );
      setCurrentThumbnail(cue || null);
    }
  }, [previewTime, thumbnailCues]);

  const loadWebVTT = async (url: string) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const cues = parseWebVTT(text);
      setThumbnailCues(cues);
    } catch (error) {
      console.error('Failed to load WebVTT:', error);
    }
  };

  const parseWebVTT = (text: string): ThumbnailCue[] => {
    const lines = text.split('\n');
    const cues: ThumbnailCue[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for time range lines (e.g., "00:00:00.000 --> 00:00:10.000")
      if (line.includes(' --> ')) {
        const [startStr, endStr] = line.split(' --> ');
        const startTime = parseTimeString(startStr);
        const endTime = parseTimeString(endStr);
        
        // Next line should contain the image URL with coordinates
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.includes('#xywh=')) {
          const [url, coords] = nextLine.split('#xywh=');
          const [x, y, width, height] = coords.split(',').map(Number);
          
          cues.push({
            startTime,
            endTime,
            url: url.trim(),
            x,
            y,
            width,
            height
          });
        }
      }
    }
    
    return cues;
  };

  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  const handleMouseEnter = () => {
    if (showOnHover) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !showOnHover) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate preview time based on mouse position
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const time = progress * duration;
    
    setPreviewTime(time);
    setMousePosition({ x: e.clientX, y: e.clientY });
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

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}
      
      {/* Preview Tooltip */}
      {isHovering && showOnHover && (currentThumbnail || thumbnailUrl) && (
        <div
          ref={previewRef}
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x - previewWidth / 2,
            top: mousePosition.y - previewHeight - 10,
            width: previewWidth,
            height: previewHeight + 30, // Extra space for time display
          }}
        >
          <div className="bg-black rounded-lg shadow-lg overflow-hidden">
            {/* Thumbnail Preview */}
            <div 
              className="relative bg-gray-900"
              style={{ width: previewWidth, height: previewHeight }}
            >
              {currentThumbnail ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${currentThumbnail.url})`,
                    backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`,
                    backgroundSize: `${currentThumbnail.width * 10}px ${currentThumbnail.height * 10}px`, // Assuming 10x10 grid
                  }}
                />
              ) : thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Video preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  No preview
                </div>
              )}
              
              {/* Loading overlay */}
              {!currentThumbnail && !thumbnailUrl && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            {/* Time Display */}
            <div className="px-2 py-1 bg-black text-white text-xs text-center font-mono">
              {formatTime(previewTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified version for basic hover previews without sprite sheets
export function SimpleVideoPreview({
  videoId,
  thumbnailUrl,
  className,
  children,
  showOnHover = true
}: {
  videoId: string;
  thumbnailUrl?: string;
  className?: string;
  children: React.ReactNode;
  showOnHover?: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (showOnHover) {
      setIsHovering(true);
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showOnHover) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}
      
      {/* Simple Preview Tooltip */}
      {isHovering && showOnHover && thumbnailUrl && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x - 80,
            top: mousePosition.y - 60,
          }}
        >
          <div className="bg-black rounded-lg shadow-lg overflow-hidden">
            <img
              src={thumbnailUrl}
              alt="Video preview"
              className="w-32 h-18 object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPreviewHover;
