"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Overview", href: "/dashboard", icon: "📊" },
  { name: "Video Management", href: "/dashboard/video", icon: "🎥" },
  { name: "Student Assignments", href: "/dashboard/student-assignments", icon: "📝" },
  { name: "Advocacy Programs", href: "/dashboard/advocacy", icon: "⚖️" },
  { name: "Law Review", href: "/dashboard/law-review", icon: "📖" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">U</span>
                </div>
                <span className="text-sm font-medium text-slate-700">User</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <nav className="space-y-2">
              {navigation.map((item) => {
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
                <Link href="/dashboard/video">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Upload Video
                  </Button>
                </Link>
                <Link href="/dashboard/student-assignments">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Submit Assignment
                  </Button>
                </Link>
                <Link href="/dashboard/law-review">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    New Article
                  </Button>
                </Link>
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
