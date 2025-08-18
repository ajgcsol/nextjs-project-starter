"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, CheckCircle, Clock, AlertCircle, User } from "lucide-react";

export default function EditorialPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("editorial", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Editorial Queue</h1>
          <p className="text-slate-600 mt-2">
            Manage article submissions and editorial workflow
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-slate-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-slate-600">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-slate-600">Revisions Needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">45</p>
                <p className="text-sm text-slate-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editorial Workflow */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewing">Under Review</TabsTrigger>
          <TabsTrigger value="revisions">Revisions</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>
                New article submissions waiting for initial review assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "The Impact of AI on Contract Law Interpretation",
                    author: "Jessica Martinez",
                    submitted: "2024-01-18",
                    type: "Law Review Article",
                    wordCount: "8,500"
                  },
                  {
                    title: "Environmental Justice in Corporate Litigation",
                    author: "Robert Thompson",
                    submitted: "2024-01-17",
                    type: "Student Paper",
                    wordCount: "6,200"
                  }
                ].map((submission, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 mb-1">{submission.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">By: {submission.author}</p>
                        <div className="flex items-center text-xs text-slate-500 gap-4">
                          <span>Submitted: {submission.submitted}</span>
                          <span>{submission.type}</span>
                          <span>{submission.wordCount} words</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4 mr-1" />
                        Assign Reviewer
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewing">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Under Review</CardTitle>
              <CardDescription>
                Articles currently being reviewed by assigned reviewers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-slate-600">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p>8 articles under review</p>
                  <p className="text-sm">Reviews in progress by assigned reviewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Revisions Requested</CardTitle>
              <CardDescription>
                Articles returned to authors for revisions based on reviewer feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-slate-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p>3 articles awaiting revisions</p>
                  <p className="text-sm">Authors working on requested changes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Approved Articles</CardTitle>
              <CardDescription>
                Articles approved for publication after successful review process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-slate-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p>45 articles approved</p>
                  <p className="text-sm">Ready for publication or already published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}