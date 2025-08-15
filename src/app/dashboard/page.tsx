"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

// Mock data for dashboard statistics
const stats = [
  {
    title: "Total Videos",
    value: "47",
    change: "+3 this week",
    trend: "up"
  },
  {
    title: "Student Submissions",
    value: "156",
    change: "+12 this week",
    trend: "up"
  },
  {
    title: "Law Review Articles",
    value: "23",
    change: "+2 this month",
    trend: "up"
  },
  {
    title: "Upcoming Events",
    value: "8",
    change: "Next: Feb 20",
    trend: "neutral"
  }
];

const recentActivity = [
  {
    id: 1,
    type: "video",
    title: "Constitutional Law Lecture uploaded",
    user: "Prof. Sarah Johnson",
    time: "2 hours ago",
    status: "published"
  },
  {
    id: 2,
    type: "assignment",
    title: "Contract Law Essay submitted",
    user: "Jessica Martinez",
    time: "4 hours ago",
    status: "pending"
  },
  {
    id: 3,
    type: "article",
    title: "Environmental Justice article reviewed",
    user: "Editorial Team",
    time: "6 hours ago",
    status: "approved"
  },
  {
    id: 4,
    type: "event",
    title: "Environmental Symposium registered",
    user: "45 new registrations",
    time: "1 day ago",
    status: "active"
  }
];

const pendingTasks = [
  {
    id: 1,
    title: "Review 3 law review submissions",
    priority: "high",
    dueDate: "Today"
  },
  {
    id: 2,
    title: "Upload lecture recordings",
    priority: "medium",
    dueDate: "Tomorrow"
  },
  {
    id: 3,
    title: "Grade student assignments",
    priority: "medium",
    dueDate: "Feb 22"
  },
  {
    id: 4,
    title: "Prepare symposium materials",
    priority: "low",
    dueDate: "Feb 25"
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-600 mt-2">
          Welcome back! Here's what's happening in your repository.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-medium">
                {stat.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {stat.value}
              </div>
              <div className={`text-sm ${
                stat.trend === 'up' ? 'text-green-600' : 
                stat.trend === 'down' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across all repository modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-lg">
                        {activity.type === 'video' ? '🎥' :
                         activity.type === 'assignment' ? '📝' :
                         activity.type === 'article' ? '📖' : '📅'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        activity.status === 'published' ? 'default' :
                        activity.status === 'approved' ? 'secondary' :
                        activity.status === 'pending' ? 'outline' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>
                Items requiring your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {task.title}
                      </p>
                      <Badge 
                        variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }
                        className="text-xs ml-2"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Due: {task.dueDate}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  View All Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/video">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎥</span>
              </div>
              <CardTitle className="text-lg">Upload Video</CardTitle>
              <CardDescription>
                Add new educational content to the video library
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/student-assignments">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📝</span>
              </div>
              <CardTitle className="text-lg">Submit Assignment</CardTitle>
              <CardDescription>
                Submit your academic writing assignments
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/advocacy">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚖️</span>
              </div>
              <CardTitle className="text-lg">Create Event</CardTitle>
              <CardDescription>
                Organize advocacy programs and events
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/law-review">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📖</span>
              </div>
              <CardTitle className="text-lg">Law Review</CardTitle>
              <CardDescription>
                Submit and collaborate on legal articles
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* System Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current system performance and AI service status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Storage Usage</span>
                <span className="text-sm text-slate-500">67%</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">AI Service</span>
                <Badge variant="secondary" className="text-xs">Online</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Ollama and LangChain services running normally
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Video Processing</span>
                <Badge variant="secondary" className="text-xs">Ready</Badge>
              </div>
              <p className="text-xs text-slate-500">
                3 videos in processing queue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
