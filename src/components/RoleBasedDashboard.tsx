"use client";

import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Users, 
  FileText, 
  Video, 
  Calendar, 
  Settings, 
  BarChart,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Shield,
  LogOut
} from "lucide-react";

interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  requiredRoles: UserRole[];
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const DASHBOARD_MODULES: DashboardModule[] = [
  // Admin modules
  {
    id: "user-management",
    title: "User Management",
    description: "Manage users and assign roles",
    icon: <Users className="h-6 w-6" />,
    href: "/dashboard/admin/users",
    requiredRoles: ["admin"]
  },
  {
    id: "system-settings",
    title: "System Settings",
    description: "Configure system-wide settings",
    icon: <Settings className="h-6 w-6" />,
    href: "/dashboard/admin/settings",
    requiredRoles: ["admin"]
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "View system analytics and reports",
    icon: <BarChart className="h-6 w-6" />,
    href: "/dashboard/admin/analytics",
    requiredRoles: ["admin"]
  },
  
  // Faculty modules
  {
    id: "course-content",
    title: "Course Content",
    description: "Manage course materials and lectures",
    icon: <BookOpen className="h-6 w-6" />,
    href: "/dashboard/editor?type=course",
    requiredRoles: ["faculty", "admin"]
  },
  {
    id: "assignments",
    title: "Assignments",
    description: "Create and grade assignments",
    icon: <GraduationCap className="h-6 w-6" />,
    href: "/dashboard/assignments",
    requiredRoles: ["faculty", "admin"]
  },
  
  // Video Editor modules
  {
    id: "video-library",
    title: "Video Library",
    description: "Manage and edit video content",
    icon: <Video className="h-6 w-6" />,
    href: "/dashboard/videos",
    requiredRoles: ["video_editor", "faculty", "admin"],
    badge: "3 pending",
    badgeVariant: "secondary"
  },
  
  // Editorial modules
  {
    id: "editorial-queue",
    title: "Editorial Queue",
    description: "Review and manage article submissions",
    icon: <FileText className="h-6 w-6" />,
    href: "/dashboard/editorial",
    requiredRoles: ["editor_in_chief", "editor", "reviewer", "approver"],
    badge: "12 articles",
    badgeVariant: "default"
  },
  {
    id: "review-assignments",
    title: "Review Assignments",
    description: "Articles assigned for your review",
    icon: <CheckCircle className="h-6 w-6" />,
    href: "/dashboard/reviews",
    requiredRoles: ["reviewer", "editor"],
    badge: "5 pending",
    badgeVariant: "destructive"
  },
  {
    id: "law-review-editor",
    title: "Law Review Editor",
    description: "Create and edit law review articles",
    icon: <Edit className="h-6 w-6" />,
    href: "/dashboard/editor?type=article",
    requiredRoles: ["editor_in_chief", "editor", "faculty"]
  },
  
  // Event management
  {
    id: "event-management",
    title: "Event Management",
    description: "Create and manage events",
    icon: <Calendar className="h-6 w-6" />,
    href: "/dashboard/events",
    requiredRoles: ["admin", "faculty", "editor_in_chief"]
  },
  
  // Student modules
  {
    id: "my-submissions",
    title: "My Submissions",
    description: "View your article and assignment submissions",
    icon: <Clock className="h-6 w-6" />,
    href: "/dashboard/submissions",
    requiredRoles: ["student"]
  }
];

export function RoleBasedDashboard() {
  const { user, hasAnyRole, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };
  
  if (!user) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600">Please log in to access the dashboard.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Filter modules based on user roles
  const availableModules = DASHBOARD_MODULES.filter(module => 
    hasAnyRole(module.requiredRoles)
  );
  
  // Get role-specific welcome message
  const getWelcomeMessage = () => {
    if (hasAnyRole(["admin"])) {
      return "Welcome to the admin dashboard. You have full system access.";
    } else if (hasAnyRole(["editor_in_chief"])) {
      return "Welcome, Editor-in-Chief. Manage the editorial workflow and review submissions.";
    } else if (hasAnyRole(["faculty"])) {
      return `Welcome, ${user.name}. Manage your courses and review student submissions.`;
    } else if (hasAnyRole(["video_editor"])) {
      return "Welcome to the video management dashboard.";
    } else if (hasAnyRole(["editor", "reviewer"])) {
      return "Welcome to the editorial dashboard. Review and manage article submissions.";
    } else if (hasAnyRole(["student"])) {
      return "Welcome! View your submissions and course materials.";
    }
    return "Welcome to the dashboard.";
  };
  
  // Get role-specific quick stats
  const getQuickStats = () => {
    const stats = [];
    
    if (hasAnyRole(["admin"])) {
      stats.push(
        { label: "Total Users", value: "156", trend: "+12 this week" },
        { label: "Active Sessions", value: "42", trend: "Current" }
      );
    }
    
    if (hasAnyRole(["editor_in_chief", "editor"])) {
      stats.push(
        { label: "Pending Reviews", value: "8", trend: "3 urgent" },
        { label: "In Editing", value: "5", trend: "2 near deadline" }
      );
    }
    
    if (hasAnyRole(["faculty"])) {
      stats.push(
        { label: "Active Courses", value: "3", trend: "This semester" },
        { label: "Pending Grades", value: "24", trend: "Due this week" }
      );
    }
    
    if (hasAnyRole(["video_editor"])) {
      stats.push(
        { label: "Videos Processing", value: "3", trend: "~2 hours remaining" },
        { label: "Published Today", value: "5", trend: "Above average" }
      );
    }
    
    if (hasAnyRole(["reviewer"])) {
      stats.push(
        { label: "Assigned Reviews", value: "4", trend: "2 due soon" },
        { label: "Completed", value: "12", trend: "This month" }
      );
    }
    
    return stats;
  };
  
  const quickStats = getQuickStats();
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Hello, {user.name}</CardTitle>
              <CardDescription className="mt-2">
                {getWelcomeMessage()}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex gap-2">
                {user.roles.map(role => (
                  <Badge key={role} variant="secondary" className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {role.replace("_", " ")}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Quick Stats */}
      {quickStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm">{stat.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-sm text-slate-500 mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Available Modules */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableModules.map(module => (
            <Link key={module.id} href={module.href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {module.icon}
                    </div>
                    {module.badge && (
                      <Badge variant={module.badgeVariant}>
                        {module.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Role-specific notifications */}
      {hasAnyRole(["editor_in_chief", "editor", "reviewer"]) && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Editorial Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <span className="text-sm">New submission: "Constitutional Law in Digital Age"</span>
                <Badge variant="outline" className="text-xs">2 hours ago</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm">Review completed on "Environmental Justice Framework"</span>
                <Badge variant="outline" className="text-xs">5 hours ago</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm">Article approved: "Corporate Governance Reform"</span>
                <Badge variant="outline" className="text-xs">1 day ago</Badge>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}