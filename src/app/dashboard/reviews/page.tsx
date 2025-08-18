"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function ReviewsPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("reviews", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Review Queue</h1>
          <p className="text-slate-600 mt-2">
            Articles and submissions assigned for your review
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
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-slate-600">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-slate-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-slate-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-sm text-slate-600">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Assigned Reviews</CardTitle>
          <CardDescription>
            Review articles and submissions assigned to you by the editorial team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock review data */}
            {[
              { 
                title: "The Future of Environmental Law in Climate Change Litigation", 
                author: "Sarah Johnson",
                type: "Law Review Article",
                assigned: "2024-01-10",
                due: "2024-01-25",
                status: "pending",
                priority: "high"
              },
              { 
                title: "Constitutional Implications of Digital Privacy Rights", 
                author: "Michael Chen",
                type: "Student Paper",
                assigned: "2024-01-08",
                due: "2024-01-22",
                status: "in_review",
                priority: "medium"
              },
              { 
                title: "Corporate Governance in the Post-Pandemic Era", 
                author: "Emily Rodriguez",
                type: "Law Review Article",
                assigned: "2024-01-05",
                due: "2024-01-20",
                status: "overdue",
                priority: "urgent"
              }
            ].map((review, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="h-5 w-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 line-clamp-1">{review.title}</h3>
                      {review.priority === "urgent" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                      {review.priority === "high" && (
                        <Badge variant="secondary" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">By: {review.author} • {review.type}</p>
                    <div className="flex items-center text-xs text-slate-500 gap-4">
                      <span>Assigned: {review.assigned}</span>
                      <span>Due: {review.due}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      review.status === "overdue" ? "destructive" : 
                      review.status === "in_review" ? "default" : 
                      "secondary"
                    }
                  >
                    {review.status.replace("_", " ")}
                  </Badge>
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
    </div>
  );
}