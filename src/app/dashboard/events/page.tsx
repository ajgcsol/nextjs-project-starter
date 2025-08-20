"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContentEditor } from "@/components/ContentEditor";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  MapPin,
  Users,
  Clock,
  Eye,
  Settings
} from "lucide-react";

// Mock data for events
const MOCK_EVENTS = [
  {
    id: "1",
    title: "Environmental Law Symposium 2024",
    description: "Join leading experts in environmental law for a comprehensive discussion on climate change litigation, environmental justice, and emerging regulatory frameworks.",
    date: "2024-02-20",
    time: "9:00 AM - 5:00 PM",
    location: "Main Auditorium",
    type: "Symposium",
    category: "Environmental Law",
    organizer: "Environmental Law Society",
    capacity: 200,
    registered: 156,
    status: "published",
    featured: true,
    createdAt: "2024-01-15",
    tags: ["Climate Change", "Environmental Justice", "Regulation"]
  },
  {
    id: "2",
    title: "Constitutional Law Moot Court Competition",
    description: "Annual moot court competition focusing on constitutional law issues. Students will argue cases before a panel of distinguished judges.",
    date: "2024-02-25",
    time: "2:00 PM - 6:00 PM",
    location: "Courtroom A & B",
    type: "Competition",
    category: "Constitutional Law",
    organizer: "Moot Court Society",
    capacity: 100,
    registered: 45,
    status: "published",
    featured: false,
    createdAt: "2024-01-18",
    tags: ["Moot Court", "Student Competition", "Oral Advocacy"]
  },
  {
    id: "3",
    title: "Corporate Governance Workshop",
    description: "Interactive workshop on modern corporate governance practices, featuring case studies and practical exercises.",
    date: "2024-03-05",
    time: "10:00 AM - 3:00 PM",
    location: "Conference Room 201",
    type: "Workshop",
    category: "Corporate Law",
    organizer: "Business Law Association",
    capacity: 50,
    registered: 32,
    status: "draft",
    featured: false,
    createdAt: "2024-01-20",
    tags: ["Corporate Governance", "ESG", "Practical Skills"]
  }
];

export default function EventsManagementPage() {
  const { user, hasRole, canAccess } = useAuth();
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<typeof MOCK_EVENTS[0] | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Check permissions
  if (!canAccess("events", "view")) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600">
            You don't have permission to access event management.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || event.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateEvent = (eventData: any) => {
    const newEvent = {
      id: String(events.length + 1),
      ...eventData,
      registered: 0,
      createdAt: new Date().toISOString().split('T')[0],
      organizer: user?.name || "Unknown"
    };
    setEvents([...events, newEvent]);
    setIsCreateDialogOpen(false);
  };

  const handleEditEvent = (eventData: any) => {
    if (selectedEvent) {
      setEvents(events.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, ...eventData }
          : event
      ));
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Event Management</h1>
          <p className="text-slate-600 mt-2">
            Create, manage, and track events, symposiums, and workshops
          </p>
        </div>
        {canAccess("events", "create") && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Create a new event, symposium, workshop, or competition
                </DialogDescription>
              </DialogHeader>
              <ContentEditor
                contentType="event"
                onSave={handleCreateEvent}
                onPublish={handleCreateEvent}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Events</p>
                <p className="text-2xl font-bold text-slate-900">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Published</p>
                <p className="text-2xl font-bold text-slate-900">
                  {events.filter(e => e.status === "published").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Registrations</p>
                <p className="text-2xl font-bold text-slate-900">
                  {events.reduce((sum, event) => sum + event.registered, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Drafts</p>
                <p className="text-2xl font-bold text-slate-900">
                  {events.filter(e => e.status === "draft").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search events by title, description, or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {filteredEvents.length} events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{event.title}</p>
                        {event.featured && (
                          <Badge variant="secondary" className="text-xs">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{event.type} • {event.category}</p>
                      <p className="text-xs text-slate-400">by {event.organizer}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium">{event.date}</p>
                        <p className="text-xs text-slate-500">{event.time}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">
                        {event.registered} / {event.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full" 
                        style={{ width: `${(event.registered / event.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeColor(event.status)} className="text-xs">
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canAccess("events", "edit") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canAccess("events", "delete") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details and settings
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <ContentEditor
              contentType="event"
              initialContent={{
                title: selectedEvent.title,
                description: selectedEvent.description,
                category: selectedEvent.category,
                tags: selectedEvent.tags,
                status: selectedEvent.status,
                metadata: {
                  eventDate: selectedEvent.date,
                  location: selectedEvent.location,
                  capacity: selectedEvent.capacity,
                  organizer: selectedEvent.organizer,
                  type: selectedEvent.type
                }
              }}
              onSave={handleEditEvent}
              onPublish={handleEditEvent}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
