"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, UserPlus } from "lucide-react";

interface WorkflowAssignment {
  id: string;
  title: string;
  type: 'editorial' | 'bluebook';
  assignee: string;
  section: string;
  description: string;
  dueDate: string;
}

export default function NewArticlePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [articleData, setArticleData] = useState({
    title: "",
    journal: "",
    authors: [""],
    abstract: "",
    category: "",
    keywords: "",
  });

  const [assignments, setAssignments] = useState<WorkflowAssignment[]>([]);

  // Mock available users for assignment
  const availableUsers = [
    { id: "student1", name: "John Doe", email: "student@law.edu", roles: ["student"] },
    { id: "student2", name: "Jane Smith", email: "jane@law.edu", roles: ["student"] },
    { id: "editor1", name: "Michael Chen", email: "editor@law.edu", roles: ["editor"] },
    { id: "reviewer1", name: "Dr. Lisa Martinez", email: "reviewer@law.edu", roles: ["reviewer"] },
  ];

  const addAuthor = () => {
    setArticleData(prev => ({
      ...prev,
      authors: [...prev.authors, ""]
    }));
  };

  const removeAuthor = (index: number) => {
    setArticleData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }));
  };

  const updateAuthor = (index: number, value: string) => {
    setArticleData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) => i === index ? value : author)
    }));
  };

  const addAssignment = () => {
    const newAssignment: WorkflowAssignment = {
      id: Date.now().toString(),
      title: "",
      type: "editorial",
      assignee: "",
      section: "",
      description: "",
      dueDate: ""
    };
    setAssignments(prev => [...prev, newAssignment]);
  };

  const removeAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const updateAssignment = (id: string, field: keyof WorkflowAssignment, value: string) => {
    setAssignments(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate content ID (in real app, this would be done on backend)
    const contentId = `sha256:${Date.now().toString(36)}${Math.random().toString(36)}`;
    
    // Mock API call to create article
    console.log("Creating article:", {
      ...articleData,
      assignments,
      contentId,
      createdBy: user?.id,
      createdAt: new Date().toISOString()
    });

    // Redirect to article management or assignments page
    router.push("/dashboard/law-review");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create New Article</h1>
          <p className="text-slate-600 mt-2">
            Set up a new article with editorial and citation workflow assignments
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Article Basic Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Article Information</CardTitle>
            <CardDescription>Basic details about the article</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Article Title *</Label>
                <Input
                  id="title"
                  value={articleData.title}
                  onChange={(e) => setArticleData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter article title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="journal">Journal *</Label>
                <Select
                  value={articleData.journal}
                  onValueChange={(value) => setArticleData(prev => ({ ...prev, journal: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select journal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constitutional-law-review">Constitutional Law Review</SelectItem>
                    <SelectItem value="environmental-justice">Environmental Justice Quarterly</SelectItem>
                    <SelectItem value="trade-law-journal">International Trade Law Journal</SelectItem>
                    <SelectItem value="digital-privacy-law">Digital Privacy & Technology Law</SelectItem>
                    <SelectItem value="corporate-governance">Corporate Governance Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Authors *</Label>
              {articleData.authors.map((author, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    value={author}
                    onChange={(e) => updateAuthor(index, e.target.value)}
                    placeholder="Author name"
                    required={index === 0}
                  />
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAuthor(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAuthor}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Author
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={articleData.category}
                  onValueChange={(value) => setArticleData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constitutional">Constitutional Law</SelectItem>
                    <SelectItem value="environmental">Environmental Law</SelectItem>
                    <SelectItem value="corporate">Corporate Law</SelectItem>
                    <SelectItem value="criminal">Criminal Law</SelectItem>
                    <SelectItem value="international">International Law</SelectItem>
                    <SelectItem value="technology">Technology Law</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={articleData.keywords}
                  onChange={(e) => setArticleData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="Comma-separated keywords"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                value={articleData.abstract}
                onChange={(e) => setArticleData(prev => ({ ...prev, abstract: e.target.value }))}
                placeholder="Brief summary of the article"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Workflow Assignments */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflow Assignments</CardTitle>
                <CardDescription>Assign sections to editors and citation reviewers</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addAssignment}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add Assignment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No assignments created yet</p>
                <p className="text-sm">Add assignments to distribute work among team members</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          assignment.type === 'bluebook' ? "text-purple-600 border-purple-200" : "text-blue-600 border-blue-200"
                        }>
                          {assignment.type === 'bluebook' ? 'Blue Book' : 'Editorial'}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Assignment Title *</Label>
                        <Input
                          value={assignment.title}
                          onChange={(e) => updateAssignment(assignment.id, 'title', e.target.value)}
                          placeholder="e.g., Introduction & Background"
                          required
                        />
                      </div>
                      <div>
                        <Label>Workflow Type *</Label>
                        <Select
                          value={assignment.type}
                          onValueChange={(value: 'editorial' | 'bluebook') => 
                            updateAssignment(assignment.id, 'type', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editorial">Editorial Review</SelectItem>
                            <SelectItem value="bluebook">Blue Book Citations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Assign to *</Label>
                        <Select
                          value={assignment.assignee}
                          onValueChange={(value) => updateAssignment(assignment.id, 'assignee', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.email}>
                                {user.name} ({user.roles.join(', ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={assignment.dueDate}
                          onChange={(e) => updateAssignment(assignment.id, 'dueDate', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Section/Description</Label>
                      <Textarea
                        value={assignment.description}
                        onChange={(e) => updateAssignment(assignment.id, 'description', e.target.value)}
                        placeholder={assignment.type === 'bluebook' ? 
                          "e.g., Review citations 1-25, verify Blue Book format compliance" :
                          "e.g., Edit introduction section, fact-check claims, improve readability"
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!articleData.title || !articleData.journal}>
            Create Article & Assignments
          </Button>
        </div>
      </form>
    </div>
  );
}