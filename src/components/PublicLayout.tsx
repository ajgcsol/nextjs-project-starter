"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showSearch?: boolean;
}

export function PublicLayout({ 
  children, 
  title, 
  description, 
  showSearch = true 
}: PublicLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Browse", href: "/public/browse" },
    { name: "Articles", href: "/public/articles" },
    { name: "Videos", href: "/public/videos" },
    { name: "Events", href: "/public/events" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Main Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold text-slate-900">
                  Law School Repository
                </h1>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              {showSearch && (
                <div className="hidden sm:block">
                  <Input
                    type="search"
                    placeholder="Search repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              )}
              
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              
              <Button size="sm">
                Sign In
              </Button>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className={cn(
                    "h-0.5 bg-slate-600 transition-all",
                    mobileMenuOpen ? "rotate-45 translate-y-1" : ""
                  )} />
                  <div className={cn(
                    "h-0.5 bg-slate-600 transition-all",
                    mobileMenuOpen ? "opacity-0" : ""
                  )} />
                  <div className={cn(
                    "h-0.5 bg-slate-600 transition-all",
                    mobileMenuOpen ? "-rotate-45 -translate-y-1" : ""
                  )} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white py-4">
              <div className="space-y-4">
                {showSearch && (
                  <Input
                    type="search"
                    placeholder="Search repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                )}
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-slate-600 hover:text-slate-900 transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="bg-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex text-sm" aria-label="Breadcrumb">
            <Link href="/" className="text-slate-500 hover:text-slate-700">
              Home
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 font-medium">
              {title || "Repository"}
            </span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      {(title || description) && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {title && (
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="#" className="hover:text-white transition-colors">Research Guides</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Citation Help</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Writing Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Library</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Technical Support</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Accessibility</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-300">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Use</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Copyright</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Accessibility Statement</Link></li>
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
