"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { msalConfig, loginRequest, roleMapping } from "@/lib/msalConfig";

export type UserRole = 
  | "admin" 
  | "faculty" 
  | "video_editor" 
  | "editor_in_chief" 
  | "editor" 
  | "reviewer" 
  | "approver"
  | "researcher"
  | "student"
  | "public";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  department?: string;
  permissions?: Permission[];
}

export interface Permission {
  resource: string;
  actions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  isAuthenticated: boolean;
  msalInstance?: PublicClientApplication;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demonstration
const MOCK_USERS: Record<string, User> = {
  "admin@law.edu": {
    id: "1",
    email: "admin@law.edu",
    name: "System Administrator",
    roles: ["admin"],
    permissions: [
      { resource: "*", actions: ["*"] } // Admin has all permissions
    ]
  },
  "professor@law.edu": {
    id: "2",
    email: "professor@law.edu",
    name: "Prof. Sarah Johnson",
    roles: ["faculty", "reviewer"],
    department: "Constitutional Law",
    permissions: [
      { resource: "course_content", actions: ["create", "edit", "delete", "publish"] },
      { resource: "law_review", actions: ["review", "comment"] },
      { resource: "videos", actions: ["upload", "edit"] }
    ]
  },
  "editor.chief@law.edu": {
    id: "3",
    email: "editor.chief@law.edu",
    name: "Emily Rodriguez",
    roles: ["editor_in_chief", "editor", "approver"],
    permissions: [
      { resource: "law_review", actions: ["*"] },
      { resource: "editorial_workflow", actions: ["*"] },
      { resource: "assignments", actions: ["*"] },
      { resource: "bluebook", actions: ["*"] },
      { resource: "journals", actions: ["*"] },
      { resource: "editorial", actions: ["*"] },
      { resource: "reviews", actions: ["*"] },
      { resource: "advocacy", actions: ["*"] }
    ]
  },
  "editor@law.edu": {
    id: "4",
    email: "editor@law.edu",
    name: "Michael Chen",
    roles: ["editor", "reviewer"],
    permissions: [
      { resource: "law_review", actions: ["create", "edit", "review", "comment"] },
      { resource: "editorial_workflow", actions: ["assign", "track"] },
      { resource: "assignments", actions: ["view", "edit"] },
      { resource: "bluebook", actions: ["view", "edit", "review"] },
      { resource: "journals", actions: ["view", "edit"] },
      { resource: "editorial", actions: ["view", "edit"] },
      { resource: "reviews", actions: ["view", "edit"] }
    ]
  },
  "video.editor@law.edu": {
    id: "5",
    email: "video.editor@law.edu",
    name: "James Wilson",
    roles: ["video_editor"],
    permissions: [
      { resource: "videos", actions: ["upload", "edit", "transcode", "publish"] },
      { resource: "video_library", actions: ["manage"] }
    ]
  },
  "reviewer@law.edu": {
    id: "6",
    email: "reviewer@law.edu",
    name: "Dr. Lisa Martinez",
    roles: ["reviewer"],
    permissions: [
      { resource: "law_review", actions: ["review", "comment", "recommend"] },
      { resource: "reviews", actions: ["view", "edit"] },
      { resource: "bluebook", actions: ["view", "review"] },
      { resource: "editorial", actions: ["view"] }
    ]
  },
  "student@law.edu": {
    id: "7",
    email: "student@law.edu",
    name: "John Doe",
    roles: ["student"],
    permissions: [
      { resource: "assignments", actions: ["submit", "view", "edit"] },
      { resource: "law_review", actions: ["submit"] },
      { resource: "bluebook", actions: ["view", "edit"] }
    ]
  },
  "researcher@law.edu": {
    id: "8",
    email: "researcher@law.edu",
    name: "Dr. Patricia Thompson",
    roles: ["researcher", "reviewer"],
    permissions: [
      { resource: "citations", actions: ["validate", "research", "update"] },
      { resource: "law_review", actions: ["review", "comment"] },
      { resource: "permalinks", actions: ["create", "validate", "update"] }
    ]
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | undefined>(undefined);

  useEffect(() => {
    // Initialize MSAL
    const initializeMsal = async () => {
      const msal = new PublicClientApplication(msalConfig);
      await msal.initialize();
      setMsalInstance(msal);
      
      // Check for existing MSAL session
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        const msUser = await createUserFromMsalAccount(account);
        setUser(msUser);
      }
    };

    // Check for stored session (local auth)
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      initializeMsal();
    }
  }, []);

  // Helper function to create user from MSAL account
  const createUserFromMsalAccount = async (account: AccountInfo): Promise<User> => {
    const email = account.username;
    const name = account.name || email;
    
    // Determine roles based on email or groups
    let roles: UserRole[] = roleMapping.default as UserRole[];
    if (roleMapping.users[email as keyof typeof roleMapping.users]) {
      roles = roleMapping.users[email as keyof typeof roleMapping.users] as UserRole[];
    }
    // In a real app, you would also check Azure AD groups here
    
    return {
      id: account.homeAccountId,
      email,
      name,
      roles,
      permissions: getPermissionsForRoles(roles)
    };
  };

  // Helper function to get permissions for roles
  const getPermissionsForRoles = (roles: UserRole[]): Permission[] => {
    const permissions: Permission[] = [];
    roles.forEach(role => {
      switch (role) {
        case "admin":
          permissions.push({ resource: "*", actions: ["*"] });
          break;
        case "faculty":
          permissions.push(
            { resource: "course_content", actions: ["create", "edit", "delete", "publish"] },
            { resource: "assignments", actions: ["create", "edit", "grade"] },
            { resource: "videos", actions: ["upload", "edit"] }
          );
          break;
        case "editor_in_chief":
          permissions.push({ resource: "law_review", actions: ["*"] });
          break;
        // Add more role permissions as needed
      }
    });
    return permissions;
  };

  const login = async (email: string, password: string) => {
    // Mock authentication - in production, this would call an API
    const mockUser = MOCK_USERS[email];
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const loginWithMicrosoft = async () => {
    if (!msalInstance) {
      throw new Error("MSAL not initialized");
    }

    try {
      const response = await msalInstance.loginPopup(loginRequest);
      if (response.account) {
        const msUser = await createUserFromMsalAccount(response.account);
        setUser(msUser);
        // Don't store in localStorage for MSAL users - MSAL handles this
      }
    } catch (error) {
      console.error("Microsoft login failed:", error);
      throw new Error("Microsoft authentication failed");
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("currentUser");
    
    // If using MSAL, also logout from Microsoft
    if (msalInstance && msalInstance.getAllAccounts().length > 0) {
      try {
        await msalInstance.logoutPopup();
      } catch (error) {
        console.error("Microsoft logout failed:", error);
      }
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const hasAllRoles = (roles: UserRole[]): boolean => {
    return roles.every(role => hasRole(role));
  };

  const canAccess = (resource: string, action: string): boolean => {
    if (!user) return false;
    
    // Admin can access everything
    if (hasRole("admin")) return true;
    
    // Check specific permissions
    return user.permissions?.some(permission => {
      const resourceMatch = permission.resource === "*" || permission.resource === resource;
      const actionMatch = permission.actions.includes("*") || permission.actions.includes(action);
      return resourceMatch && actionMatch;
    }) || false;
  };

  const value: AuthContextType = {
    user,
    login,
    loginWithMicrosoft,
    logout,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccess,
    isAuthenticated: !!user,
    msalInstance
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Role-based permission helpers
export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageRoles: true,
    canPublishContent: true,
    canDeleteContent: true,
    canAccessAnalytics: true,
    canManageSystem: true
  },
  faculty: {
    canCreateCourseContent: true,
    canPublishCourseContent: true,
    canUploadVideos: true,
    canCreateAssignments: true,
    canGradeAssignments: true,
    canReviewArticles: true
  },
  video_editor: {
    canUploadVideos: true,
    canEditVideos: true,
    canManageVideoLibrary: true,
    canTranscodeVideos: true,
    canPublishVideos: true
  },
  editor_in_chief: {
    canManageEditorialWorkflow: true,
    canAssignEditors: true,
    canApproveArticles: true,
    canRejectArticles: true,
    canPublishArticles: true,
    canManageReviewProcess: true
  },
  editor: {
    canEditArticles: true,
    canReviewArticles: true,
    canCommentOnArticles: true,
    canAssignReviewers: true,
    canTrackSubmissions: true
  },
  reviewer: {
    canReviewArticles: true,
    canCommentOnArticles: true,
    canRecommendArticles: true,
    canAccessReviewQueue: true
  },
  approver: {
    canApproveArticles: true,
    canRejectArticles: true,
    canRequestRevisions: true,
    canFinalizePublishing: true
  },
  researcher: {
    canValidateCitations: true,
    canResearchSources: true,
    canUpdatePermalinks: true,
    canAccessDatabases: true,
    canManageResearchTasks: true,
    canValidateBluebook: true
  },
  student: {
    canSubmitAssignments: true,
    canSubmitArticles: true,
    canViewGrades: true,
    canAccessCourseContent: true
  },
  public: {
    canViewPublicContent: true,
    canSearchContent: true
  }
};