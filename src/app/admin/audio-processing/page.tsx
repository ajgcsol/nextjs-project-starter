'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Volume2, VolumeX, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  filename: string;
  file_size: number;
  duration: number;
  s3_key: string;
  uploaded_at: string;
}

interface AudioProcessingOptions {
  noiseReduction: boolean;
  feedbackRemoval: boolean;
  audioEnhancement: boolean;
  outputFormat: 'mp3' | 'aac' | 'wav';
  quality: 'high' | 'medium' | 'low';
  normalizeAudio: boolean;
  compressDynamicRange: boolean;
}

interface ProcessingResult {
  success: boolean;
  jobId?: string;
  processedAudioUrl?: string;
  processingMethod?: string;
  processingTime?: number;
  error?: string;
}

export default function AudioProcessingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [options, setOptions] = useState<AudioProcessingOptions>({
    noiseReduction: true,
    feedbackRemoval: true,
    audioEnhancement: true,
    outputFormat: 'mp3',
    quality: 'high',
    normalizeAudio: true,
    compressDynamicRange: false
  });

  // Load videos that might need audio processing
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos/process-audio?action=list-videos-needing-audio-processing&limit=50');
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos);
        console.log(`📋 Found ${data.videos.length} videos that could benefit from audio processing`);
      } else {
        console.error('Failed to load videos:', data.error);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelection = (videoId: string, checked: boolean) => {
    if (checked) {
      setSelectedVideos([...selectedVideos, videoId]);
    } else {
      setSelectedVideos(selectedVideos.filter(id => id !== videoId));
    }
  };

  const selectAllVideos = () => {
    setSelectedVideos(videos.map(v => v.id));
  };

  const clearSelection = () => {
    setSelectedVideos([]);
  };

  const processSelectedVideos = async () => {
    if (selectedVideos.length === 0) {
      alert('Please select at least one video to process');
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setCurrentVideo('');

    try {
      console.log(`🎵 Starting audio processing for ${selectedVideos.length} videos...`);
      
      // Process videos in batches to avoid timeouts
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < selectedVideos.length; i += batchSize) {
        batches.push(selectedVideos.slice(i, i + batchSize));
      }

      let processedCount = 0;
      const allResults: ProcessingResult[] = [];

      for (const batch of batches) {
        console.log(`🎵 Processing batch: ${batch.length} videos`);
        
        for (const videoId of batch) {
          const video = videos.find(v => v.id === videoId);
          if (!video) continue;

          setCurrentVideo(video.title);
          
          try {
            const response = await fetch('/api/videos/process-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                videoId,
                options
              }),
            });

            const result = await response.json();
            allResults.push(result);
            
            processedCount++;
            setProgress((processedCount / selectedVideos.length) * 100);
            
            console.log(`✅ Processed ${video.title}:`, result.success ? 'Success' : 'Failed');
            
          } catch (error) {
            console.error(`❌ Error processing ${video.title}:`, error);
            allResults.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            processedCount++;
            setProgress((processedCount / selectedVideos.length) * 100);
          }

          // Add delay between videos to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setResults(allResults);
      setCurrentVideo('');
      
      const successful = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;
      
      console.log(`🎵 ✅ Audio processing completed: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('❌ Batch audio processing error:', error);
    } finally {
      setProcessing(false);
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
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading videos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Audio Processing</h1>
        <p className="text-gray-600">
          Enhance video audio with noise reduction, feedback removal, and audio normalization
        </p>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Select Videos</TabsTrigger>
          <TabsTrigger value="options">Processing Options</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Videos Needing Audio Processing
              </CardTitle>
              <CardDescription>
                Found {videos.length} videos that could benefit from audio enhancement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={selectAllVideos}
                  variant="outline"
                  size="sm"
                >
                  Select All ({videos.length})
                </Button>
                <Button 
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
                <Badge variant="secondary">
                  {selectedVideos.length} selected
                </Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedVideos.includes(video.id)}
                      onCheckedChange={(checked) => 
                        handleVideoSelection(video.id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{video.title}</div>
                      <div className="text-sm text-gray-500 truncate">{video.filename}</div>
                      <div className="flex gap-4 text-xs text-gray-400 mt-1">
                        <span>{formatFileSize(video.file_size)}</span>
                        <span>{formatDuration(video.duration)}</span>
                        <span>{new Date(video.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {video.filename?.toLowerCase().includes('.wmv') ? 'WMV' : 
                       video.file_size > 500 * 1024 * 1024 ? 'Large' : 'Standard'}
                    </Badge>
                  </div>
                ))}
              </div>

              {videos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <VolumeX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No videos found that need audio processing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audio Processing Options</CardTitle>
              <CardDescription>
                Configure audio enhancement settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Audio Filters</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.noiseReduction}
                      onCheckedChange={(checked) => 
                        setOptions({...options, noiseReduction: checked as boolean})
                      }
                    />
                    <label className="text-sm">Noise Reduction</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.feedbackRemoval}
                      onCheckedChange={(checked) => 
                        setOptions({...options, feedbackRemoval: checked as boolean})
                      }
                    />
                    <label className="text-sm">Feedback Removal</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.audioEnhancement}
                      onCheckedChange={(checked) => 
                        setOptions({...options, audioEnhancement: checked as boolean})
                      }
                    />
                    <label className="text-sm">Audio Enhancement</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.normalizeAudio}
                      onCheckedChange={(checked) => 
                        setOptions({...options, normalizeAudio: checked as boolean})
                      }
                    />
                    <label className="text-sm">Normalize Audio</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.compressDynamicRange}
                      onCheckedChange={(checked) => 
                        setOptions({...options, compressDynamicRange: checked as boolean})
                      }
                    />
                    <label className="text-sm">Compress Dynamic Range</label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Output Settings</h4>
                  
                  <div>
                    <label className="text-sm font-medium">Output Format</label>
                    <Select 
                      value={options.outputFormat} 
                      onValueChange={(value: 'mp3' | 'aac' | 'wav') => 
                        setOptions({...options, outputFormat: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp3">MP3 (Recommended)</SelectItem>
                        <SelectItem value="aac">AAC (High Quality)</SelectItem>
                        <SelectItem value="wav">WAV (Uncompressed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quality</label>
                    <Select 
                      value={options.quality} 
                      onValueChange={(value: 'high' | 'medium' | 'low') => 
                        setOptions({...options, quality: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High (320 kbps)</SelectItem>
                        <SelectItem value="medium">Medium (192 kbps)</SelectItem>
                        <SelectItem value="low">Low (128 kbps)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Audio processing will enhance video quality by reducing background noise, 
                  removing feedback, and normalizing audio levels for better listening experience.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>
                Audio processing status and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processing && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing audio...</span>
                  </div>
                  
                  {currentVideo && (
                    <div className="text-sm text-gray-600">
                      Current: {currentVideo}
                    </div>
                  )}
                  
                  <Progress value={progress} className="w-full" />
                  <div className="text-sm text-gray-500">
                    {Math.round(progress)}% complete
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Processing Results:</h4>
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded"
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="flex-1">
                        Video {index + 1}: {result.success ? 'Success' : 'Failed'}
                      </span>
                      {result.processingTime && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {result.processingTime}ms
                        </Badge>
                      )}
                      {result.error && (
                        <span className="text-sm text-red-600">{result.error}</span>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <div className="text-sm">
                      <strong>Summary:</strong> {results.filter(r => r.success).length} successful, {results.filter(r => !r.success).length} failed
                    </div>
                  </div>
                </div>
              )}

              {!processing && results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No processing results yet</p>
                  <p className="text-sm">Select videos and start processing to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 mt-6">
        <Button
          onClick={processSelectedVideos}
          disabled={processing || selectedVideos.length === 0}
          className="flex items-center gap-2"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {processing ? 'Processing...' : `Process ${selectedVideos.length} Videos`}
        </Button>
        
        <Button
          onClick={loadVideos}
          variant="outline"
          disabled={processing}
        >
          Refresh Videos
        </Button>
      </div>
    </div>
  );
}
