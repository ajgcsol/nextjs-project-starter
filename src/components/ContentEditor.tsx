"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { VideoUploadLarge } from "./VideoUploadLarge";

interface ContentData {
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
  status: string;
  metadata: {
    abstract?: string;
    transcript?: string;
    instructions?: string;
    eventDate?: string;
    location?: string;
    dueDate?: string;
    duration?: string;
    visibility?: string;
    publishDate?: string;
    author?: string;
    videoId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    originalFilename?: string;
    [key: string]: unknown;
  };
}

interface ContentEditorProps {
  contentType: "article" | "video" | "event" | "assignment";
  initialContent?: Partial<ContentData>;
  onSave?: (content: ContentData) => void;
  onPublish?: (content: ContentData) => void;
  className?: string;
}

export function ContentEditor({
  contentType,
  initialContent,
  onSave,
  onPublish,
  className
}: ContentEditorProps) {
  const [content, setContent] = useState<ContentData>({
    title: "",
    description: "",
    body: "",
    category: "",
    tags: [] as string[],
    status: "draft",
    metadata: {},
    ...initialContent
  });

  const [currentTag, setCurrentTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (content.body || content.title) {
        handleAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [content]);

  // Word count
  useEffect(() => {
    const words = content.body.split(/\s+/).filter((word: string) => word.length > 0).length;
    setWordCount(words);
  }, [content.body]);

  const handleAutoSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({ ...content, status: "draft" });
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (onPublish) {
      onPublish({ ...content, status: "published" });
    }
  };

  const addTag = () => {
    if (currentTag && !content.tags.includes(currentTag)) {
      setContent({
        ...content,
        tags: [...content.tags, currentTag]
      });
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setContent({
      ...content,
      tags: content.tags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  const getContentTypeConfig = () => {
    switch (contentType) {
      case "article":
        return {
          title: "Article Editor",
          description: "Create and edit articles with rich formatting",
          categories: ["Constitutional Law", "Corporate Law", "Criminal Law", "Environmental Law", "International Law"],
          showAbstract: true,
          showCitations: true
        };
      case "video":
        return {
          title: "Video Content Editor",
          description: "Upload and manage video content",
          categories: ["Lecture", "Tutorial", "Seminar", "Conference", "Documentary"],
          showVideoUrl: true,
          showDuration: true,
          showTranscript: true
        };
      case "event":
        return {
          title: "Event Editor",
          description: "Create and manage events",
          categories: ["Conference", "Workshop", "Seminar", "Symposium", "Guest Lecture"],
          showDate: true,
          showLocation: true,
          showRegistration: true
        };
      case "assignment":
        return {
          title: "Assignment Editor",
          description: "Create and manage student assignments",
          categories: ["Essay", "Research Paper", "Case Study", "Presentation", "Group Project"],
          showDueDate: true,
          showInstructions: true,
          showRubric: true
        };
      default:
        return {
          title: "Content Editor",
          description: "Create and edit content",
          categories: [],
          showAbstract: false
        };
    }
  };

  const config = getContentTypeConfig();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-sm text-slate-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <Badge variant="secondary">Saving...</Badge>
              )}
              <Badge variant={content.status === "published" ? "default" : "outline"}>
                {content.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  placeholder="Enter title..."
                  className="text-lg"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={content.description}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>

              {config.showAbstract && (
                <div>
                  <Label htmlFor="abstract">Abstract</Label>
                  <Textarea
                    id="abstract"
                    value={content.metadata.abstract || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, abstract: e.target.value }
                    })}
                    placeholder="Article abstract..."
                    rows={4}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="body">Content Body</Label>
                  <span className="text-sm text-slate-500">
                    {wordCount} words
                  </span>
                </div>
                <Textarea
                  id="body"
                  value={content.body}
                  onChange={(e) => setContent({ ...content, body: e.target.value })}
                  placeholder="Start writing..."
                  rows={20}
                  className="font-mono"
                />
              </div>

              {config.showVideoUrl && (
                <div className="space-y-4">
                  <VideoUploadLarge
                    onUploadComplete={(video) => {
                      setContent({
                        ...content,
                        title: content.title || video.title,
                        description: content.description || video.description,
                        category: video.category,
                        metadata: {
                          ...content.metadata,
                          videoId: video.id,
                          videoUrl: `/api/videos/stream/${video.id}`,
                          thumbnailUrl: video.thumbnailPath,
                          duration: video.duration,
                          fileSize: video.size,
                          originalFilename: video.originalFilename
                        }
                      });
                    }}
                    onUploadError={(error) => {
                      console.error("Video upload failed:", error);
                    }}
                  />
                </div>
              )}

              {config.showTranscript && (
                <div>
                  <Label htmlFor="transcript">Transcript</Label>
                  <Textarea
                    id="transcript"
                    value={content.metadata.transcript || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, transcript: e.target.value }
                    })}
                    placeholder="Video transcript..."
                    rows={10}
                  />
                </div>
              )}

              {config.showInstructions && (
                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={content.metadata.instructions || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, instructions: e.target.value }
                    })}
                    placeholder="Assignment instructions..."
                    rows={8}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={content.category} 
                  onValueChange={(value) => setContent({ ...content, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button onClick={addTag} type="button">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag: string) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {config.showDate && (
                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    id="eventDate"
                    type="datetime-local"
                    value={content.metadata.eventDate || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, eventDate: e.target.value }
                    })}
                  />
                </div>
              )}

              {config.showLocation && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={content.metadata.location || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, location: e.target.value }
                    })}
                    placeholder="Event location..."
                  />
                </div>
              )}

              {config.showDueDate && (
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={content.metadata.dueDate || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, dueDate: e.target.value }
                    })}
                  />
                </div>
              )}

              {config.showDuration && (
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={content.metadata.duration || ""}
                    onChange={(e) => setContent({ 
                      ...content, 
                      metadata: { ...content.metadata, duration: e.target.value }
                    })}
                    placeholder="Video duration..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>This is how your content will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <article className="prose prose-slate max-w-none">
                <h1>{content.title || "Untitled"}</h1>
                {content.description && (
                  <p className="lead">{content.description}</p>
                )}
                {content.category && (
                  <div className="mb-4">
                    <Badge>{content.category}</Badge>
                  </div>
                )}
                {content.metadata.abstract && (
                  <div className="mb-6">
                    <h3>Abstract</h3>
                    <p>{content.metadata.abstract}</p>
                  </div>
                )}
                
                {/* Video Preview */}
                {content.metadata.videoUrl && (
                  <div className="mb-6">
                    <h3>Video</h3>
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                      <video 
                        controls 
                        className="w-full h-full object-cover"
                        poster={content.metadata.thumbnailUrl}
                      >
                        <source src={content.metadata.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    {content.metadata.duration && (
                      <p className="text-sm text-slate-600 mt-2">
                        Duration: {Math.floor(Number(content.metadata.duration) / 60)}:{(Number(content.metadata.duration) % 60).toString().padStart(2, '0')} | 
                        Size: {content.metadata.fileSize ? (Number(content.metadata.fileSize) / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown'}
                      </p>
                    )}
                  </div>
                )}
                
                <Separator className="my-6" />
                <div className="whitespace-pre-wrap">{content.body}</div>
                {content.tags.length > 0 && (
                  <div className="mt-6">
                    <h4>Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {content.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
              <CardDescription>Configure how your content is published</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select 
                  value={content.metadata.visibility || "public"} 
                  onValueChange={(value) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, visibility: value }
                  })}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="publishDate">Publish Date</Label>
                <Input
                  id="publishDate"
                  type="datetime-local"
                  value={content.metadata.publishDate || ""}
                  onChange={(e) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, publishDate: e.target.value }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={content.metadata.author || ""}
                  onChange={(e) => setContent({ 
                    ...content, 
                    metadata: { ...content.metadata, author: e.target.value }
                  })}
                  placeholder="Author name..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAutoSave}>
                Save Draft
              </Button>
              <Button variant="outline">
                Preview
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                Schedule
              </Button>
              <Button onClick={handlePublish}>
                Publish Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}