"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Navigation Header */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-slate-900">
                Law School Repository
              </h1>
              <div className="hidden md:flex space-x-6">
                <Link href="/public/browse" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Browse
                </Link>
                <Link href="/public/articles" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Articles
                </Link>
                <Link href="/public/videos" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Videos
                </Link>
                <Link href="/public/events" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Events
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Button>Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Legal Education & Research Repository
          </h2>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            A comprehensive platform for legal scholarship, student work, advocacy programs, 
            and collaborative research with AI-powered editorial assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/public/browse">
              <Button size="lg" className="w-full sm:w-auto">
                Explore Content
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Access Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Repository Features
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Video Library</CardTitle>
                <CardDescription>
                  Stream educational content with our custom video player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/public/videos">
                  <Button variant="ghost" className="w-full">Browse Videos</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Law Review</CardTitle>
                <CardDescription>
                  Collaborative editing with AI-powered editorial assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/public/articles">
                  <Button variant="ghost" className="w-full">Read Articles</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Student Work</CardTitle>
                <CardDescription>
                  Submit and showcase academic writing assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/student-assignments">
                  <Button variant="ghost" className="w-full">Submit Work</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Events & Programs</CardTitle>
                <CardDescription>
                  Advocacy programs and educational events calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/public/events">
                  <Button variant="ghost" className="w-full">View Events</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Content Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-slate-900">Recent Publications</h3>
            <Link href="/public/browse">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">Constitutional Law Analysis</CardTitle>
                  <CardDescription>
                    Recent developments in constitutional interpretation...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <span>Law Review</span>
                    <span>2 days ago</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">Repository</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="/public/browse" className="hover:text-white transition-colors">Browse Content</Link></li>
                <li><Link href="/public/articles" className="hover:text-white transition-colors">Articles</Link></li>
                <li><Link href="/public/videos" className="hover:text-white transition-colors">Videos</Link></li>
                <li><Link href="/public/events" className="hover:text-white transition-colors">Events</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Students</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="/dashboard/student-assignments" className="hover:text-white transition-colors">Submit Work</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Faculty</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="/dashboard/video" className="hover:text-white transition-colors">Upload Videos</Link></li>
                <li><Link href="/dashboard/advocacy" className="hover:text-white transition-colors">Manage Programs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Editorial</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="/dashboard/law-review" className="hover:text-white transition-colors">Law Review</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 Law School Institutional Repository. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
