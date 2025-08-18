"use client";

import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  UserCheck,
  UserX,
  Mail,
  Key
} from "lucide-react";

// Mock user data
const MOCK_USERS = [
  {
    id: "1",
    email: "admin@law.edu",
    name: "System Administrator",
    roles: ["admin"] as UserRole[],
    status: "active",
    department: "IT",
    createdAt: "2024-01-01",
    lastLogin: "2024-01-15"
  },
  {
    id: "2",
    email: "professor@law.edu",
    name: "Prof. Sarah Johnson",
    roles: ["faculty", "reviewer"] as UserRole[],
    status: "active",
    department: "Constitutional Law",
    createdAt: "2024-01-05",
    lastLogin: "2024-01-14"
  },
  {
    id: "3",
    email: "editor.chief@law.edu",
    name: "Emily Rodriguez",
    roles: ["editor_in_chief", "editor", "approver"] as UserRole[],
    status: "active",
    department: "Law Review",
    createdAt: "2024-01-10",
    lastLogin: "2024-01-15"
  },
  {
    id: "4",
    email: "researcher@law.edu",
    name: "Dr. Patricia Thompson",
    roles: ["researcher", "reviewer"] as UserRole[],
    status: "active",
    department: "Research",
    createdAt: "2024-01-12",
    lastLogin: "2024-01-15"
  }
];

const ALL_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrator", description: "Full system access" },
  { value: "faculty", label: "Faculty", description: "Create course content, grade assignments" },
  { value: "video_editor", label: "Video Editor", description: "Manage video content" },
  { value: "editor_in_chief", label: "Editor-in-Chief", description: "Manage editorial workflow" },
  { value: "editor", label: "Editor", description: "Edit and review articles" },
  { value: "reviewer", label: "Reviewer", description: "Review and comment on submissions" },
  { value: "approver", label: "Approver", description: "Approve content for publication" },
  { value: "researcher", label: "Researcher", description: "Validate citations and sources" },
  { value: "student", label: "Student", description: "Submit assignments and articles" }
];

export default function UserManagementPage() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[0] | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  
  // Form state for new/edit user
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    department: "",
    roles: [] as UserRole[],
    sendInvite: true
  });
  
  // Check if current user can manage users
  if (!hasRole("admin")) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600">
            You don't have permission to access user management.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };
  
  const handleEditUser = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      department: user.department,
      roles: user.roles,
      sendInvite: false
    });
    setIsEditDialogOpen(true);
  };
  
  const handleSaveUser = () => {
    if (selectedUser) {
      // Update existing user
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, ...formData }
          : u
      ));
    } else {
      // Add new user
      const newUser = {
        id: String(users.length + 1),
        ...formData,
        status: "pending" as const,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: "-"
      };
      setUsers(prev => [...prev, newUser]);
    }
    
    // Reset form
    setIsEditDialogOpen(false);
    setIsNewUserDialogOpen(false);
    setSelectedUser(null);
    setFormData({
      email: "",
      name: "",
      department: "",
      roles: [],
      sendInvite: true
    });
  };
  
  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };
  
  const getRoleBadgeColor = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
    const colors: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      faculty: "default",
      video_editor: "secondary",
      editor_in_chief: "default",
      editor: "secondary",
      reviewer: "outline",
      approver: "default",
      researcher: "secondary",
      student: "outline",
      public: "outline"
    };
    return colors[role] || "outline";
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600 mt-2">
            Manage users, assign roles, and control permissions
          </p>
        </div>
        <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account and assign roles
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@law.edu"
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Constitutional Law"
                />
              </div>
              <div>
                <Label>Roles</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {ALL_ROLES.map(role => (
                    <div key={role.value} className="flex items-start space-x-2">
                      <Checkbox
                        id={role.value}
                        checked={formData.roles.includes(role.value)}
                        onCheckedChange={() => handleRoleToggle(role.value)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={role.value} className="font-medium">
                          {role.label}
                        </Label>
                        <p className="text-xs text-slate-500">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendInvite"
                  checked={formData.sendInvite}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, sendInvite: checked as boolean })
                  }
                />
                <Label htmlFor="sendInvite">
                  Send invitation email to user
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUser}>
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Export Users
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} users found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => (
                        <Badge 
                          key={role} 
                          variant={getRoleBadgeColor(role)}
                          className="text-xs"
                        >
                          {role.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.status === "active" ? (
                        <UserCheck className="h-3 w-3 mr-1" />
                      ) : (
                        <UserX className="h-3 w-3 mr-1" />
                      )}
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ALL_ROLES.slice(0, 5).map(role => {
                const count = users.filter(u => u.roles.includes(role.value)).length;
                return (
                  <div key={role.value} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{role.label}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">User Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Users</span>
                <Badge variant="default">
                  {users.filter(u => u.status === "active").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Invites</span>
                <Badge variant="secondary">
                  {users.filter(u => u.status === "pending").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Users</span>
                <Badge variant="outline">{users.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Bulk Invite
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Reset All Passwords
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Audit Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}