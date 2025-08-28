"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Edit3, 
  Check, 
  X, 
  Camera, 
  User,
  UserCircle,
  Settings,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Speaker {
  id: string;
  originalLabel: string; // "Speaker 1", "Speaker 2", etc.
  name: string; // User-assigned name
  color: string;
  segments: number; // Number of segments spoken
  screenshot?: string; // Base64 screenshot if available
  confidence: number; // Average confidence for this speaker
}

interface SpeakerIdentificationProps {
  videoId: string;
  transcript: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onSpeakersUpdated?: (speakers: Speaker[]) => void;
  className?: string;
}

export function SpeakerIdentification({
  videoId,
  transcript,
  videoRef,
  onSpeakersUpdated,
  className
}: SpeakerIdentificationProps) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState<string | null>(null);
  const [showIdentificationDialog, setShowIdentificationDialog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Speaker colors for consistent UI
  const speakerColors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200', 
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-red-100 text-red-800 border-red-200'
  ];

  // Parse transcript and identify speakers
  useEffect(() => {
    if (transcript) {
      const lines = transcript.split('\n').filter(line => line.trim());
      const speakerMap = new Map<string, { segments: number; confidence: number; texts: string[] }>();
      
      lines.forEach(line => {
        const speakerMatch = line.match(/^(Speaker \d+|[^:]+):\s*(.+)$/);
        if (speakerMatch) {
          const speakerLabel = speakerMatch[1];
          const text = speakerMatch[2].trim();
          
          if (!speakerMap.has(speakerLabel)) {
            speakerMap.set(speakerLabel, { segments: 0, confidence: 0.9, texts: [] });
          }
          
          const speaker = speakerMap.get(speakerLabel)!;
          speaker.segments++;
          speaker.texts.push(text);
        }
      });

      const identifiedSpeakers: Speaker[] = Array.from(speakerMap.entries()).map(
        ([label, data], index) => ({
          id: `speaker-${index}`,
          originalLabel: label,
          name: label, // Default to original label
          color: speakerColors[index % speakerColors.length],
          segments: data.segments,
          confidence: data.confidence,
        })
      );

      setSpeakers(identifiedSpeakers);
      onSpeakersUpdated?.(identifiedSpeakers);
    }
  }, [transcript, onSpeakersUpdated]);

  // Capture screenshot of current video frame for speaker
  const captureScreenshot = async (speakerId: string) => {
    if (!videoRef?.current || !canvasRef.current) {
      console.warn('Video or canvas ref not available for screenshot');
      return;
    }

    setIsCapturingScreenshot(speakerId);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const screenshot = canvas.toDataURL('image/jpeg', 0.8);
      
      // Update speaker with screenshot
      setSpeakers(prev => prev.map(speaker => 
        speaker.id === speakerId 
          ? { ...speaker, screenshot }
          : speaker
      ));
      
      console.log(`📸 Screenshot captured for ${speakerId}`);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      setIsCapturingScreenshot(null);
    }
  };

  // Start editing a speaker name
  const startEditing = (speaker: Speaker) => {
    setEditingSpeaker(speaker.id);
    setEditName(speaker.name);
  };

  // Save speaker name
  const saveSpeakerName = () => {
    if (editingSpeaker && editName.trim()) {
      setSpeakers(prev => prev.map(speaker => 
        speaker.id === editingSpeaker 
          ? { ...speaker, name: editName.trim() }
          : speaker
      ));
      
      setEditingSpeaker(null);
      setEditName('');
      
      // Notify parent component
      const updatedSpeakers = speakers.map(speaker => 
        speaker.id === editingSpeaker 
          ? { ...speaker, name: editName.trim() }
          : speaker
      );
      onSpeakersUpdated?.(updatedSpeakers);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSpeaker(null);
    setEditName('');
  };

  // Save all speaker identifications
  const saveIdentifications = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakers })
      });

      if (response.ok) {
        console.log('✅ Speaker identifications saved');
        setShowIdentificationDialog(false);
      } else {
        console.error('❌ Failed to save speaker identifications');
      }
    } catch (error) {
      console.error('Error saving speaker identifications:', error);
    }
  };

  if (speakers.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No speakers identified in transcript.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Speaker Identification</span>
              <Badge variant="secondary" className="ml-2">
                {speakers.length} Speaker{speakers.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIdentificationDialog(true)}
              className="flex items-center space-x-1"
            >
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {speaker.screenshot ? (
                      <img
                        src={speaker.screenshot}
                        alt={speaker.name}
                        className="w-16 h-16 rounded-lg object-cover border-2"
                        style={{ borderColor: speaker.color.includes('blue') ? '#3b82f6' : '#6b7280' }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <UserCircle className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium border", speaker.color)}
                      >
                        {speaker.originalLabel}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {speaker.name}
                    </h3>

                    <div className="text-xs text-gray-500 space-y-1">
                      <div>{speaker.segments} segments</div>
                      <div>{Math.round(speaker.confidence * 100)}% confidence</div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    {videoRef && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => captureScreenshot(speaker.id)}
                        disabled={isCapturingScreenshot === speaker.id}
                        className="h-8 w-8 p-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(speaker)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hidden canvas for screenshot capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Identification Management Dialog */}
      <Dialog open={showIdentificationDialog} onOpenChange={setShowIdentificationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Speaker Identifications</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <Badge variant="outline" className={cn("text-xs", speaker.color)}>
                  {speaker.originalLabel}
                </Badge>
                
                {editingSpeaker === speaker.id ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter speaker name"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSpeakerName();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveSpeakerName}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="flex-1 font-medium">{speaker.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(speaker)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="text-sm text-gray-500">
                  {speaker.segments} segments
                </div>
              </div>
            ))}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowIdentificationDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveIdentifications}>
                <Save className="h-4 w-4 mr-2" />
                Save Identifications
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}