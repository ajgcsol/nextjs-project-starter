export interface ArticleSection {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  assignedEditor?: string;
  assignedReviewer?: string;
  status: 'draft' | 'under_review' | 'reviewed' | 'approved' | 'needs_revision';
  comments: Comment[];
  bluebookStatus: 'pending' | 'checking' | 'approved' | 'needs_fix';
  plagiarismScore?: number;
  plagiarismStatus: 'pending' | 'checking' | 'clean' | 'flagged';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'suggestion' | 'correction' | 'bluebook' | 'plagiarism';
  resolved: boolean;
}

export interface TrackChange {
  id: string;
  type: 'insert' | 'delete' | 'modify';
  content: string;
  originalContent?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  accepted: boolean | null; // null = pending, true = accepted, false = rejected
  position: {
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
  };
}

export interface Article {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  content: string;
  sections: ArticleSection[];
  trackChanges: TrackChange[];
  status: 'draft' | 'submitted' | 'under_review' | 'revision_requested' | 'approved' | 'published';
  currentVersion: number;
  versions: ArticleVersion[];
  workflow: WorkflowStep[];
  attachments: FileAttachment[];
  bluebookCitations: BluebookCitation[];
  plagiarismReport?: PlagiarismReport;
}

export interface ArticleVersion {
  version: number;
  content: string;
  timestamp: Date;
  userId: string;
  userName: string;
  changes: string;
}

export interface WorkflowStep {
  id: string;
  step: 'submission' | 'initial_review' | 'plagiarism_check' | 'bluebook_check' | 'section_assignment' | 'editing' | 'review' | 'approval' | 'revision_request' | 'final_approval';
  assignedTo?: string;
  assignedToName?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

export interface BluebookCitation {
  id: string;
  originalText: string;
  suggestedFormat: string;
  isValid: boolean;
  permalink?: string;
  source: string;
  position: {
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
  };
}

export interface PlagiarismReport {
  id: string;
  overallScore: number;
  sources: PlagiarismSource[];
  generatedAt: Date;
  checkedBy: string;
}

export interface PlagiarismSource {
  url: string;
  title: string;
  similarity: number;
  matchedText: string;
  position: {
    startLine: number;
    endLine: number;
  };
}

export interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  year: string;
  professorId: string;
  professorName: string;
  description: string;
  students: CourseStudent[];
  assignments: CourseAssignment[];
}

export interface CourseStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: Date;
}

export interface CourseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  maxPoints: number;
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  attachments: FileAttachment[];
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
}

// Editorial Workflow Functions
export class EditorialWorkflowManager {
  
  static async checkPlagiarism(content: string): Promise<PlagiarismReport> {
    // This would integrate with Ollama/CodeLlama for plagiarism detection
    const response = await fetch('/api/plagiarism/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    return response.json();
  }

  static async checkBluebookCitations(content: string): Promise<BluebookCitation[]> {
    // This would integrate with Ollama for Bluebook citation checking
    const response = await fetch('/api/bluebook/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    return response.json();
  }

  static async createPermalinks(citations: BluebookCitation[]): Promise<BluebookCitation[]> {
    // Create shortened permalinks for citations
    const response = await fetch('/api/bluebook/permalinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citations })
    });
    
    return response.json();
  }

  static async assignSectionToEditor(articleId: string, sectionId: string, editorId: string): Promise<void> {
    await fetch('/api/editorial/assign-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, sectionId, editorId })
    });
  }

  static async submitForReview(articleId: string, reviewerId: string): Promise<void> {
    await fetch('/api/editorial/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, reviewerId })
    });
  }

  static async approveArticle(articleId: string, approverId: string): Promise<void> {
    await fetch('/api/editorial/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, approverId })
    });
  }

  static async requestRevision(articleId: string, requesterId: string, notes: string): Promise<void> {
    await fetch('/api/editorial/request-revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, requesterId, notes })
    });
  }

  static async addTrackChange(articleId: string, change: Omit<TrackChange, 'id'>): Promise<void> {
    await fetch('/api/editorial/track-changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, change })
    });
  }

  static async acceptTrackChange(articleId: string, changeId: string): Promise<void> {
    await fetch('/api/editorial/accept-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, changeId })
    });
  }

  static async rejectTrackChange(articleId: string, changeId: string): Promise<void> {
    await fetch('/api/editorial/reject-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, changeId })
    });
  }
}

// Course Management Functions
export class CourseManager {
  
  static async createCourse(course: Omit<Course, 'id' | 'students' | 'assignments'>): Promise<Course> {
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    });
    
    return response.json();
  }

  static async enrollStudent(courseId: string, studentId: string): Promise<void> {
    await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, studentId })
    });
  }

  static async createAssignment(courseId: string, assignment: Omit<CourseAssignment, 'id' | 'submissions'>): Promise<CourseAssignment> {
    const response = await fetch('/api/courses/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, assignment })
    });
    
    return response.json();
  }

  static async submitAssignment(assignmentId: string, submission: Omit<AssignmentSubmission, 'id' | 'submittedAt' | 'status'>): Promise<AssignmentSubmission> {
    const response = await fetch('/api/courses/assignments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, submission })
    });
    
    return response.json();
  }

  static async gradeAssignment(submissionId: string, grade: number, feedback: string): Promise<void> {
    await fetch('/api/courses/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback })
    });
  }
}

// File Upload Functions
export class FileManager {
  
  static async uploadFile(file: File, context: 'article' | 'assignment' | 'course'): Promise<FileAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);
    
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }

  static async deleteFile(fileId: string): Promise<void> {
    await fetch(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  }

  static getFileUrl(fileId: string): string {
    return `/api/files/${fileId}`;
  }
}
