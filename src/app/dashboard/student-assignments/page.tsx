"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Calendar, CheckCircle, Clock, BookOpenCheck, Scale } from "lucide-react";

export default function StudentAssignmentsPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("assignments", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Editorial Assignments</h1>
          <p className="text-slate-600 mt-2">
            Article sections assigned to you for editing and review
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Submit Draft
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-slate-600">Editorial Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BookOpenCheck className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-slate-600">Blue Book Citations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-slate-600">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-slate-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-slate-600">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Your Editorial Assignments</CardTitle>
          <CardDescription>
            Article sections assigned to you with tracked changes and approval workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock assignment data for different workflow types */}
            {[
              { 
                title: "Constitutional Law Analysis - Introduction & Background", 
                article: "AI Ethics in Legal Practice",
                workflowType: "editorial",
                status: "in_progress", 
                assigned: "2024-01-15",
                due: "2024-01-22",
                wordCount: "850",
                hasChanges: true,
                contentId: "sha256:a4b6c2f1e5d3",
                permalink: "/content/a4b6c2f1e5d3"
              },
              { 
                title: "Blue Book Citation Review - Case References", 
                article: "Environmental Justice in Corporate Litigation",
                workflowType: "bluebook",
                status: "under_review", 
                assigned: "2024-01-12",
                due: "2024-01-20",
                citationCount: "47",
                hasChanges: false,
                contentId: "sha256:b7c8d9e2f6g4",
                permalink: "/content/b7c8d9e2f6g4"
              },
              { 
                title: "Blue Book Citation Verification - Footnotes 1-25", 
                article: "International Trade Law Post-Brexit",
                workflowType: "bluebook",
                status: "revisions_requested", 
                assigned: "2024-01-10",
                due: "2024-01-25",
                citationCount: "25",
                hasChanges: true,
                contentId: "sha256:c8d9e3f7h5i2",
                permalink: "/content/c8d9e3f7h5i2"
              },
              { 
                title: "Digital Privacy Rights - Legal Framework", 
                article: "Digital Privacy Rights in the Modern Era",
                workflowType: "editorial",
                status: "approved", 
                assigned: "2024-01-08",
                due: "2024-01-18",
                wordCount: "1,100",
                hasChanges: false,
                contentId: "sha256:d9e4f8g6i3j7",
                permalink: "/content/d9e4f8g6i3j7"
              },
              { 
                title: "Blue Book Format Review - Bibliography & Sources", 
                article: "Corporate Governance in Modern Law",
                workflowType: "bluebook",
                status: "in_progress", 
                assigned: "2024-01-14",
                due: "2024-01-21",
                citationCount: "62",
                hasChanges: true,
                contentId: "sha256:e5f9g7h4j8k1",
                permalink: "/content/e5f9g7h4j8k1"
              }
            ].map((assignment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  {assignment.workflowType === "bluebook" ? (
                    <BookOpenCheck className="h-5 w-5 text-purple-400 mt-1" />
                  ) : (
                    <FileText className="h-5 w-5 text-slate-400 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{assignment.title}</h3>
                      <Badge variant="outline" className={`text-xs ${
                        assignment.workflowType === "bluebook" ? "text-purple-600 border-purple-200" : "text-blue-600 border-blue-200"
                      }`}>
                        {assignment.workflowType === "bluebook" ? "Blue Book" : "Editorial"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Article: {assignment.article}</p>
                    <div className="flex items-center text-xs text-slate-500 gap-4">
                      <span>Assigned: {assignment.assigned}</span>
                      <span>Due: {assignment.due}</span>
                      {assignment.workflowType === "bluebook" ? (
                        <span>{assignment.citationCount} citations</span>
                      ) : (
                        <span>{assignment.wordCount} words</span>
                      )}
                      {assignment.hasChanges && (
                        <span className="text-blue-600">• Has tracked changes</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Permalink: <code className="bg-slate-100 px-1 rounded">{assignment.permalink}</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      assignment.status === "approved" ? "default" : 
                      assignment.status === "under_review" ? "secondary" : 
                      assignment.status === "revisions_requested" ? "destructive" :
                      "outline"
                    }
                  >
                    {assignment.status.replace("_", " ")}
                  </Badge>
                  <Button variant="outline" size="sm">
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