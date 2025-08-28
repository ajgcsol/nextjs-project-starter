"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Users, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Download,
  Play,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpeakerIdentification } from './SpeakerIdentification';

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp?: number;
  confidence?: number;
}

interface Speaker {
  id: string;
  originalLabel: string;
  name: string;
  color: string;
  segments: number;
  screenshot?: string;
  confidence: number;
}

interface TranscriptDisplayProps {
  videoId: string;
  transcriptText?: string;
  speakerCount?: number;
  className?: string;
  onTimestampClick?: (timestamp: number) => void;
  showSpeakerStats?: boolean;
  showSearch?: boolean;
  showDownload?: boolean;
  showSpeakerIdentification?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export function TranscriptDisplay({
  videoId,
  transcriptText,
  speakerCount = 0,
  className,
  onTimestampClick,
  showSpeakerStats = true,
  showSearch = true,
  showDownload = true,
  showSpeakerIdentification = true,
  videoRef
}: TranscriptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [filteredTranscript, setFilteredTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showIdentificationPanel, setShowIdentificationPanel] = useState(false);

  // Parse transcript text into segments
  useEffect(() => {
    if (transcriptText) {
      const segments = parseTranscriptText(transcriptText);
      setTranscript(segments);
      setFilteredTranscript(segments);
      setIsLoading(false);
    } else {
      // Fetch transcript from API if not provided
      fetchTranscript();
    }
  }, [transcriptText, videoId]);

  // Filter transcript based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = transcript.filter(segment =>
        segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        segment.speaker.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTranscript(filtered);
    } else {
      setFilteredTranscript(transcript);
    }
  }, [searchTerm, transcript]);

  const fetchTranscript = async () => {
    try {
      const response = await fetch(`/api/videos/transcription-status/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.transcript) {
          const segments = parseTranscriptText(data.transcript);
          setTranscript(segments);
          setFilteredTranscript(segments);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch transcript:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseTranscriptText = (text: string): TranscriptSegment[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const segments: TranscriptSegment[] = [];

    lines.forEach(line => {
      const speakerMatch = line.match(/^(Speaker \d+|[^:]+):\s*(.+)$/);
      if (speakerMatch) {
        segments.push({
          speaker: speakerMatch[1],
          text: speakerMatch[2].trim(),
          confidence: 0.9
        });
      } else if (line.trim()) {
        // Handle lines without speaker labels
        segments.push({
          speaker: 'Unknown',
          text: line.trim(),
          confidence: 0.8
        });
      }
    });

    return segments;
  };

  const handleCopyTranscript = () => {
    const fullText = filteredTranscript
      .map(segment => `${segment.speaker}: ${segment.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
  };

  const handleDownloadTranscript = () => {
    const fullText = filteredTranscript
      .map(segment => `${segment.speaker}: ${segment.text}`)
      .join('\n');
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle speaker updates from the identification component
  const handleSpeakersUpdated = (updatedSpeakers: Speaker[]) => {
    setSpeakers(updatedSpeakers);
  };

  // Get speaker display name and color
  const getSpeakerDisplayInfo = (speakerLabel: string) => {
    const speaker = speakers.find(s => s.originalLabel === speakerLabel);
    return {
      name: speaker?.name || speakerLabel,
      color: speaker?.color || 'bg-gray-100 text-gray-800 border-gray-200'
    };
  };

  const getSpeakerColor = (speaker: string) => {
    const info = getSpeakerDisplayInfo(speaker);
    return info.color;
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <FileText className="h-5 w-5 animate-pulse" />
            <span>Loading transcript...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transcript.length) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No transcript available for this video.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Video Transcript</span>
            {showSpeakerStats && speakerCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                <Users className="h-3 w-3 mr-1" />
                {speakerCount} Speaker{speakerCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {showSpeakerIdentification && speakerCount > 1 && (
              <Button
                variant={showIdentificationPanel ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowIdentificationPanel(!showIdentificationPanel)}
                className="h-8 px-3"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                <span className="text-xs">ID Speakers</span>
              </Button>
            )}
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTranscript}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTranscript}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {showSearch && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(
        "max-h-96 overflow-y-auto transition-all duration-300",
        !isExpanded && "max-h-32"
      )}>
        {filteredTranscript.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No results found for "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTranscript.map((segment, index) => (
              <div
                key={index}
                className="group p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => segment.timestamp && onTimestampClick?.(segment.timestamp)}
              >
                <div className="flex items-start space-x-3">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "flex-shrink-0 text-xs font-medium border",
                      getSpeakerColor(segment.speaker)
                    )}
                  >
                    {getSpeakerDisplayInfo(segment.speaker).name}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {highlightSearchTerm(segment.text, searchTerm)}
                    </p>
                    
                    {segment.timestamp && (
                      <div className="flex items-center mt-2 text-xs text-gray-500 group-hover:text-blue-600">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTimestamp(segment.timestamp)}</span>
                        <Play className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                  
                  {segment.confidence && (
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {Math.round(segment.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Speaker Identification Panel */}
      {showIdentificationPanel && showSpeakerIdentification && transcriptText && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <SpeakerIdentification
              videoId={videoId}
              transcript={transcriptText}
              videoRef={videoRef}
              onSpeakersUpdated={handleSpeakersUpdated}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Helper function to highlight search terms
function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <span key={index} className="bg-yellow-200 px-1 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// Helper function to format timestamp
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}