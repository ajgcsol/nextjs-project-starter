"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  requiredRoles?: UserRole[];
}

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/dashboard", icon: "📊" }, // Available to all authenticated users
  { name: "Video Management", href: "/dashboard/videos", icon: "🎥", requiredRoles: ["video_editor", "faculty", "admin"] },
  { name: "Event Management", href: "/dashboard/events", icon: "📅", requiredRoles: ["faculty", "admin"] },
  { name: "Course Management", href: "/dashboard/courses", icon: "🎓", requiredRoles: ["faculty", "admin"] },
  { name: "Editorial Assignments", href: "/dashboard/student-assignments", icon: "📝", requiredRoles: ["student", "faculty", "admin"] },
  { name: "Blue Book Citations", href: "/dashboard/bluebook", icon: "📘", requiredRoles: ["student", "editor", "reviewer", "faculty", "admin"] },
  { name: "Journal Management", href: "/dashboard/journals", icon: "📚", requiredRoles: ["faculty", "admin"] },
  { name: "Advocacy Programs", href: "/dashboard/advocacy", icon: "⚖️", requiredRoles: ["faculty", "admin"] },
  { name: "Law Review", href: "/dashboard/law-review", icon: "📖", requiredRoles: ["editor_in_chief", "editor", "reviewer", "faculty", "admin"] },
  { name: "Editorial Queue", href: "/dashboard/editorial", icon: "📄", requiredRoles: ["editor_in_chief", "editor", "reviewer", "admin"] },
  { name: "Reviews", href: "/dashboard/reviews", icon: "✓", requiredRoles: ["reviewer", "editor", "admin"] },
  { name: "User Management", href: "/dashboard/admin/users", icon: "👥", requiredRoles: ["admin"] },
  { name: "Analytics", href: "/dashboard/admin/analytics", icon: "📈", requiredRoles: ["admin"] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, hasAnyRole, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Filter navigation items based on user roles
  const availableNavigation = navigation.filter(item => 
    !item.requiredRoles || hasAnyRole(item.requiredRoles)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900">
                  Law School Repository
                </h1>
              </Link>
              <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/public/browse">
                <Button variant="outline" size="sm">
                  Public View
                </Button>
              </Link>
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback>
                          {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs leading-none text-blue-600">
                          {user.roles.join(', ')}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <nav className="space-y-2">
              {availableNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {hasAnyRole(["video_editor", "faculty", "admin"]) && (
                  <Link href="/dashboard/videos">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Upload Video
                    </Button>
                  </Link>
                )}
                {hasAnyRole(["student", "faculty", "admin"]) && (
                  <Link href="/dashboard/student-assignments">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Submit Assignment
                    </Button>
                  </Link>
                )}
                {hasAnyRole(["faculty", "admin"]) && (
                  <Link href="/dashboard/journals">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      New Journal
                    </Button>
                  </Link>
                )}
                {hasAnyRole(["editor_in_chief", "editor", "faculty", "admin"]) && (
                  <Link href="/dashboard/articles/new">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      New Article
                    </Button>
                  </Link>
                )}
                {hasAnyRole(["admin"]) && (
                  <Link href="/dashboard/admin/users">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Manage Users
                    </Button>
                  </Link>
                )}
                {hasAnyRole(["reviewer", "editor", "admin"]) && (
                  <Link href="/dashboard/reviews">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Review Queue
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Support
              </h3>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600">
                  Help Center
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600">
                  Contact Support
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600">
                  Documentation
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
