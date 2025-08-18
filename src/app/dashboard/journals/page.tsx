"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Eye, Calendar, Users, FileText, Globe } from "lucide-react";

export default function JournalsPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("journals", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Journal Management</h1>
          <p className="text-slate-600 mt-2">
            Create, manage, and publish academic journals across different legal specialties
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Journal
        </Button>
      </div>

      {/* Journal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-sm text-slate-600">Active Journals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Edit className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-slate-600">In Production</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-slate-600">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-slate-600">Due This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Journals */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Active Journals</CardTitle>
          <CardDescription>
            Current journals in various stages of development and publication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: "Constitutional Law Review",
                specialty: "Constitutional Law",
                status: "published",
                volume: "Vol. 15, Issue 2",
                articles: 8,
                editors: 4,
                publishDate: "2024-01-15",
                isPublic: true
              },
              {
                title: "Environmental Justice Quarterly",
                specialty: "Environmental Law",
                status: "in_production",
                volume: "Vol. 12, Issue 1",
                articles: 6,
                editors: 3,
                publishDate: "2024-02-01",
                isPublic: false
              },
              {
                title: "International Trade Law Journal",
                specialty: "International Trade",
                status: "in_production",
                volume: "Vol. 8, Issue 3",
                articles: 4,
                editors: 2,
                publishDate: "2024-01-28",
                isPublic: false
              },
              {
                title: "Digital Privacy & Technology Law",
                specialty: "Technology Law",
                status: "in_review",
                volume: "Vol. 3, Issue 2",
                articles: 7,
                editors: 5,
                publishDate: "2024-02-15",
                isPublic: false
              },
              {
                title: "Corporate Governance Review",
                specialty: "Corporate Law",
                status: "draft",
                volume: "Vol. 22, Issue 1",
                articles: 3,
                editors: 2,
                publishDate: "2024-03-01",
                isPublic: false
              }
            ].map((journal, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  <BookOpen className="h-5 w-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{journal.title}</h3>
                      {journal.isPublic && (
                        <Badge variant="default" className="text-xs">Public</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      {journal.specialty} • {journal.volume}
                    </p>
                    <div className="flex items-center text-xs text-slate-500 gap-4">
                      <span>{journal.articles} articles</span>
                      <span>{journal.editors} editors</span>
                      <span>Target: {journal.publishDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      journal.status === "published" ? "default" : 
                      journal.status === "in_production" ? "secondary" : 
                      journal.status === "in_review" ? "outline" :
                      "destructive"
                    }
                  >
                    {journal.status.replace("_", " ")}
                  </Badge>
                  {journal.isPublic && (
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Public
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recently Published */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Recently Published</CardTitle>
          <CardDescription>
            Journals that have been published and are publicly available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Human Rights Law Review", volume: "Vol. 18, Issue 4", published: "2024-01-08", downloads: 1240 },
              { title: "Criminal Justice Reform Quarterly", volume: "Vol. 9, Issue 2", published: "2023-12-15", downloads: 892 },
              { title: "Immigration Law & Policy", volume: "Vol. 14, Issue 3", published: "2023-12-01", downloads: 1567 }
            ].map((journal, index) => (
              <Card key={index} className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{journal.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {journal.volume}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-slate-500">
                      Published: {journal.published}
                    </div>
                    <div className="text-blue-600 font-medium">
                      {journal.downloads} views
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}