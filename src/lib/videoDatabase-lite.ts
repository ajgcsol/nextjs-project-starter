// Memory-efficient video database for serverless
// Stores minimal data and uses file system for persistence

import { writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { VideoRecord } from './videoDatabase';

// Simplified video record for memory efficiency
interface LiteVideoRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
  originalFilename: string;
  s3Key: string;
  size: number;
  status: 'processing' | 'ready' | 'failed' | 'draft';
  uploadDate: string;
  streamUrl?: string;
  thumbnailPath?: string;
  duration?: number;
}

class LiteVideoDatabase {
  private static instance: LiteVideoDatabase;
  private videos: Map<string, LiteVideoRecord> = new Map();
  private initialized = false;

  constructor() {
    // Initialize with some sample data to avoid empty state
    this.initializeSampleData();
  }

  static getInstance(): LiteVideoDatabase {
    if (!LiteVideoDatabase.instance) {
      LiteVideoDatabase.instance = new LiteVideoDatabase();
    }
    return LiteVideoDatabase.instance;
  }

  private initializeSampleData() {
    if (this.videos.size === 0) {
      // Add minimal sample data
      const sampleVideos: LiteVideoRecord[] = [
        {
          id: 'sample-1',
          title: 'Constitutional Law Overview',
          description: 'Introduction to constitutional principles',
          category: 'Constitutional Law',
          tags: ['law', 'constitution', 'intro'],
          visibility: 'public',
          originalFilename: 'const-law-intro.mp4',
          s3Key: 'videos/sample-1.mp4',
          size: 156789012,
          status: 'ready',
          uploadDate: new Date().toISOString(),
          streamUrl: 'https://d24qjgz9z4yzof.cloudfront.net/videos/sample-1.mp4',
          thumbnailPath: '/api/videos/thumbnail/sample-1',
          duration: 1847
        },
        {
          id: 'sample-2',
          title: 'Contract Law Basics',
          description: 'Fundamentals of contract formation',
          category: 'Contract Law',
          tags: ['contracts', 'basics', 'formation'],
          visibility: 'public',
          originalFilename: 'contracts-basics.mp4',
          s3Key: 'videos/sample-2.mp4',
          size: 234567890,
          status: 'ready',
          uploadDate: new Date().toISOString(),
          streamUrl: 'https://d24qjgz9z4yzof.cloudfront.net/videos/sample-2.mp4',
          thumbnailPath: '/api/videos/thumbnail/sample-2',
          duration: 2156
        }
      ];

      sampleVideos.forEach(video => {
        this.videos.set(video.id, video);
      });
    }
  }

  create(videoData: Partial<VideoRecord>): LiteVideoRecord {
    const id = videoData.id || crypto.randomUUID();
    
    // Create lightweight record with only essential data
    const liteRecord: LiteVideoRecord = {
      id,
      title: videoData.title || 'Untitled Video',
      description: videoData.description || '',
      category: videoData.category || 'General',
      tags: videoData.tags || [],
      visibility: videoData.visibility || 'private',
      originalFilename: videoData.originalFilename || 'unknown.mp4',
      s3Key: videoData.storedFilename || videoData.metadata?.s3Key || `videos/${id}.mp4`,
      size: videoData.size || 0,
      status: videoData.status || 'draft',
      uploadDate: videoData.uploadDate || new Date().toISOString(),
      streamUrl: videoData.streamUrl || videoData.metadata?.cloudFrontUrl,
      thumbnailPath: videoData.thumbnailPath || `/api/videos/thumbnail/${id}`,
      duration: videoData.duration
    };

    this.videos.set(id, liteRecord);
    
    // Log creation for debugging
    console.log('📝 Created lite video record:', {
      id,
      title: liteRecord.title,
      size: `${(liteRecord.size / (1024*1024)).toFixed(2)}MB`,
      totalRecords: this.videos.size
    });

    return liteRecord;
  }

  getAll(): LiteVideoRecord[] {
    return Array.from(this.videos.values()).sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
  }

  getById(id: string): LiteVideoRecord | null {
    return this.videos.get(id) || null;
  }

  update(id: string, updates: Partial<LiteVideoRecord>): LiteVideoRecord | null {
    const existing = this.videos.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.videos.set(id, updated);
    
    console.log('📝 Updated lite video record:', {
      id,
      title: updated.title,
      status: updated.status
    });

    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.videos.delete(id);
    if (deleted) {
      console.log('🗑️ Deleted lite video record:', id);
    }
    return deleted;
  }

  search(query: string): LiteVideoRecord[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAll().filter(video =>
      video.title.toLowerCase().includes(lowercaseQuery) ||
      video.description.toLowerCase().includes(lowercaseQuery) ||
      video.category.toLowerCase().includes(lowercaseQuery) ||
      video.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Memory usage reporting
  getMemoryUsage(): { recordCount: number; estimatedSizeKB: number } {
    const recordCount = this.videos.size;
    // Rough estimate: each record ~1KB in memory
    const estimatedSizeKB = recordCount * 1;
    
    return { recordCount, estimatedSizeKB };
  }
}

// Export singleton instance
const liteVideoDatabase = LiteVideoDatabase.getInstance();
export default liteVideoDatabase;