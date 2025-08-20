"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  MessageSquare,
  Eye,
  Edit3,
  Save,
  Send,
  RotateCcw,
  Download,
  Link,
  Search,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EditorialWorkflowManager, FileManager } from "@/lib/editorialWorkflowAdvanced";

interface Article {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  content: string;
  status: 'draft' | 'submitted' | 'under_review' | 'revision_requested' | 'approved' | 'published';
  plagiarismScore?: number;
  bluebookIssues?: number;
  trackChanges: TrackChange[];
  sections: ArticleSection[];
  attachments: FileAttachment[];
}

interface TrackChange {
  id: string;
  type: 'insert' | 'delete' | 'modify';
  content: string;
  originalContent?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  accepted: boolean | null;
  position: {
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
  };
}

interface ArticleSection {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  assignedEditor?: string;
  assignedReviewer?: string;
  status: 'draft' | 'under_review' | 'reviewed' | 'approved' | 'needs_revision';
  comments: Comment[];
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'suggestion' | 'correction' | 'bluebook' | 'plagiarism';
  resolved: boolean;
}

interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

export function AdvancedEditorialWorkflow() {
  const { user, hasAnyRole } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for demonstration
  useEffect(() => {
    const mockArticles: Article[] = [
      {
        id: "article-1",
        title: "AI Ethics in Legal Practice: A Comprehensive Framework",
        authorId: "author-1",
        authorName: "Jessica Martinez",
        content: `# AI Ethics in Legal Practice: A Comprehensive Framework

## Introduction

The integration of artificial intelligence in legal practice presents unprecedented opportunities and challenges. This article examines the ethical implications of AI adoption in law firms, courts, and legal education.

## Constitutional Considerations

The use of AI in legal proceedings raises significant constitutional questions, particularly regarding due process and equal protection under the law. Recent cases such as State v. Loomis have highlighted the need for transparency in algorithmic decision-making.

## Regulatory Framework

Current regulatory approaches vary significantly across jurisdictions. The European Union's AI Act provides a comprehensive framework, while the United States relies on a patchwork of state and federal regulations.

## Recommendations

1. Establish clear ethical guidelines for AI use in legal practice
2. Require transparency in algorithmic decision-making
3. Implement regular audits of AI systems for bias
4. Provide comprehensive training for legal professionals

## Conclusion

The legal profession must proactively address the ethical challenges posed by AI to maintain public trust and ensure justice.`,
        status: "under_review",
        plagiarismScore: 12,
        bluebookIssues: 3,
        trackChanges: [
          {
            id: "change-1",
            type: "modify",
            content: "artificial intelligence systems",
            originalContent: "AI systems",
            userId: "editor-1",
            userName: "Michael Chen",
            timestamp: new Date("2024-01-15T10:30:00Z"),
            accepted: null,
            position: { startLine: 5, endLine: 5, startChar: 45, endChar: 55 }
          }
        ],
        sections: [
          {
            id: "section-1",
            content: "Introduction section content...",
            startLine: 1,
            endLine: 10,
            assignedEditor: "editor-1",
            status: "under_review",
            comments: [
              {
                id: "comment-1",
                userId: "editor-1",
                userName: "Michael Chen",
                content: "Consider expanding the introduction to include more context about current AI adoption rates.",
                timestamp: new Date("2024-01-15T09:15:00Z"),
                type: "suggestion",
                resolved: false
              }
            ]
          }
        ],
        attachments: []
      }
    ];
    setArticles(mockArticles);
    setSelectedArticle(mockArticles[0]);
  }, []);

  const handlePlagiarismCheck = async (articleId: string) => {
    setIsLoading(true);
    try {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const report = await EditorialWorkflowManager.checkPlagiarism(article.content);
        // Update article with plagiarism score
        setArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, plagiarismScore: report.overallScore }
            : a
        ));
      }
    } catch (error) {
      console.error('Plagiarism check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBluebookCheck = async (articleId: string) => {
    setIsLoading(true);
    try {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const citations = await EditorialWorkflowManager.checkBluebookCitations(article.content);
        const issues = citations.filter(c => !c.isValid).length;
        // Update article with Bluebook issues count
        setArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, bluebookIssues: issues }
            : a
        ));
      }
    } catch (error) {
      console.error('Bluebook check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const attachment = await FileManager.uploadFile(file, 'article');
      if (selectedArticle) {
        setArticles(prev => prev.map(a => 
          a.id === selectedArticle.id 
            ? { ...a, attachments: [...a.attachments, attachment] }
            : a
        ));
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleAcceptChange = async (changeId: string) => {
    if (selectedArticle) {
      await EditorialWorkflowManager.acceptTrackChange(selectedArticle.id, changeId);
      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === selectedArticle.id 
          ? {
              ...a,
              trackChanges: a.trackChanges.map(c => 
                c.id === changeId ? { ...c, accepted: true } : c
              )
            }
          : a
      ));
    }
  };

  const handleRejectChange = async (changeId: string) => {
    if (selectedArticle) {
      await EditorialWorkflowManager.rejectTrackChange(selectedArticle.id, changeId);
      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === selectedArticle.id 
          ? {
              ...a,
              trackChanges: a.trackChanges.map(c => 
                c.id === changeId ? { ...c, accepted: false } : c
              )
            }
          : a
      ));
    }
  };

  if (!hasAnyRole(["editor_in_chief", "editor", "reviewer", "admin"])) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600">
            You don't have permission to access the editorial workflow.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Editorial Workflow</h1>
          <p className="text-slate-600 mt-2">
            Advanced editorial system with plagiarism detection, Bluebook checking, and collaborative editing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Article List */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedArticle?.id === article.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedArticle(article)}
                  >
                    <h3 className="font-medium text-sm mb-1">{article.title}</h3>
                    <p className="text-xs text-slate-500 mb-2">{article.authorName}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          article.status === 'approved' ? 'default' :
                          article.status === 'under_review' ? 'secondary' :
                          article.status === 'revision_requested' ? 'destructive' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {article.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {(article.plagiarismScore !== undefined || article.bluebookIssues !== undefined) && (
                      <div className="flex items-center gap-2 mt-2">
                        {article.plagiarismScore !== undefined && (
                          <div className="flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            <span className="text-xs">{article.plagiarismScore}%</span>
                          </div>
                        )}
                        {article.bluebookIssues !== undefined && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span className="text-xs">{article.bluebookIssues}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArticle && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="changes">Track Changes</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Article Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Current Status</Label>
                          <Badge className="ml-2" variant="secondary">
                            {selectedArticle.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div>
                          <Label>Author</Label>
                          <p className="text-sm text-slate-600">{selectedArticle.authorName}</p>
                        </div>
                        <div>
                          <Label>Word Count</Label>
                          <p className="text-sm text-slate-600">
                            {selectedArticle.content.split(' ').length} words
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Quality Checks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Plagiarism Check</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlagiarismCheck(selectedArticle.id)}
                              disabled={isLoading}
                            >
                              <Search className="h-4 w-4 mr-1" />
                              Check
                            </Button>
                          </div>
                          {selectedArticle.plagiarismScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={selectedArticle.plagiarismScore} 
                                className="flex-1"
                              />
                              <span className="text-sm font-medium">
                                {selectedArticle.plagiarismScore}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Bluebook Citations</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBluebookCheck(selectedArticle.id)}
                              disabled={isLoading}
                            >
                              <BookOpen className="h-4 w-4 mr-1" />
                              Check
                            </Button>
                          </div>
                          {selectedArticle.bluebookIssues !== undefined && (
                            <div className="flex items-center gap-2">
                              {selectedArticle.bluebookIssues === 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="text-sm">
                                {selectedArticle.bluebookIssues === 0 
                                  ? "All citations correct" 
                                  : `${selectedArticle.bluebookIssues} issues found`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Article Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={selectedArticle.content}
                      onChange={(e) => {
                        setArticles(prev => prev.map(a => 
                          a.id === selectedArticle.id 
                            ? { ...a, content: e.target.value }
                            : a
                        ));
                        setSelectedArticle({ ...selectedArticle, content: e.target.value });
                      }}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Article content..."
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline">
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </Button>
                      <Button>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Track Changes Tab */}
              <TabsContent value="changes">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Track Changes</CardTitle>
                    <CardDescription>
                      Review and manage all changes made to the article
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedArticle.trackChanges.map((change) => (
                        <div key={change.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {change.type}
                              </Badge>
                              <span className="text-sm text-slate-600">
                                by {change.userName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(change.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {change.accepted === null && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcceptChange(change.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectChange(change.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {change.originalContent && (
                              <div className="bg-red-50 p-2 rounded text-sm">
                                <span className="text-red-600 font-medium">Original: </span>
                                <span className="line-through">{change.originalContent}</span>
                              </div>
                            )}
                            <div className="bg-green-50 p-2 rounded text-sm">
                              <span className="text-green-600 font-medium">New: </span>
                              <span>{change.content}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sections Tab */}
              <TabsContent value="sections">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Section Assignments</CardTitle>
                    <CardDescription>
                      Assign different sections to editors and reviewers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedArticle.sections.map((section) => (
                        <div key={section.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Lines {section.startLine}-{section.endLine}
                              </Badge>
                              <Badge variant="secondary">
                                {section.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Select>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Assign Editor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="editor-1">Michael Chen</SelectItem>
                                  <SelectItem value="editor-2">Sarah Johnson</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Assign Reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="reviewer-1">Dr. Lisa Martinez</SelectItem>
                                  <SelectItem value="reviewer-2">Prof. David Kim</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="text-sm text-slate-600 mb-3">
                            {section.content.substring(0, 200)}...
                          </div>
                          {section.comments.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Comments:</Label>
                              {section.comments.map((comment) => (
                                <div key={comment.id} className="bg-slate-50 p-2 rounded text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{comment.userName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {comment.type}
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                      {new Date(comment.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p>{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">File Attachments</CardTitle>
                    <CardDescription>
                      Upload and manage files related to this article
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600 mb-2">
                          Drag and drop files here, or click to browse
                        </p>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          id="file-upload"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(handleFileUpload);
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          Choose Files
                        </Button>
                      </div>

                      {selectedArticle.attachments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Attached Files</Label>
                          {selectedArticle.attachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-slate-400" />
                                <div>
                                  <p className="font-medium text-sm">{file.originalName}</p>
                                  <p className="text-xs text-slate-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • 
                                    Uploaded by {file.uploadedBy}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Link className="h-4 w-4 mr-1" />
                                  Share
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
