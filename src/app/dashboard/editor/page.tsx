"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ContentEditor } from "@/components/ContentEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function EditorContent() {
  const { isAuthenticated, canAccess } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentType = searchParams.get("type") as "article" | "video" | "event" | "assignment" || "article";
  const contentId = searchParams.get("id");
  
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Check if user can create this type of content
    const canCreate = canAccess(contentType, "create") || canAccess("*", "*");
    if (!canCreate) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, contentType, canAccess, router]);

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

  const handleSave = async (content: any) => {
    console.log("Saving content:", content);
    
    try {
      // Handle video content specifically
      if (contentType === "video" && content.metadata?.videoId) {
        // Update the video as draft
        const response = await fetch(`/api/videos/upload`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: content.metadata.videoId,
            title: content.title,
            description: content.description,
            category: content.category,
            tags: content.tags,
            visibility: 'private',
            status: 'draft'
          })
        });
        
        if (response.ok) {
          console.log("Draft saved successfully");
        }
      }
      
      // For other content types, call respective APIs
      // Example: await saveContent(content);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handlePublish = async (content: any) => {
    setIsPublishing(true);
    console.log("Publishing content:", content);
    
    try {
      // Handle video content specifically
      if (contentType === "video" && content.metadata?.videoId) {
        // Update the video status to published
        await fetch(`/api/videos/upload`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: content.metadata.videoId,
            title: content.title,
            description: content.description,
            category: content.category,
            tags: content.tags,
            visibility: 'public',
            status: 'published'
          })
        });
      }
      
      // For other content types, call respective APIs
      // Example: await publishContent(content);
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsPublishing(false);
      
      // Redirect to management pages instead of public pages
      switch (contentType) {
        case "article":
          router.push("/dashboard/law-review");
          break;
        case "video":
          router.push("/dashboard/videos");
          break;
        case "event":
          router.push("/dashboard/events");
          break;
        case "assignment":
          router.push("/dashboard/student-assignments");
          break;
        default:
          router.push("/dashboard");
      }
    } catch (error) {
      console.error('Publishing error:', error);
      setIsPublishing(false);
      alert('Publishing failed. Please try again.');
    }
  };

  const getBackLink = () => {
    switch (contentType) {
      case "article":
        return "/dashboard/law-review";
      case "video":
        return "/dashboard/videos";
      case "event":
        return "/dashboard/events";
      case "assignment":
        return "/dashboard/student-assignments";
      default:
        return "/dashboard";
    }
  };

  const getPageTitle = () => {
    if (contentId) {
      return `Edit ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
    }
    return `Create New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={getBackLink()}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{getPageTitle()}</h1>
            <p className="text-slate-600 mt-1">
              {contentId ? "Make changes to existing content" : "Create and publish new content"}
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
      <ContentEditor
        contentType={contentType}
        onSave={handleSave}
        onPublish={handlePublish}
      />
      
      {isPublishing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Publishing...</p>
                <p className="text-sm text-slate-600 mt-2">Please wait while we publish your content</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Loading editor...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
