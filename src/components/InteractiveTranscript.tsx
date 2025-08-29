"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  Clock, 
  Users, 
  Eye, 
  EyeOff,
  Edit3,
  Search,
  Download
} from 'lucide-react';

interface TranscriptSegment {
  id: string;
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  isRelevant?: boolean;
  displayName?: string;
  showSpeakerLabel?: boolean;
}

interface InteractiveTranscriptProps {
  videoId: string;
  segments: TranscriptSegment[];
  currentTime?: number;
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  onSpeakerToggle?: (speakerId: string, visible: boolean) => void;
  className?: string;
}

export function InteractiveTranscript({
  videoId,
  segments,
  currentTime = 0,
  isPlaying = false,
  onSeek,
  onSpeakerToggle,
  className
}: InteractiveTranscriptProps) {
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const [speakerVisibility, setSpeakerVisibility] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Update highlighted segment based on current video time
  useEffect(() => {
    if (currentTime > 0 && segments.length > 0) {
      const currentSegment = segments.find(
        seg => currentTime >= seg.startTime && currentTime <= seg.endTime
      );
      
      if (currentSegment && currentSegment.id !== highlightedSegment) {
        setHighlightedSegment(currentSegment.id);
        
        // Auto-scroll to current segment
        const segmentElement = document.getElementById(`segment-${currentSegment.id}`);
        if (segmentElement && transcriptRef.current) {
          segmentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }
  }, [currentTime, segments, highlightedSegment]);

  // Initialize speaker visibility
  useEffect(() => {
    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];
    const initialVisibility = uniqueSpeakers.reduce((acc, speaker) => ({
      ...acc,
      [speaker]: true
    }), {});
    setSpeakerVisibility(initialVisibility);
  }, [segments]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (onSeek) {
      onSeek(segment.startTime);
    }
    setHighlightedSegment(segment.id);
  };

  const toggleSpeakerVisibility = (speaker: string) => {
    const newVisibility = !speakerVisibility[speaker];
    setSpeakerVisibility(prev => ({
      ...prev,
      [speaker]: newVisibility
    }));
    
    if (onSpeakerToggle) {
      onSpeakerToggle(speaker, newVisibility);
    }
  };

  const filteredSegments = segments.filter(segment => {
    // Filter by speaker visibility
    if (!speakerVisibility[segment.speaker]) return false;
    
    // Filter by search term
    if (searchTerm && !segment.text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];
  const totalDuration = Math.max(...segments.map(s => s.endTime));
  const averageConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <Pause className="h-4 w-4 text-blue-600" />
            ) : (
              <Play className="h-4 w-4 text-gray-600" />
            )}
            <span className="font-medium">Interactive Transcript</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-3 w-3" />
            <span>{uniqueSpeakers.length} speakers</span>
            <Clock className="h-3 w-3 ml-2" />
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimestamps(!showTimestamps)}
            className="text-xs"
          >
            <Clock className="h-3 w-3 mr-1" />
            {showTimestamps ? 'Hide' : 'Show'} Times
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Speaker Controls */}
      <div className="p-3 bg-gray-50 border-b">
        <div className="flex flex-wrap gap-2 mb-3">
          {uniqueSpeakers.map(speaker => {
            const segmentCount = segments.filter(s => s.speaker === speaker).length;
            const isVisible = speakerVisibility[speaker];
            
            return (
              <Button
                key={speaker}
                variant={isVisible ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSpeakerVisibility(speaker)}
                className={cn(
                  "text-xs flex items-center gap-1",
                  !isVisible && "opacity-50"
                )}
              >
                {isVisible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {speaker} ({segmentCount})
              </Button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Transcript Content */}
      <div 
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {filteredSegments.length > 0 ? (
          filteredSegments.map((segment) => {
            const isHighlighted = segment.id === highlightedSegment;
            const showSpeaker = segment.showSpeakerLabel !== false;
            
            return (
              <div
                key={segment.id}
                id={`segment-${segment.id}`}
                onClick={() => handleSegmentClick(segment)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4",
                  isHighlighted 
                    ? "bg-blue-100 border-l-blue-500 shadow-sm" 
                    : "bg-gray-50 border-l-gray-200 hover:bg-gray-100",
                  "hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Speaker and Timestamp Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {showSpeaker && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            isHighlighted && "bg-blue-200 text-blue-800"
                          )}
                        >
                          {segment.displayName || segment.speaker}
                        </Badge>
                      )}
                      
                      {showTimestamps && (
                        <span className="text-xs text-gray-500 font-mono">
                          {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                        </span>
                      )}
                      
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {Math.round(segment.confidence * 100)}%
                      </Badge>
                    </div>

                    {/* Transcript Text */}
                    <p className={cn(
                      "text-sm leading-relaxed",
                      isHighlighted ? "text-blue-900 font-medium" : "text-gray-700",
                      searchTerm && segment.text.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      "bg-yellow-100"
                    )}>
                      {/* Highlight search terms */}
                      {searchTerm ? (
                        segment.text.replace(
                          new RegExp(`(${searchTerm})`, 'gi'),
                          '<mark class="bg-yellow-300">$1</mark>'
                        )
                      ) : (
                        segment.text
                      )}
                    </p>
                  </div>

                  {/* Play button for segment */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSegmentClick(segment);
                    }}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? (
              <div>
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{searchTerm}"</p>
              </div>
            ) : (
              <div>
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All speakers are hidden</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{filteredSegments.length} segments visible</span>
          <span>Avg confidence: {Math.round(averageConfidence * 100)}%</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Current: {formatTime(currentTime)}</span>
          {isPlaying && (
            <Badge variant="default" className="bg-green-500 text-xs">
              LIVE
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}