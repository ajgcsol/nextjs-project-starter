"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Download, TrendingUp, Users, FileText, Video, Eye, Calendar } from "lucide-react";

export default function AnalyticsPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("analytics", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Repository usage statistics, content performance, and user engagement metrics
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">3,892</p>
                <p className="text-sm text-slate-600">Documents</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8% this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Video className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-slate-600">Video Content</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15% this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">28,451</p>
                <p className="text-sm text-slate-600">Monthly Views</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +23% this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>User Activity by Role</CardTitle>
            <CardDescription>Active users breakdown by permission level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { role: "Students", count: 892, percentage: 72, color: "bg-blue-500" },
                { role: "Faculty", count: 234, percentage: 19, color: "bg-green-500" },
                { role: "Administrators", count: 67, percentage: 5, color: "bg-purple-500" },
                { role: "Editors", count: 54, percentage: 4, color: "bg-orange-500" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium">{item.role}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">{item.count}</span>
                    <div className="w-20 bg-slate-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{width: `${item.percentage}%`}}></div>
                    </div>
                    <span className="text-xs text-slate-500 w-8">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Performance */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Most Accessed Content</CardTitle>
            <CardDescription>Top performing content by view count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Constitutional Law Fundamentals", type: "Article", views: 2847, trend: "up" },
                { title: "Contract Law Case Studies", type: "Video", views: 2156, trend: "up" },
                { title: "Legal Research Methods", type: "Document", views: 1923, trend: "stable" },
                { title: "Environmental Law Overview", type: "Article", views: 1789, trend: "up" },
                { title: "Criminal Procedure Guide", type: "Video", views: 1567, trend: "down" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{item.views.toLocaleString()}</span>
                    <Badge variant="outline" className={`text-xs ${
                      item.trend === "up" ? "text-green-600" : 
                      item.trend === "down" ? "text-red-600" : 
                      "text-slate-600"
                    }`}>
                      {item.trend === "up" ? "↗" : item.trend === "down" ? "↘" : "→"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>System Health & Performance</CardTitle>
          <CardDescription>Key system metrics and operational status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-slate-900">Storage Usage</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Documents</span>
                  <span>2.4 TB</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '68%'}}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Videos</span>
                  <span>1.8 TB</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{width: '51%'}}></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-slate-900">Response Times</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Load Time</span>
                  <Badge variant="outline" className="text-green-600">1.2s</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Search Response</span>
                  <Badge variant="outline" className="text-green-600">0.8s</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Video Streaming</span>
                  <Badge variant="outline" className="text-orange-600">2.1s</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-slate-900">System Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database</span>
                  <Badge variant="outline" className="text-green-600">Healthy</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Video Services</span>
                  <Badge variant="outline" className="text-green-600">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Search Index</span>
                  <Badge variant="outline" className="text-yellow-600">Rebuilding</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}