"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Calendar, Users } from "lucide-react";

export default function LawReviewPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("law_review", "view") && !canAccess("*", "*")) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, canAccess, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Law Review</h1>
          <p className="text-slate-600 mt-2">
            Create and manage law review articles and publications
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/articles/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-slate-600">Total Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Edit className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-slate-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-slate-600">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-slate-600">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Articles List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Law Review Articles</CardTitle>
          <CardDescription>
            Manage your law review articles and collaborative editing projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock article data */}
            {[
              { 
                title: "AI Ethics in Legal Practice: A Comprehensive Framework", 
                author: "Prof. Sarah Johnson",
                status: "published",
                lastModified: "2024-01-15",
                wordCount: "12,450"
              },
              { 
                title: "The Evolution of International Trade Law Post-Brexit", 
                author: "Dr. Michael Chen",
                status: "under_review",
                lastModified: "2024-01-12",
                wordCount: "8,750"
              },
              { 
                title: "Environmental Justice and Climate Litigation", 
                author: "Emily Rodriguez",
                status: "in_progress",
                lastModified: "2024-01-10",
                wordCount: "6,200"
              },
              { 
                title: "Digital Privacy Rights in the Modern Era", 
                author: "Prof. David Kim",
                status: "draft",
                lastModified: "2024-01-08",
                wordCount: "3,450"
              }
            ].map((article, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="h-5 w-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">{article.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">By: {article.author}</p>
                    <div className="flex items-center text-xs text-slate-500 gap-4">
                      <span>Modified: {article.lastModified}</span>
                      <span>{article.wordCount} words</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      article.status === "published" ? "default" : 
                      article.status === "under_review" ? "secondary" : 
                      article.status === "in_progress" ? "outline" : 
                      "secondary"
                    }
                  >
                    {article.status.replace("_", " ")}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}