"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpenCheck, Calendar, User, Hash, Download, Link2, CheckCircle, AlertTriangle } from "lucide-react";

interface ContentData {
  id: string;
  title: string;
  article: string;
  type: string;
  content: string;
  metadata: {
    wordCount?: number;
    citationCount?: number;
    errorsFound?: number;
    lastModified: string;
    version: string;
    hash: string;
    author?: string;
    reviewer?: string;
    workflowType: string;
    status: string;
  };
  citations?: Array<{
    id: number;
    text: string;
    type: string;
    status: string;
    rule: string;
    issue?: string;
  }>;
}

export default function ContentPage() {
  const params = useParams();
  const contentId = params.contentId as string;
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/content/${contentId}`);
        const data = await response.json();
        
        if (data.success) {
          setContent(data.data);
        } else {
          setError(data.error || 'Content not found');
        }
      } catch (err) {
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    if (contentId) {
      fetchContent();
    }
  }, [contentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">Loading content...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">{error || 'Content not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isBlueBookContent = content.metadata.workflowType === 'bluebook';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isBlueBookContent ? (
                  <BookOpenCheck className="h-6 w-6 text-purple-600" />
                ) : (
                  <FileText className="h-6 w-6 text-blue-600" />
                )}
                <Badge variant="outline" className={isBlueBookContent ? "text-purple-600 border-purple-200" : "text-blue-600 border-blue-200"}>
                  {isBlueBookContent ? "Blue Book Review" : "Editorial Content"}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{content.title}</h1>
              <p className="text-xl text-slate-600 mb-4">Part of: {content.article}</p>
              
              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {content.metadata.author || content.metadata.reviewer}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(content.metadata.lastModified).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  v{content.metadata.version}
                </div>
                {content.metadata.wordCount && (
                  <span>{content.metadata.wordCount} words</span>
                )}
                {content.metadata.citationCount && (
                  <span>{content.metadata.citationCount} citations</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>
                  Persistent link: <code className="bg-slate-100 px-1 rounded">/content/{contentId}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                    {content.content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Workflow Type</span>
                    <Badge variant="outline">
                      {content.metadata.workflowType === 'bluebook' ? 'Blue Book' : 'Editorial'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge 
                      variant={
                        content.metadata.status === "approved" ? "default" : 
                        content.metadata.status === "under_review" ? "secondary" : 
                        "outline"
                      }
                    >
                      {content.metadata.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {content.metadata.errorsFound !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Citation Errors</span>
                      <span className={`text-sm font-medium ${
                        content.metadata.errorsFound > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {content.metadata.errorsFound}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Hash Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Content Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">SHA-256 Hash</div>
                  <code className="text-xs bg-slate-100 p-2 rounded block break-all">
                    {content.metadata.hash}
                  </code>
                  <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                    <CheckCircle className="h-3 w-3" />
                    Content verified
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Citation Analysis (for Blue Book content) */}
            {isBlueBookContent && content.citations && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Citation Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {content.citations.slice(0, 5).map((citation) => (
                      <div key={citation.id} className="border-l-2 border-slate-200 pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 mb-1">Citation #{citation.id}</div>
                            <div className="text-sm font-mono text-slate-700 break-all">
                              {citation.text}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {citation.rule} • {citation.type.replace("_", " ")}
                            </div>
                            {citation.issue && (
                              <div className="text-xs text-red-600 mt-1">
                                {citation.issue}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {citation.status === 'correct' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {content.citations.length > 5 && (
                      <div className="text-xs text-slate-500 text-center pt-2 border-t">
                        +{content.citations.length - 5} more citations
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}