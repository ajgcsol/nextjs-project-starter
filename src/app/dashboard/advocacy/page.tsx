"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, FileText, Scale, MapPin, Clock } from "lucide-react";

export default function AdvocacyPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("advocacy", "view") && !canAccess("*", "*")) {
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
          <h1 className="text-3xl font-bold text-slate-900">Advocacy Programs</h1>
          <p className="text-slate-600 mt-2">
            Manage legal advocacy initiatives, pro bono cases, and community outreach
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Program Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Scale className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-slate-600">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">45</p>
                <p className="text-sm text-slate-600">Volunteers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-slate-600">Community Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">1,250</p>
                <p className="text-sm text-slate-600">Pro Bono Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cases */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Active Advocacy Cases</CardTitle>
          <CardDescription>
            Current legal advocacy cases and community assistance programs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: "Housing Rights Defense - Riverside Community",
                type: "Housing Rights",
                status: "active",
                volunteer: "Sarah Johnson",
                clients: 12,
                priority: "high"
              },
              {
                title: "Immigration Legal Aid - Downtown Clinic",
                type: "Immigration",
                status: "active",
                volunteer: "Michael Chen",
                clients: 8,
                priority: "urgent"
              },
              {
                title: "Veterans Benefits Assistance Program",
                type: "Veterans Rights",
                status: "active",
                volunteer: "Emily Rodriguez",
                clients: 15,
                priority: "medium"
              },
              {
                title: "Environmental Justice - Water Quality Case",
                type: "Environmental",
                status: "review",
                volunteer: "David Kim",
                clients: 25,
                priority: "high"
              }
            ].map((advocacyCase, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  <Scale className="h-5 w-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{advocacyCase.title}</h3>
                      {advocacyCase.priority === "urgent" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                      {advocacyCase.priority === "high" && (
                        <Badge variant="secondary" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{advocacyCase.type} • Lead: {advocacyCase.volunteer}</p>
                    <div className="flex items-center text-xs text-slate-500 gap-4">
                      <span>{advocacyCase.clients} clients served</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      advocacyCase.status === "active" ? "default" : 
                      advocacyCase.status === "review" ? "secondary" : 
                      "outline"
                    }
                  >
                    {advocacyCase.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming Community Events</CardTitle>
          <CardDescription>
            Scheduled outreach events and legal clinics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Free Legal Clinic - Family Law", date: "2024-01-22", location: "Community Center", volunteers: 6 },
              { name: "Immigration Rights Workshop", date: "2024-01-25", location: "Law School", volunteers: 4 },
              { name: "Housing Rights Information Session", date: "2024-01-28", location: "Public Library", volunteers: 8 }
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <h3 className="font-medium text-sm">{event.name}</h3>
                    <p className="text-xs text-slate-500">{event.date} • {event.location} • {event.volunteers} volunteers</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View Details</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}