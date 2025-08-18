export type ArticleStatus = 
  | "draft"
  | "submitted"
  | "in_review"
  | "peer_review"
  | "revisions_requested"
  | "revised"
  | "approved"
  | "copyediting"
  | "final_review"
  | "published"
  | "rejected";

export interface EditorialWorkflowStep {
  status: ArticleStatus;
  name: string;
  description: string;
  requiredRoles: string[];
  actions: WorkflowAction[];
  nextSteps: ArticleStatus[];
}

export interface WorkflowAction {
  name: string;
  label: string;
  requiredRole: string[];
  resultStatus: ArticleStatus;
  requiresComment?: boolean;
}

export interface ArticleReview {
  id: string;
  articleId: string;
  reviewerId: string;
  reviewerName: string;
  status: "pending" | "in_progress" | "completed";
  recommendation: "accept" | "revisions" | "reject" | null;
  comments: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface EditorialComment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userRole: string;
  comment: string;
  createdAt: Date;
  isInternal: boolean; // Internal comments not visible to authors
}

export const EDITORIAL_WORKFLOW: Record<ArticleStatus, EditorialWorkflowStep> = {
  draft: {
    status: "draft",
    name: "Draft",
    description: "Article is being written by the author",
    requiredRoles: ["student", "faculty", "editor"],
    actions: [
      {
        name: "submit",
        label: "Submit for Review",
        requiredRole: ["student", "faculty", "editor"],
        resultStatus: "submitted"
      }
    ],
    nextSteps: ["submitted"]
  },
  submitted: {
    status: "submitted",
    name: "Submitted",
    description: "Article submitted and awaiting initial review",
    requiredRoles: ["editor", "editor_in_chief"],
    actions: [
      {
        name: "accept_for_review",
        label: "Accept for Review",
        requiredRole: ["editor", "editor_in_chief"],
        resultStatus: "in_review"
      },
      {
        name: "reject",
        label: "Reject Submission",
        requiredRole: ["editor_in_chief"],
        resultStatus: "rejected",
        requiresComment: true
      }
    ],
    nextSteps: ["in_review", "rejected"]
  },
  in_review: {
    status: "in_review",
    name: "In Review",
    description: "Article is being reviewed by editors",
    requiredRoles: ["editor", "editor_in_chief"],
    actions: [
      {
        name: "send_to_peer_review",
        label: "Send to Peer Review",
        requiredRole: ["editor", "editor_in_chief"],
        resultStatus: "peer_review"
      },
      {
        name: "request_revisions",
        label: "Request Revisions",
        requiredRole: ["editor", "editor_in_chief"],
        resultStatus: "revisions_requested",
        requiresComment: true
      },
      {
        name: "reject",
        label: "Reject Article",
        requiredRole: ["editor_in_chief"],
        resultStatus: "rejected",
        requiresComment: true
      }
    ],
    nextSteps: ["peer_review", "revisions_requested", "rejected"]
  },
  peer_review: {
    status: "peer_review",
    name: "Peer Review",
    description: "Article is being reviewed by peer reviewers",
    requiredRoles: ["reviewer"],
    actions: [
      {
        name: "complete_review",
        label: "Complete Review",
        requiredRole: ["reviewer"],
        resultStatus: "in_review",
        requiresComment: true
      }
    ],
    nextSteps: ["in_review", "approved", "revisions_requested", "rejected"]
  },
  revisions_requested: {
    status: "revisions_requested",
    name: "Revisions Requested",
    description: "Author needs to make revisions",
    requiredRoles: ["student", "faculty", "editor"],
    actions: [
      {
        name: "submit_revisions",
        label: "Submit Revised Version",
        requiredRole: ["student", "faculty", "editor"],
        resultStatus: "revised"
      }
    ],
    nextSteps: ["revised"]
  },
  revised: {
    status: "revised",
    name: "Revised",
    description: "Revised article submitted for re-review",
    requiredRoles: ["editor", "editor_in_chief"],
    actions: [
      {
        name: "approve",
        label: "Approve for Publication",
        requiredRole: ["editor_in_chief", "approver"],
        resultStatus: "approved"
      },
      {
        name: "request_more_revisions",
        label: "Request More Revisions",
        requiredRole: ["editor", "editor_in_chief"],
        resultStatus: "revisions_requested",
        requiresComment: true
      },
      {
        name: "reject",
        label: "Reject Article",
        requiredRole: ["editor_in_chief"],
        resultStatus: "rejected",
        requiresComment: true
      }
    ],
    nextSteps: ["approved", "revisions_requested", "rejected"]
  },
  approved: {
    status: "approved",
    name: "Approved",
    description: "Article approved for publication",
    requiredRoles: ["editor", "editor_in_chief"],
    actions: [
      {
        name: "send_to_copyediting",
        label: "Send to Copyediting",
        requiredRole: ["editor", "editor_in_chief"],
        resultStatus: "copyediting"
      }
    ],
    nextSteps: ["copyediting"]
  },
  copyediting: {
    status: "copyediting",
    name: "Copyediting",
    description: "Article is being copyedited",
    requiredRoles: ["editor"],
    actions: [
      {
        name: "complete_copyediting",
        label: "Complete Copyediting",
        requiredRole: ["editor"],
        resultStatus: "final_review"
      }
    ],
    nextSteps: ["final_review"]
  },
  final_review: {
    status: "final_review",
    name: "Final Review",
    description: "Final review before publication",
    requiredRoles: ["editor_in_chief", "approver"],
    actions: [
      {
        name: "publish",
        label: "Publish Article",
        requiredRole: ["editor_in_chief", "approver"],
        resultStatus: "published"
      },
      {
        name: "request_changes",
        label: "Request Final Changes",
        requiredRole: ["editor_in_chief"],
        resultStatus: "copyediting",
        requiresComment: true
      }
    ],
    nextSteps: ["published", "copyediting"]
  },
  published: {
    status: "published",
    name: "Published",
    description: "Article is published and publicly available",
    requiredRoles: [],
    actions: [],
    nextSteps: []
  },
  rejected: {
    status: "rejected",
    name: "Rejected",
    description: "Article has been rejected",
    requiredRoles: [],
    actions: [],
    nextSteps: []
  }
};

export function getAvailableActions(status: ArticleStatus, userRoles: string[]): WorkflowAction[] {
  const step = EDITORIAL_WORKFLOW[status];
  if (!step) return [];
  
  return step.actions.filter(action => 
    action.requiredRole.some(role => userRoles.includes(role))
  );
}

export function canTransition(
  currentStatus: ArticleStatus, 
  targetStatus: ArticleStatus, 
  userRoles: string[]
): boolean {
  const step = EDITORIAL_WORKFLOW[currentStatus];
  if (!step) return false;
  
  // Check if target status is in allowed next steps
  if (!step.nextSteps.includes(targetStatus)) return false;
  
  // Check if user has required role for any action that leads to target status
  const validAction = step.actions.find(action => 
    action.resultStatus === targetStatus &&
    action.requiredRole.some(role => userRoles.includes(role))
  );
  
  return !!validAction;
}

export function getStatusColor(status: ArticleStatus): string {
  const colors: Record<ArticleStatus, string> = {
    draft: "gray",
    submitted: "blue",
    in_review: "yellow",
    peer_review: "purple",
    revisions_requested: "orange",
    revised: "indigo",
    approved: "green",
    copyediting: "cyan",
    final_review: "teal",
    published: "emerald",
    rejected: "red"
  };
  
  return colors[status] || "gray";
}

export function getStatusIcon(status: ArticleStatus): string {
  const icons: Record<ArticleStatus, string> = {
    draft: "📝",
    submitted: "📤",
    in_review: "👀",
    peer_review: "👥",
    revisions_requested: "✏️",
    revised: "🔄",
    approved: "✅",
    copyediting: "📖",
    final_review: "🔍",
    published: "🎉",
    rejected: "❌"
  };
  
  return icons[status] || "📄";
}