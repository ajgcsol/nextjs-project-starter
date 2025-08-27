"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  X, 
  Plus, 
  Loader2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  is_public?: boolean;
  status?: string;
}

interface VideoEditModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVideo: Partial<Video>) => Promise<void>;
}

const CATEGORIES = [
  'General',
  'Constitutional Law',
  'Criminal Law',
  'Civil Law',
  'Corporate Law',
  'International Law',
  'Family Law',
  'Property Law',
  'Contract Law',
  'Tort Law',
  'Administrative Law',
  'Environmental Law',
  'Intellectual Property',
  'Labor Law',
  'Tax Law',
  'Other'
];

const COMMON_TAGS = [
  'lecture',
  'seminar',
  'case-study',
  'analysis',
  'review',
  'exam-prep',
  'discussion',
  'presentation',
  'tutorial',
  'workshop',
  'guest-speaker',
  'moot-court',
  'legal-research',
  'jurisprudence',
  'precedent',
  'statute',
  'regulation',
  'court-decision',
  'legal-writing',
  'ethics'
];

export function VideoEditModal({ video, isOpen, onClose, onSave }: VideoEditModalProps) {
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    category: video.category || 'General',
    tags: video.tags || [],
    visibility: video.visibility || (video.is_public ? 'public' : 'private'),
    is_public: video.is_public || false
  });
  
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Update form data when video prop changes
  useEffect(() => {
    setFormData({
      title: video.title || '',
      description: video.description || '',
      category: video.category || 'General',
      tags: video.tags || [],
      visibility: video.visibility || (video.is_public ? 'public' : 'private'),
      is_public: video.is_public || false
    });
  }, [video]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVisibilityChange = (visibility: string) => {
    const isPublic = visibility === 'public';
    setFormData(prev => ({
      ...prev,
      visibility: visibility as 'public' | 'private' | 'unlisted',
      is_public: isPublic
    }));
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
    }
    setNewTag('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      addTag(newTag);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        visibility: formData.visibility,
        is_public: formData.is_public
      });
      onClose();
    } catch (error) {
      console.error('Failed to save video:', error);
      // You could add toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'unlisted':
        return <Users className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Anyone can search for and view this video';
      case 'unlisted':
        return 'Anyone with the link can view this video';
      default:
        return 'Only you can view this video';
    }
  };

  const filteredTagSuggestions = COMMON_TAGS.filter(tag => 
    tag.toLowerCase().includes(newTag.toLowerCase()) && 
    !formData.tags.includes(tag)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Edit Video Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter video title"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter video description"
              rows={4}
              className="w-full resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label>Visibility</Label>
            <div className="space-y-3">
              {[
                { value: 'private', label: 'Private', description: 'Only you can view this video' },
                { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link can view' },
                { value: 'public', label: 'Public', description: 'Anyone can search for and view' }
              ].map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    formData.visibility === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleVisibilityChange(option.value)}
                >
                  <div className="flex items-center space-x-2">
                    {getVisibilityIcon(option.value)}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      formData.visibility === option.value
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    )}>
                      {formData.visibility === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            
            {/* Current Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add New Tag */}
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setShowTagSuggestions(e.target.value.length > 0);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Tag Suggestions */}
              {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredTagSuggestions.slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500">
              Add tags to help others find your video. Press Enter or click + to add.
            </div>
          </div>

          {/* Status Information */}
          {video.status && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Current Status</div>
              <div className="text-sm text-gray-600 capitalize">{video.status}</div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.title.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VideoEditModal;
