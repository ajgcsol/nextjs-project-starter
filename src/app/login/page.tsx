"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle,
  Users,
  Shield,
  BookOpen,
  Video,
  Edit,
  Search,
  GraduationCap
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithMicrosoft } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  // Test user credentials
  const testUsers = [
    { email: "admin@law.edu", password: "admin123", role: "Administrator", description: "Full system access" },
    { email: "professor@law.edu", password: "prof123", role: "Faculty", description: "Create courses, grade assignments" },
    { email: "editor.chief@law.edu", password: "editor123", role: "Editor-in-Chief", description: "Manage editorial workflow" },
    { email: "editor@law.edu", password: "edit123", role: "Editor", description: "Edit and review articles" },
    { email: "video.editor@law.edu", password: "video123", role: "Video Editor", description: "Manage video content" },
    { email: "researcher@law.edu", password: "research123", role: "Researcher", description: "Validate citations" },
    { email: "student@law.edu", password: "student123", role: "Student", description: "Submit assignments" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoft365Login = async () => {
    setIsLoading(true);
    setError("");

    try {
      await loginWithMicrosoft();
      router.push("/dashboard");
    } catch (err) {
      setError("Microsoft 365 authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        {/* Login Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Law School Repository</CardTitle>
            <CardDescription>
              Sign in to access the institutional repository
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@law.edu"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleMicrosoft365Login}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#f25022" d="M1 1h10.5v10.5H1z"/>
                <path fill="#7fba00" d="M12.5 1H23v10.5H12.5z"/>
                <path fill="#00a4ef" d="M1 12.5h10.5V23H1z"/>
                <path fill="#ffb900" d="M12.5 12.5H23V23H12.5z"/>
              </svg>
              Sign in with Microsoft 365
            </Button>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setShowTestCredentials(!showTestCredentials)}
            >
              {showTestCredentials ? "Hide" : "Show"} Test Credentials
            </Button>
          </CardContent>
        </Card>

        {/* Test Credentials & Info */}
        <div className="space-y-6">
          {/* System Features */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                System Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Video className="h-4 w-4 text-blue-500" />
                <span>Video streaming with custom player</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Edit className="h-4 w-4 text-green-500" />
                <span>Law review collaborative editing</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Search className="h-4 w-4 text-purple-500" />
                <span>Bluebook citation research</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="h-4 w-4 text-orange-500" />
                <span>Student assignment submissions</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-red-500" />
                <span>Role-based access control</span>
              </div>
            </CardContent>
          </Card>

          {/* Test Credentials */}
          {showTestCredentials && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Test User Credentials</CardTitle>
                <CardDescription>
                  Click any credential to auto-fill the login form
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {testUsers.map((user, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleTestLogin(user.email, user.password)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{user.role}</Badge>
                      <code className="text-xs text-slate-500">
                        {user.password}
                      </code>
                    </div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-slate-600">{user.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Access */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/public/browse" target="_blank">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Public Content
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/public/articles" target="_blank">
                  <Edit className="h-4 w-4 mr-2" />
                  View Published Articles
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/public/events" target="_blank">
                  <Users className="h-4 w-4 mr-2" />
                  Upcoming Events
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}