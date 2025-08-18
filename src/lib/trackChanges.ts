export interface Change {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: Date;
  type: "insertion" | "deletion" | "format" | "comment" | "citation";
  content: string;
  originalContent?: string;
  position: {
    start: number;
    end: number;
    paragraph?: number;
    line?: number;
  };
  status: "pending" | "accepted" | "rejected" | "merged";
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComment?: string;
  metadata?: {
    citationId?: string;
    bluebookFormat?: string;
    sourceUrl?: string;
  };
}

export interface ChangeApproval {
  changeId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: "accept" | "reject" | "request_revision";
  comment?: string;
  timestamp: Date;
}

export interface TrackChangesDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  changes: Change[];
  approvals: ChangeApproval[];
  lockedBy?: string;
  lockedAt?: Date;
  lastModified: Date;
  collaborators: {
    userId: string;
    userName: string;
    role: string;
    permissions: ("view" | "comment" | "edit" | "approve")[];
  }[];
}

export class TrackChangesManager {
  private document: TrackChangesDocument;
  private changeHistory: Change[] = [];
  
  constructor(document: TrackChangesDocument) {
    this.document = document;
    this.changeHistory = [...document.changes];
  }
  
  // Add a new change
  addChange(change: Omit<Change, "id" | "timestamp" | "status">): Change {
    const newChange: Change = {
      ...change,
      id: this.generateChangeId(),
      timestamp: new Date(),
      status: "pending"
    };
    
    this.document.changes.push(newChange);
    this.changeHistory.push(newChange);
    this.document.lastModified = new Date();
    this.document.version++;
    
    return newChange;
  }
  
  // Apply an accepted change to the document
  applyChange(changeId: string): boolean {
    const change = this.document.changes.find(c => c.id === changeId);
    if (!change || change.status !== "accepted") return false;
    
    switch (change.type) {
      case "insertion":
        this.insertText(change.position.start, change.content);
        break;
      case "deletion":
        this.deleteText(change.position.start, change.position.end);
        break;
      case "format":
        // Apply formatting changes
        break;
      case "citation":
        // Apply citation formatting
        this.applyCitation(change);
        break;
    }
    
    change.status = "merged";
    return true;
  }
  
  // Accept or reject a change
  reviewChange(
    changeId: string, 
    reviewerId: string, 
    reviewerName: string,
    reviewerRole: string,
    decision: "accept" | "reject",
    comment?: string
  ): ChangeApproval {
    const change = this.document.changes.find(c => c.id === changeId);
    if (!change) throw new Error("Change not found");
    
    change.status = decision === "accept" ? "accepted" : "rejected";
    change.reviewedBy = reviewerId;
    change.reviewedAt = new Date();
    change.reviewComment = comment;
    
    const approval: ChangeApproval = {
      changeId,
      approverId: reviewerId,
      approverName: reviewerName,
      approverRole: reviewerRole,
      decision,
      comment,
      timestamp: new Date()
    };
    
    this.document.approvals.push(approval);
    
    if (decision === "accept") {
      this.applyChange(changeId);
    }
    
    return approval;
  }
  
  // Get all pending changes for review
  getPendingChanges(): Change[] {
    return this.document.changes.filter(c => c.status === "pending");
  }
  
  // Get changes by user
  getChangesByUser(userId: string): Change[] {
    return this.document.changes.filter(c => c.userId === userId);
  }
  
  // Compare two versions
  compareVersions(fromVersion: number, toVersion: number): Change[] {
    return this.changeHistory.filter(c => {
      // Filter changes between versions
      return true; // Implement version comparison logic
    });
  }
  
  // Merge all accepted changes
  mergeAcceptedChanges(): string {
    const acceptedChanges = this.document.changes
      .filter(c => c.status === "accepted")
      .sort((a, b) => a.position.start - b.position.start);
    
    let mergedContent = this.document.content;
    let offset = 0;
    
    for (const change of acceptedChanges) {
      if (change.type === "insertion") {
        const position = change.position.start + offset;
        mergedContent = 
          mergedContent.slice(0, position) + 
          change.content + 
          mergedContent.slice(position);
        offset += change.content.length;
      } else if (change.type === "deletion") {
        const start = change.position.start + offset;
        const end = change.position.end + offset;
        mergedContent = 
          mergedContent.slice(0, start) + 
          mergedContent.slice(end);
        offset -= (end - start);
      }
    }
    
    return mergedContent;
  }
  
  // Lock document for editing
  lockDocument(userId: string): boolean {
    if (this.document.lockedBy && this.document.lockedBy !== userId) {
      return false;
    }
    
    this.document.lockedBy = userId;
    this.document.lockedAt = new Date();
    return true;
  }
  
  // Unlock document
  unlockDocument(userId: string): boolean {
    if (this.document.lockedBy !== userId) {
      return false;
    }
    
    this.document.lockedBy = undefined;
    this.document.lockedAt = undefined;
    return true;
  }
  
  // Check if user can approve changes
  canApprove(userId: string): boolean {
    const collaborator = this.document.collaborators.find(c => c.userId === userId);
    return collaborator?.permissions.includes("approve") || false;
  }
  
  // Private helper methods
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private insertText(position: number, text: string): void {
    this.document.content = 
      this.document.content.slice(0, position) + 
      text + 
      this.document.content.slice(position);
  }
  
  private deleteText(start: number, end: number): void {
    this.document.content = 
      this.document.content.slice(0, start) + 
      this.document.content.slice(end);
  }
  
  private applyCitation(change: Change): void {
    if (change.metadata?.bluebookFormat) {
      // Apply Bluebook formatting to citation
      const formattedCitation = this.formatBluebookCitation(
        change.content,
        change.metadata.bluebookFormat
      );
      this.insertText(change.position.start, formattedCitation);
    }
  }
  
  private formatBluebookCitation(text: string, format: string): string {
    // Implement Bluebook formatting logic
    return `[${text}]`; // Placeholder
  }
}

// Export helper functions for UI
export function getChangeTypeIcon(type: Change["type"]): string {
  const icons: Record<Change["type"], string> = {
    insertion: "➕",
    deletion: "➖",
    format: "🎨",
    comment: "💬",
    citation: "📚"
  };
  return icons[type];
}

export function getChangeTypeColor(type: Change["type"]): string {
  const colors: Record<Change["type"], string> = {
    insertion: "green",
    deletion: "red",
    format: "blue",
    comment: "yellow",
    citation: "purple"
  };
  return colors[type];
}

export function getChangeStatusBadge(status: Change["status"]): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "pending":
      return { label: "Pending Review", variant: "secondary" };
    case "accepted":
      return { label: "Accepted", variant: "default" };
    case "rejected":
      return { label: "Rejected", variant: "destructive" };
    case "merged":
      return { label: "Merged", variant: "outline" };
    default:
      return { label: "Unknown", variant: "outline" };
  }
}