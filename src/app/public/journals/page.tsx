"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Download, Search, Calendar, Eye } from "lucide-react";

export default function PublicJournalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Published Legal Journals
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Access our collection of peer-reviewed legal journals covering diverse areas of law and legal scholarship
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input 
              placeholder="Search journals by title, topic, or author..."
              className="pl-10"
            />
          </div>
          <Select>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Legal Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constitutional">Constitutional Law</SelectItem>
              <SelectItem value="environmental">Environmental Law</SelectItem>
              <SelectItem value="corporate">Corporate Law</SelectItem>
              <SelectItem value="criminal">Criminal Law</SelectItem>
              <SelectItem value="international">International Law</SelectItem>
              <SelectItem value="technology">Technology Law</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
              <SelectItem value="2021">2021</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Featured Journals */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Featured Journals</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Constitutional Law Review",
                subtitle: "Vol. 15, Issue 2 - January 2024",
                specialty: "Constitutional Law",
                description: "In-depth analysis of recent constitutional developments and landmark Supreme Court cases",
                articles: 8,
                downloads: 2450,
                featured: true
              },
              {
                title: "Environmental Justice Quarterly",
                subtitle: "Vol. 12, Issue 1 - December 2023",
                specialty: "Environmental Law",
                description: "Exploring the intersection of environmental policy and social justice in modern litigation",
                articles: 6,
                downloads: 1890,
                featured: true
              },
              {
                title: "Digital Privacy & Technology Law",
                subtitle: "Vol. 3, Issue 2 - November 2023",
                specialty: "Technology Law",
                description: "Cutting-edge legal analysis of privacy rights in the digital age and emerging technologies",
                articles: 7,
                downloads: 3240,
                featured: true
              }
            ].map((journal, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    {journal.featured && (
                      <Badge variant="default">Featured</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg leading-tight">{journal.title}</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-700">
                    {journal.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-3">
                    {journal.specialty}
                  </Badge>
                  <p className="text-sm text-slate-600 mb-4">
                    {journal.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                    <span>{journal.articles} articles</span>
                    <span>{journal.downloads.toLocaleString()} downloads</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="default" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Published Journals */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">All Published Journals</h2>
          <div className="space-y-4">
            {[
              {
                title: "Human Rights Law Review",
                volume: "Vol. 18, Issue 4",
                specialty: "Human Rights",
                published: "January 8, 2024",
                articles: 12,
                downloads: 1567,
                description: "Comprehensive analysis of international human rights developments and case law"
              },
              {
                title: "Corporate Governance Review", 
                volume: "Vol. 22, Issue 1",
                specialty: "Corporate Law",
                published: "December 15, 2023",
                articles: 9,
                downloads: 2134,
                description: "Examining modern corporate governance practices and regulatory changes"
              },
              {
                title: "Immigration Law & Policy",
                volume: "Vol. 14, Issue 3",
                specialty: "Immigration Law",
                published: "December 1, 2023",
                articles: 10,
                downloads: 1823,
                description: "Contemporary issues in immigration law, policy reform, and judicial interpretation"
              },
              {
                title: "Criminal Justice Reform Quarterly",
                volume: "Vol. 9, Issue 2",
                specialty: "Criminal Law",
                published: "November 20, 2023",
                articles: 8,
                downloads: 1456,
                description: "Analysis of criminal justice reform initiatives and their impact on the legal system"
              },
              {
                title: "International Trade Law Journal",
                volume: "Vol. 8, Issue 3",
                specialty: "International Trade",
                published: "November 10, 2023",
                articles: 7,
                downloads: 1789,
                description: "Exploring the evolving landscape of international trade law and commercial regulations"
              }
            ].map((journal, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <BookOpen className="h-5 w-5 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{journal.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{journal.volume}</p>
                        <p className="text-sm text-slate-600 mb-3">{journal.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <Badge variant="outline">{journal.specialty}</Badge>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {journal.published}
                          </span>
                          <span>{journal.articles} articles</span>
                          <span>{journal.downloads.toLocaleString()} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="default" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Journals
          </Button>
        </div>
      </div>
    </div>
  );
}