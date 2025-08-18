"use client";

import { PublicLayout } from "@/components/PublicLayout";
import { ReadabilityWrapper } from "@/components/ReadabilityWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data for demonstration
const featuredContent = [
  {
    id: 1,
    title: "Constitutional Interpretation in the Digital Age",
    description: "An analysis of how constitutional principles apply to modern digital privacy rights and emerging technologies.",
    type: "Article",
    author: "Prof. Sarah Johnson",
    date: "2024-01-15",
    readTime: "12 min read",
    category: "Constitutional Law"
  },
  {
    id: 2,
    title: "Environmental Law Symposium 2024",
    description: "Join leading experts discussing climate change litigation and environmental policy reform.",
    type: "Event",
    author: "Environmental Law Society",
    date: "2024-02-20",
    readTime: "2 hours",
    category: "Environmental Law"
  },
  {
    id: 3,
    title: "Contract Law Fundamentals",
    description: "A comprehensive video series covering essential contract law principles for first-year students.",
    type: "Video",
    author: "Prof. Michael Chen",
    date: "2024-01-10",
    readTime: "45 min",
    category: "Contract Law"
  }
];

const recentContent = [
  {
    id: 4,
    title: "Corporate Governance in Tech Companies",
    description: "Examining the unique governance challenges faced by technology corporations.",
    type: "Article",
    author: "Prof. Emily Rodriguez",
    date: "2024-01-12",
    category: "Corporate Law"
  },
  {
    id: 5,
    title: "Student Research: Immigration Policy Analysis",
    description: "A comprehensive analysis of recent immigration policy changes and their legal implications.",
    type: "Student Work",
    author: "Jessica Martinez, 3L",
    date: "2024-01-08",
    category: "Immigration Law"
  },
  {
    id: 6,
    title: "Criminal Justice Reform Panel",
    description: "Discussion on recent developments in criminal justice reform initiatives.",
    type: "Video",
    author: "Criminal Law Society",
    date: "2024-01-05",
    category: "Criminal Law"
  }
];

const categories = [
  "All Categories",
  "Constitutional Law",
  "Contract Law",
  "Criminal Law",
  "Corporate Law",
  "Environmental Law",
  "Immigration Law",
  "International Law",
  "Intellectual Property"
];

export default function BrowsePage() {
  return (
    <PublicLayout
      title="Browse Repository"
      description="Explore our comprehensive collection of legal scholarship, educational content, and research materials."
    >
      <div className="py-8">
        <ReadabilityWrapper maxWidth="2xl">
          {/* Filters and Sorting */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select defaultValue="recent">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="author">Author A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="articles">Articles</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="student-work">Student Work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="featured" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
            </TabsList>

            <TabsContent value="featured" className="mt-8">
              <div className="space-y-8">
                {/* Hero Featured Item */}
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-2/3 p-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary">{featuredContent[0].type}</Badge>
                        <Badge variant="outline">{featuredContent[0].category}</Badge>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                        {featuredContent[0].title}
                      </h2>
                      <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                        {featuredContent[0].description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          <p className="font-medium">{featuredContent[0].author}</p>
                          <p>{featuredContent[0].date} • {featuredContent[0].readTime}</p>
                        </div>
                        <Button>Read More</Button>
                      </div>
                    </div>
                    <div className="md:w-1/3 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-8">
                      <div className="text-center text-slate-600">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <span className="text-2xl font-bold text-blue-600">📖</span>
                        </div>
                        <p className="font-medium">Featured Article</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Other Featured Items */}
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredContent.slice(1).map((item) => (
                    <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{item.type}</Badge>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <CardTitle className="text-xl leading-tight">{item.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-500">
                            <p className="font-medium">{item.author}</p>
                            <p>{item.date} • {item.readTime}</p>
                          </div>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recent" className="mt-8">
              <div className="grid gap-6">
                {recentContent.map((item) => (
                  <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <div className="md:flex">
                      <div className="md:w-1/4 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                        <div className="text-center text-slate-600">
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                            <span className="text-xl">
                              {item.type === 'Article' ? '📄' : 
                               item.type === 'Video' ? '🎥' : 
                               item.type === 'Student Work' ? '🎓' : '📅'}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">{item.type}</Badge>
                        </div>
                      </div>
                      <div className="md:w-3/4 p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 mb-4 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-500">
                            <p className="font-medium">{item.author}</p>
                            <p>{item.date}</p>
                          </div>
                          <Button variant="outline" size="sm">Read More</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="mt-8">
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Popular Content</h3>
                <p className="text-slate-600 mb-6">
                  Popular content will be displayed here based on view counts and engagement metrics.
                </p>
                <Button variant="outline">Coming Soon</Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Content
            </Button>
          </div>
        </ReadabilityWrapper>
      </div>
    </PublicLayout>
  );
}
