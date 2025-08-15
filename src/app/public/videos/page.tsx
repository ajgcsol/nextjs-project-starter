"use client";

import { PublicLayout } from "@/components/PublicLayout";
import { ReadabilityWrapper } from "@/components/ReadabilityWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

// Mock data for video content
const videoCategories = [
  {
    title: "Constitutional Law",
    videos: [
      {
        id: 1,
        title: "Fourth Amendment in the Digital Age",
        description: "Exploring privacy rights and digital surveillance in modern constitutional interpretation.",
        instructor: "Prof. Sarah Johnson",
        duration: "45:32",
        views: 2847,
        date: "2024-01-15",
        level: "Advanced",
        thumbnail: "https://placehold.co/400x225?text=Fourth+Amendment+Digital+Age+Constitutional+Law+Lecture"
      },
      {
        id: 2,
        title: "Supreme Court Decision Analysis",
        description: "Breaking down recent Supreme Court decisions and their constitutional implications.",
        instructor: "Prof. Michael Chen",
        duration: "38:15",
        views: 1923,
        date: "2024-01-10",
        level: "Intermediate",
        thumbnail: "https://placehold.co/400x225?text=Supreme+Court+Decision+Analysis+Constitutional+Law"
      },
      {
        id: 3,
        title: "Constitutional Interpretation Methods",
        description: "Understanding different approaches to constitutional interpretation and their applications.",
        instructor: "Prof. David Kim",
        duration: "52:18",
        views: 3156,
        date: "2024-01-05",
        level: "Beginner",
        thumbnail: "https://placehold.co/400x225?text=Constitutional+Interpretation+Methods+Legal+Education"
      }
    ]
  },
  {
    title: "Contract Law",
    videos: [
      {
        id: 4,
        title: "Contract Formation Fundamentals",
        description: "Essential principles of contract formation, offer, acceptance, and consideration.",
        instructor: "Prof. Emily Rodriguez",
        duration: "41:27",
        views: 4231,
        date: "2024-01-12",
        level: "Beginner",
        thumbnail: "https://placehold.co/400x225?text=Contract+Formation+Fundamentals+Legal+Education+Law+School"
      },
      {
        id: 5,
        title: "Breach of Contract Remedies",
        description: "Comprehensive overview of remedies available for breach of contract situations.",
        instructor: "Prof. James Wilson",
        duration: "36:44",
        views: 2654,
        date: "2024-01-08",
        level: "Intermediate",
        thumbnail: "https://placehold.co/400x225?text=Breach+Contract+Remedies+Legal+Studies+Law+Education"
      }
    ]
  },
  {
    title: "Environmental Law",
    videos: [
      {
        id: 6,
        title: "Climate Change Litigation Trends",
        description: "Analysis of recent climate change litigation cases and emerging legal strategies.",
        instructor: "Prof. Lisa Thompson",
        duration: "48:33",
        views: 1876,
        date: "2024-01-03",
        level: "Advanced",
        thumbnail: "https://placehold.co/400x225?text=Climate+Change+Litigation+Environmental+Law+Legal+Analysis"
      }
    ]
  }
];

const featuredVideo = {
  id: 7,
  title: "Introduction to Legal Research and Writing",
  description: "A comprehensive guide to legal research methodologies, citation formats, and effective legal writing techniques. This foundational course covers essential skills for law students and practicing attorneys.",
  instructor: "Prof. Margaret Davis",
  duration: "1:24:15",
  views: 8947,
  date: "2024-01-20",
  level: "Beginner",
  category: "Legal Writing",
  thumbnail: "https://placehold.co/800x450?text=Legal+Research+Writing+Comprehensive+Guide+Law+School+Education"
};

export default function VideosPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  const allVideos = videoCategories.flatMap(category => 
    category.videos.map(video => ({ ...video, category: category.title }))
  );

  const filteredVideos = allVideos.filter(video => {
    const categoryMatch = selectedCategory === "all" || video.category === selectedCategory;
    const levelMatch = selectedLevel === "all" || video.level.toLowerCase() === selectedLevel;
    return categoryMatch && levelMatch;
  });

  return (
    <PublicLayout
      title="Video Library"
      description="Access our comprehensive collection of legal education videos, lectures, and educational content."
    >
      <div className="py-8">
        <ReadabilityWrapper maxWidth="2xl">
          {/* Featured Video */}
          <div className="mb-12">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-slate-100">
                    <img 
                      src={featuredVideo.thumbnail}
                      alt={featuredVideo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-100">
                      <div className="text-center text-slate-600">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <span className="text-2xl">🎥</span>
                        </div>
                        <p className="font-medium">Featured Video</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[12px] border-l-slate-800 border-y-[8px] border-y-transparent ml-1"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {featuredVideo.duration}
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2 p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">Featured</Badge>
                    <Badge variant="outline">{featuredVideo.category}</Badge>
                    <Badge variant="outline">{featuredVideo.level}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                    {featuredVideo.title}
                  </h2>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    {featuredVideo.description}
                  </p>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-sm text-slate-500">
                      <p className="font-medium">{featuredVideo.instructor}</p>
                      <p>{featuredVideo.views.toLocaleString()} views • {featuredVideo.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button size="lg">Watch Now</Button>
                    <Button variant="outline" size="lg">Add to Playlist</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {videoCategories.map((category) => (
                  <SelectItem key={category.title} value={category.title}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 text-sm text-slate-600 flex items-center">
              Showing {filteredVideos.length} videos
            </div>
          </div>

          {/* Video Categories */}
          {selectedCategory === "all" ? (
            // Show by categories when no filter is applied
            <div className="space-y-12">
              {videoCategories.map((category) => (
                <div key={category.title}>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">{category.title}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.videos
                      .filter(video => selectedLevel === "all" || video.level.toLowerCase() === selectedLevel)
                      .map((video) => (
                      <Card key={video.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                          <img 
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            <div className="text-center text-slate-600">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                                <span className="text-lg">🎥</span>
                              </div>
                              <p className="text-sm font-medium">Video</p>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[8px] border-l-slate-800 border-y-[6px] border-y-transparent ml-1"></div>
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {video.duration}
                          </div>
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="text-xs">{video.level}</Badge>
                          </div>
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base leading-tight line-clamp-2">
                            {video.title}
                          </CardTitle>
                          <CardDescription className="text-sm line-clamp-2">
                            {video.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs text-slate-500 mb-3">
                            <p className="font-medium">{video.instructor}</p>
                            <p>{video.views.toLocaleString()} views • {video.date}</p>
                          </div>
                          <Button size="sm" className="w-full">Watch Video</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show filtered results
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {selectedCategory} Videos
                {selectedLevel !== "all" && ` - ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Level`}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Card key={video.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                    <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                      <img 
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <div className="text-center text-slate-600">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                            <span className="text-lg">🎥</span>
                          </div>
                          <p className="text-sm font-medium">Video</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[8px] border-l-slate-800 border-y-[6px] border-y-transparent ml-1"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        {video.duration}
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">{video.level}</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-tight line-clamp-2">
                        {video.title}
                      </CardTitle>
                      <CardDescription className="text-sm line-clamp-2">
                        {video.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-slate-500 mb-3">
                        <p className="font-medium">{video.instructor}</p>
                        <p>{video.views.toLocaleString()} views • {video.date}</p>
                      </div>
                      <Button size="sm" className="w-full">Watch Video</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upload Section for Faculty */}
          <div className="mt-16 bg-slate-50 rounded-lg p-8 border">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Share Your Knowledge</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Faculty members can upload educational videos to share with students and the broader legal community. 
              Our platform supports high-quality video streaming with custom player controls and accessibility features.
            </p>
            <div className="flex gap-4">
              <Button>Upload Video</Button>
              <Button variant="outline">Upload Guidelines</Button>
            </div>
          </div>
        </ReadabilityWrapper>
      </div>
    </PublicLayout>
  );
}
