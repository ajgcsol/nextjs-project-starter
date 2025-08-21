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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Mic, Users, Clock, CheckCircle, XCircle, Download } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  filename: string;
  duration: number;
  file_size: number;
  s3_key: string;
  uploaded_at: string;
}

interface TranscriptionOptions {
  language: string;
  enableSpeakerLabels: boolean;
  maxSpeakers?: number;
  enableAutomaticPunctuation: boolean;
  enableWordTimestamps: boolean;
  confidenceThreshold: number;
  customVocabulary: string[];
}

interface TranscriptionResult {
  success: boolean;
  jobId?: string;
  transcriptText?: string;
  transcriptUrl?: string;
  webVttUrl?: string;
  srtUrl?: string;
  confidence?: number;
  processingMethod?: string;
  processingTime?: number;
  wordCount?: number;
  error?: string;
}

export default function TranscriptionAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [options, setOptions] = useState<TranscriptionOptions>({
    language: 'en-US',
    enableSpeakerLabels: true,
    maxSpeakers: 4,
    enableAutomaticPunctuation: true,
    enableWordTimestamps: true,
    confidenceThreshold: 0.8,
    customVocabulary: []
  });

  const [customVocabInput, setCustomVocabInput] = useState('');

  // Load videos that need transcription
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos/transcribe?action=list-videos-needing-transcription&limit=50');
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos);
        console.log(`📋 Found ${data.videos.length} videos that could benefit from transcription`);
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

  const addCustomVocabulary = () => {
    if (customVocabInput.trim()) {
      const newWords = customVocabInput.split(',').map(word => word.trim()).filter(word => word);
      setOptions({
        ...options,
        customVocabulary: [...options.customVocabulary, ...newWords]
      });
      setCustomVocabInput('');
    }
  };

  const removeVocabularyWord = (index: number) => {
    const newVocabulary = [...options.customVocabulary];
    newVocabulary.splice(index, 1);
    setOptions({...options, customVocabulary: newVocabulary});
  };

  const processSelectedVideos = async () => {
    if (selectedVideos.length === 0) {
      alert('Please select at least one video to transcribe');
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setCurrentVideo('');

    try {
      console.log(`🎤 Starting transcription for ${selectedVideos.length} videos...`);
      
      // Process videos in batches to avoid timeouts
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < selectedVideos.length; i += batchSize) {
        batches.push(selectedVideos.slice(i, i + batchSize));
      }

      let processedCount = 0;
      const allResults: TranscriptionResult[] = [];

      for (const batch of batches) {
        console.log(`🎤 Processing batch: ${batch.length} videos`);
        
        for (const videoId of batch) {
          const video = videos.find(v => v.id === videoId);
          if (!video) continue;

          setCurrentVideo(video.title);
          
          try {
            const response = await fetch('/api/videos/transcribe', {
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
            
            console.log(`✅ Transcribed ${video.title}:`, result.success ? 'Success' : 'Failed');
            
          } catch (error) {
            console.error(`❌ Error transcribing ${video.title}:`, error);
            allResults.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            processedCount++;
            setProgress((processedCount / selectedVideos.length) * 100);
          }

          // Add delay between videos to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setResults(allResults);
      setCurrentVideo('');
      
      const successful = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;
      
      console.log(`🎤 ✅ Transcription completed: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('❌ Batch transcription error:', error);
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

  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-US', name: 'Spanish (US)' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)' }
  ];

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
        <h1 className="text-3xl font-bold mb-2">AI Transcription & Closed Captioning</h1>
        <p className="text-gray-600">
          Generate transcripts and closed captions for videos using AI speech recognition
        </p>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Select Videos</TabsTrigger>
          <TabsTrigger value="options">Transcription Options</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Videos Needing Transcription
              </CardTitle>
              <CardDescription>
                Found {videos.length} videos that could benefit from transcription
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
                      {video.title?.toLowerCase().includes('lecture') ? 'Lecture' : 
                       video.duration > 1800 ? 'Long' : 'Standard'}
                    </Badge>
                  </div>
                ))}
              </div>

              {videos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No videos found that need transcription</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcription Options</CardTitle>
              <CardDescription>
                Configure AI transcription and caption generation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Language & Recognition</h4>
                  
                  <div>
                    <Label>Language</Label>
                    <Select 
                      value={options.language} 
                      onValueChange={(value) => 
                        setOptions({...options, language: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.enableSpeakerLabels}
                      onCheckedChange={(checked) => 
                        setOptions({...options, enableSpeakerLabels: checked as boolean})
                      }
                    />
                    <label className="text-sm">Enable Speaker Labels</label>
                  </div>

                  {options.enableSpeakerLabels && (
                    <div>
                      <Label>Maximum Speakers</Label>
                      <Select 
                        value={options.maxSpeakers?.toString() || '4'} 
                        onValueChange={(value) => 
                          setOptions({...options, maxSpeakers: parseInt(value)})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 8, 10].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} speakers
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.enableAutomaticPunctuation}
                      onCheckedChange={(checked) => 
                        setOptions({...options, enableAutomaticPunctuation: checked as boolean})
                      }
                    />
                    <label className="text-sm">Automatic Punctuation</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={options.enableWordTimestamps}
                      onCheckedChange={(checked) => 
                        setOptions({...options, enableWordTimestamps: checked as boolean})
                      }
                    />
                    <label className="text-sm">Word-Level Timestamps</label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Quality & Vocabulary</h4>
                  
                  <div>
                    <Label>Confidence Threshold</Label>
                    <Select 
                      value={options.confidenceThreshold.toString()} 
                      onValueChange={(value) => 
                        setOptions({...options, confidenceThreshold: parseFloat(value)})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.6">60% - Low (more words, less accuracy)</SelectItem>
                        <SelectItem value="0.8">80% - Medium (balanced)</SelectItem>
                        <SelectItem value="0.9">90% - High (fewer words, high accuracy)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Custom Vocabulary</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add legal terms, names, etc. (comma-separated)"
                        value={customVocabInput}
                        onChange={(e) => setCustomVocabInput(e.target.value)}
                      />
                      <Button onClick={addCustomVocabulary} size="sm">Add</Button>
                    </div>
                    
                    {options.customVocabulary.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {options.customVocabulary.map((word, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => removeVocabularyWord(index)}
                          >
                            {word} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  AI transcription will generate accurate text from speech, identify speakers, 
                  and create WebVTT and SRT caption files for accessibility and searchability.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcription Results</CardTitle>
              <CardDescription>
                AI transcription status and generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processing && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing transcription...</span>
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
                  <h4 className="font-medium mb-2">Transcription Results:</h4>
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 border rounded"
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          Video {index + 1}: {result.success ? 'Success' : 'Failed'}
                        </div>
                        {result.success && (
                          <div className="text-sm text-gray-600 mt-1">
                            {result.wordCount} words • {result.confidence && `${Math.round(result.confidence * 100)}% confidence`}
                          </div>
                        )}
                        {result.error && (
                          <div className="text-sm text-red-600 mt-1">{result.error}</div>
                        )}
                      </div>
                      {result.processingTime && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {result.processingTime}ms
                        </Badge>
                      )}
                      {result.success && (
                        <div className="flex gap-1">
                          <Badge variant="secondary">WebVTT</Badge>
                          <Badge variant="secondary">SRT</Badge>
                          <Badge variant="secondary">TXT</Badge>
                        </div>
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
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transcription results yet</p>
                  <p className="text-sm">Select videos and start transcription to see results here</p>
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
            <Mic className="h-4 w-4" />
          )}
          {processing ? 'Processing...' : `Transcribe ${selectedVideos.length} Videos`}
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
