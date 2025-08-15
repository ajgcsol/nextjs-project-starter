"use client";

import { PublicLayout } from "@/components/PublicLayout";
import { ReadabilityWrapper } from "@/components/ReadabilityWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

// Mock data for events
const upcomingEvents = [
  {
    id: 1,
    title: "Environmental Law Symposium 2024",
    description: "Join leading experts in environmental law for a comprehensive discussion on climate change litigation, environmental justice, and emerging regulatory frameworks. This symposium will feature keynote speakers, panel discussions, and networking opportunities.",
    date: "2024-02-20",
    time: "9:00 AM - 5:00 PM",
    location: "Main Auditorium",
    type: "Symposium",
    category: "Environmental Law",
    organizer: "Environmental Law Society",
    capacity: 200,
    registered: 156,
    featured: true,
    tags: ["Climate Change", "Environmental Justice", "Regulation"]
  },
  {
    id: 2,
    title: "Constitutional Law Moot Court Competition",
    description: "Annual moot court competition focusing on constitutional law issues. Students will argue cases before a panel of distinguished judges and legal practitioners.",
    date: "2024-02-25",
    time: "2:00 PM - 6:00 PM",
    location: "Courtroom A & B",
    type: "Competition",
    category: "Constitutional Law",
    organizer: "Moot Court Society",
    capacity: 100,
    registered: 45,
    featured: false,
    tags: ["Moot Court", "Student Competition", "Oral Advocacy"]
  },
  {
    id: 3,
    title: "Corporate Governance Workshop",
    description: "Interactive workshop on modern corporate governance practices, featuring case studies and practical exercises for students and practitioners.",
    date: "2024-03-05",
    time: "10:00 AM - 3:00 PM",
    location: "Conference Room 201",
    type: "Workshop",
    category: "Corporate Law",
    organizer: "Business Law Association",
    capacity: 50,
    registered: 32,
    featured: false,
    tags: ["Corporate Governance", "ESG", "Practical Skills"]
  },
  {
    id: 4,
    title: "Immigration Law Clinic Information Session",
    description: "Learn about opportunities to participate in our immigration law clinic, providing legal services to underserved communities while gaining practical experience.",
    date: "2024-03-10",
    time: "12:00 PM - 1:30 PM",
    location: "Room 150",
    type: "Information Session",
    category: "Immigration Law",
    organizer: "Immigration Law Clinic",
    capacity: 75,
    registered: 23,
    featured: false,
    tags: ["Clinical Experience", "Pro Bono", "Immigration"]
  }
];

const pastEvents = [
  {
    id: 5,
    title: "Criminal Justice Reform Panel",
    description: "Discussion on recent developments in criminal justice reform initiatives and their impact on the legal system.",
    date: "2024-01-15",
    time: "3:00 PM - 5:00 PM",
    location: "Main Auditorium",
    type: "Panel Discussion",
    category: "Criminal Law",
    organizer: "Criminal Law Society",
    attendees: 180,
    recording: true
  },
  {
    id: 6,
    title: "Intellectual Property Law Seminar",
    description: "Comprehensive seminar on current issues in intellectual property law, including AI and copyright challenges.",
    date: "2024-01-08",
    time: "1:00 PM - 4:00 PM",
    location: "Conference Room 301",
    type: "Seminar",
    category: "Intellectual Property",
    organizer: "IP Law Association",
    attendees: 95,
    recording: true
  }
];

const eventTypes = ["All Types", "Symposium", "Workshop", "Competition", "Panel Discussion", "Seminar", "Information Session"];
const eventCategories = ["All Categories", "Environmental Law", "Constitutional Law", "Corporate Law", "Criminal Law", "Immigration Law", "Intellectual Property"];

export default function EventsPage() {
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const filteredEvents = upcomingEvents.filter(event => {
    const typeMatch = selectedType === "All Types" || event.type === selectedType;
    const categoryMatch = selectedCategory === "All Categories" || event.category === selectedCategory;
    return typeMatch && categoryMatch;
  });

  const featuredEvent = upcomingEvents.find(event => event.featured);

  return (
    <PublicLayout
      title="Events & Programs"
      description="Discover upcoming legal education events, symposiums, workshops, and advocacy programs."
    >
      <div className="py-8">
        <ReadabilityWrapper maxWidth="2xl">
          {/* Featured Event */}
          {featuredEvent && (
            <div className="mb-12">
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">Featured Event</Badge>
                    <Badge variant="outline">{featuredEvent.type}</Badge>
                    <Badge variant="outline">{featuredEvent.category}</Badge>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">
                    {featuredEvent.title}
                  </h2>
                  <p className="text-lg text-slate-700 mb-6 leading-relaxed">
                    {featuredEvent.description}
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Date & Time</h4>
                      <p className="text-slate-600">{featuredEvent.date}</p>
                      <p className="text-slate-600">{featuredEvent.time}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Location</h4>
                      <p className="text-slate-600">{featuredEvent.location}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Registration</h4>
                      <p className="text-slate-600">
                        {featuredEvent.registered} / {featuredEvent.capacity} registered
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(featuredEvent.registered / featuredEvent.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {featuredEvent.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button size="lg">Register Now</Button>
                    <Button variant="outline" size="lg">Add to Calendar</Button>
                    <Button variant="outline" size="lg">Share Event</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Event Tabs */}
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
              <TabsTrigger value="past">Past Events</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-8">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex-1 text-sm text-slate-600 flex items-center">
                  Showing {filteredEvents.length} upcoming events
                </div>
              </div>

              {/* Upcoming Events List */}
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <div className="md:flex">
                      <div className="md:w-1/4 bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-3xl font-bold text-slate-900 mb-1">
                          {new Date(event.date).getDate()}
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {event.time}
                        </div>
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        </div>
                      </div>
                      <div className="md:w-3/4 p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{event.category}</Badge>
                          <span className="text-sm text-slate-500">by {event.organizer}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-slate-600 mb-4 leading-relaxed">
                          {event.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-slate-500">
                            <p>{event.location}</p>
                            <p>{event.registered} / {event.capacity} registered</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {event.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm">Register</Button>
                          <Button variant="outline" size="sm">Details</Button>
                          <Button variant="outline" size="sm">Add to Calendar</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-8">
              <div className="space-y-6">
                {pastEvents.map((event) => (
                  <Card key={event.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <div className="md:flex">
                      <div className="md:w-1/4 bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-3xl font-bold text-slate-600 mb-1">
                          {new Date(event.date).getDate()}
                        </div>
                        <div className="text-sm text-slate-500 mb-2">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {event.time}
                        </div>
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        </div>
                      </div>
                      <div className="md:w-3/4 p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{event.category}</Badge>
                          <span className="text-sm text-slate-500">by {event.organizer}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-slate-600 mb-4 leading-relaxed">
                          {event.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-slate-500">
                            <p>{event.location}</p>
                            <p>{event.attendees} attendees</p>
                          </div>
                          {event.recording && (
                            <Badge variant="secondary" className="text-xs">Recording Available</Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {event.recording && (
                            <Button size="sm">Watch Recording</Button>
                          )}
                          <Button variant="outline" size="sm">Event Summary</Button>
                          <Button variant="outline" size="sm">Materials</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Event Submission */}
          <div className="mt-16 bg-slate-50 rounded-lg p-8 border">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Host an Event</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Faculty, student organizations, and advocacy groups can propose and host events through our platform. 
              We provide support for event planning, registration management, and promotional materials.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Event Types We Support</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Academic symposiums and conferences</li>
                  <li>• Student competitions and moot courts</li>
                  <li>• Professional development workshops</li>
                  <li>• Panel discussions and lectures</li>
                  <li>• Networking and social events</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">What We Provide</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Event registration system</li>
                  <li>• Promotional support</li>
                  <li>• Venue coordination</li>
                  <li>• Technical support</li>
                  <li>• Post-event materials hosting</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-4">
              <Button>Propose Event</Button>
              <Button variant="outline">Event Guidelines</Button>
            </div>
          </div>
        </ReadabilityWrapper>
      </div>
    </PublicLayout>
  );
}
