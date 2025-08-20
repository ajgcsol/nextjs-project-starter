// Serverless-compatible video database
// Uses global variable for persistence within the same function instance

export interface VideoRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
  originalFilename: string;
  storedFilename: string;
  thumbnailPath: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  status: 'processing' | 'ready' | 'failed' | 'draft';
  uploadDate: string;
  views: number;
  createdBy: string;
  streamUrl?: string;
  metadata?: any;
}

// Global variable to persist data across function calls within the same instance
let globalVideoStore: Map<string, VideoRecord> | null = null;

class VideoDatabase {
  private videos: Map<string, VideoRecord>;

  constructor() {
    try {
      // Use global store for persistence within the same serverless function instance
      if (globalVideoStore === null) {
        globalVideoStore = new Map();
        this.videos = globalVideoStore;
        this.addSampleVideos();
        console.log('🎬 Initialized new video database with sample data');
      } else {
        this.videos = globalVideoStore;
      }
      console.log('🎬 Video database loaded with', this.videos.size, 'videos');
    } catch (error) {
      console.error('🎬 Error initializing video database:', error);
      // Fallback to empty map if initialization fails
      this.videos = new Map();
      globalVideoStore = this.videos;
    }
  }

  private addSampleVideos() {
    try {
      // Add sample videos that were already in the UI
      const sampleVideos: VideoRecord[] = [
        {
          id: "sample-1",
          title: "Constitutional Law: Introduction to Civil Rights",
          description: "Comprehensive overview of civil rights law and constitutional interpretation",
          category: "Constitutional Law",
          tags: ["civil rights", "constitution", "lecture"],
          visibility: "public",
          originalFilename: "civil-rights-intro.mp4",
          storedFilename: "sample-1_original.mp4",
          thumbnailPath: "/api/videos/thumbnail/sample-1",
          size: 1024 * 1024 * 250, // 250MB
          duration: 3600, // 1 hour
          width: 1920,
          height: 1080,
          bitrate: 5000000,
          status: "ready",
          uploadDate: "2024-01-15",
          views: 234,
          createdBy: "Prof. Sarah Johnson",
          streamUrl: "/api/videos/stream/sample-1"
        },
        {
          id: "sample-2",
          title: "Contract Formation Principles",
          description: "Essential principles of contract formation including offer, acceptance, and consideration",
          category: "Contract Law",
          tags: ["contracts", "formation", "consideration"],
          visibility: "public",
          originalFilename: "contract-formation.mp4",
          storedFilename: "sample-2_original.mp4",
          thumbnailPath: "/api/videos/thumbnail/sample-2",
          size: 1024 * 1024 * 180, // 180MB
          duration: 2700, // 45 minutes
          width: 1920,
          height: 1080,
          bitrate: 4000000,
          status: "ready",
          uploadDate: "2024-01-12",
          views: 156,
          createdBy: "Prof. Michael Chen",
          streamUrl: "/api/videos/stream/sample-2"
        }
      ];

      sampleVideos.forEach(video => {
        if (this.videos) {
          this.videos.set(video.id, video);
        }
      });
    } catch (error) {
      console.error('🎬 Error adding sample videos:', error);
    }
  }

  // Create a new video record
  create(video: VideoRecord): VideoRecord {
    this.videos.set(video.id, video);
    globalVideoStore = this.videos; // Update global reference
    console.log('🎬 Created video:', video.id, '- Total videos:', this.videos.size);
    return video;
  }

  // Get a video by ID
  get(id: string): VideoRecord | undefined {
    return this.videos.get(id);
  }

  // Get all videos
  getAll(): VideoRecord[] {
    return Array.from(this.videos.values());
  }

  // Get public videos
  getPublic(): VideoRecord[] {
    return Array.from(this.videos.values()).filter(v => v.visibility === 'public');
  }

  // Update a video
  update(id: string, updates: Partial<VideoRecord>): VideoRecord | undefined {
    const video = this.videos.get(id);
    if (video) {
      const updated = { ...video, ...updates };
      this.videos.set(id, updated);
      globalVideoStore = this.videos; // Update global reference
      console.log('🎬 Updated video:', id);
      return updated;
    }
    return undefined;
  }

  // Delete a video
  delete(id: string): boolean {
    const result = this.videos.delete(id);
    if (result) {
      globalVideoStore = this.videos; // Update global reference
      console.log('🎬 Deleted video:', id);
    }
    return result;
  }

  // Search videos
  search(query: string): VideoRecord[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.videos.values()).filter(video => 
      video.title.toLowerCase().includes(lowerQuery) ||
      video.description.toLowerCase().includes(lowerQuery) ||
      video.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      video.category.toLowerCase().includes(lowerQuery)
    );
  }

  // Get videos by category
  getByCategory(category: string): VideoRecord[] {
    return Array.from(this.videos.values()).filter(v => v.category === category);
  }

  // Update video status
  updateStatus(id: string, status: 'processing' | 'ready' | 'failed' | 'draft'): VideoRecord | undefined {
    return this.update(id, { status });
  }

  // Increment view count
  incrementViews(id: string): void {
    const video = this.videos.get(id);
    if (video) {
      video.views += 1;
      this.videos.set(id, video);
      globalVideoStore = this.videos; // Update global reference
    }
  }
}

// Create a singleton instance
const videoDatabase = new VideoDatabase();

export default videoDatabase;
