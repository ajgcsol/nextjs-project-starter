export interface BluebookCitation {
  id: string;
  articleId: string;
  text: string;
  type: CitationType;
  format: string;
  source: CitationSource;
  permalink?: string;
  permaLinkStatus: "valid" | "invalid" | "pending" | "expired";
  lastValidated?: Date;
  validatedBy?: string;
  metadata: CitationMetadata;
  position: {
    paragraph: number;
    sentence: number;
    startChar: number;
    endChar: number;
  };
}

export type CitationType = 
  | "case"
  | "statute"
  | "book"
  | "article"
  | "website"
  | "regulation"
  | "constitution"
  | "treaty"
  | "legislative_material"
  | "administrative_material";

export interface CitationSource {
  title: string;
  author?: string[];
  year?: number;
  volume?: string;
  page?: string;
  court?: string;
  jurisdiction?: string;
  publisher?: string;
  url?: string;
  database?: "Westlaw" | "LexisNexis" | "HeinOnline" | "SSRN" | "Other";
  accessDate?: Date;
}

export interface CitationMetadata {
  pinCite?: string;
  parenthetical?: string;
  weight?: "primary" | "secondary" | "tertiary";
  signal?: BluebookSignal;
  shortForm?: boolean;
  idForm?: boolean;
  supraNote?: number;
  infraNote?: number;
}

export type BluebookSignal = 
  | "see"
  | "see_also"
  | "cf"
  | "compare_with"
  | "but_see"
  | "but_cf"
  | "see_generally"
  | "accord"
  | "contra"
  | "eg";

export interface CitationValidation {
  id: string;
  citationId: string;
  validatorId: string;
  validatorName: string;
  validatorRole: string;
  timestamp: Date;
  status: "valid" | "invalid" | "needs_correction";
  issues: ValidationIssue[];
  suggestedCorrection?: string;
  notes?: string;
}

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export type ValidationIssueType = 
  | "format_error"
  | "missing_pin_cite"
  | "invalid_signal"
  | "broken_permalink"
  | "outdated_source"
  | "incorrect_abbreviation"
  | "missing_author"
  | "wrong_court_format"
  | "date_format_error";

export interface ResearchTask {
  id: string;
  articleId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: Date;
  dueDate?: Date;
  status: "pending" | "in_progress" | "completed" | "blocked";
  type: "validate_citations" | "find_sources" | "update_permalinks" | "format_check";
  citations: string[]; // Citation IDs to validate
  completedCitations: string[];
  notes?: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export class BluebookValidator {
  // Validate citation format according to Bluebook rules
  static validateFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    switch (citation.type) {
      case "case":
        issues.push(...this.validateCaseFormat(citation));
        break;
      case "statute":
        issues.push(...this.validateStatuteFormat(citation));
        break;
      case "article":
        issues.push(...this.validateArticleFormat(citation));
        break;
      case "book":
        issues.push(...this.validateBookFormat(citation));
        break;
      case "website":
        issues.push(...this.validateWebsiteFormat(citation));
        break;
    }
    
    // Check permalink validity
    if (citation.permalink) {
      if (citation.permaLinkStatus === "invalid" || citation.permaLinkStatus === "expired") {
        issues.push({
          type: "broken_permalink",
          severity: "error",
          message: "Permalink is no longer valid",
          suggestion: "Update with a new permanent link or archive link"
        });
      }
    }
    
    return issues;
  }
  
  private static validateCaseFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { source, format } = citation;
    
    // Check case name formatting
    if (!format.includes("v.")) {
      issues.push({
        type: "format_error",
        severity: "error",
        message: "Case names should use 'v.' not 'vs.' or other variations",
        suggestion: format.replace(/vs\.?/gi, "v.")
      });
    }
    
    // Check for court and year
    if (!source.court) {
      issues.push({
        type: "wrong_court_format",
        severity: "error",
        message: "Missing court designation"
      });
    }
    
    if (!source.year) {
      issues.push({
        type: "date_format_error",
        severity: "error",
        message: "Missing year of decision"
      });
    }
    
    return issues;
  }
  
  private static validateStatuteFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { format } = citation;
    
    // Check for proper U.S.C. formatting
    if (format.includes("USC") && !format.includes("U.S.C.")) {
      issues.push({
        type: "incorrect_abbreviation",
        severity: "error",
        message: "Use 'U.S.C.' not 'USC'",
        suggestion: format.replace(/USC/g, "U.S.C.")
      });
    }
    
    // Check for section symbol
    if (!format.includes("§")) {
      issues.push({
        type: "format_error",
        severity: "warning",
        message: "Statute citations should use the section symbol (§)",
        suggestion: "Add § before the section number"
      });
    }
    
    return issues;
  }
  
  private static validateArticleFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { source } = citation;
    
    if (!source.author || source.author.length === 0) {
      issues.push({
        type: "missing_author",
        severity: "error",
        message: "Article citations require author names"
      });
    }
    
    if (!source.volume && !source.year) {
      issues.push({
        type: "format_error",
        severity: "error",
        message: "Article citations need either volume or year"
      });
    }
    
    return issues;
  }
  
  private static validateBookFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { source } = citation;
    
    if (!source.author || source.author.length === 0) {
      issues.push({
        type: "missing_author",
        severity: "error",
        message: "Book citations require author names"
      });
    }
    
    if (!source.year) {
      issues.push({
        type: "date_format_error",
        severity: "error",
        message: "Book citations require publication year"
      });
    }
    
    if (!source.publisher) {
      issues.push({
        type: "format_error",
        severity: "warning",
        message: "Book citations should include publisher"
      });
    }
    
    return issues;
  }
  
  private static validateWebsiteFormat(citation: BluebookCitation): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { source } = citation;
    
    if (!source.url) {
      issues.push({
        type: "format_error",
        severity: "error",
        message: "Web citations require URLs"
      });
    }
    
    if (!source.accessDate) {
      issues.push({
        type: "date_format_error",
        severity: "error",
        message: "Web citations require access date",
        suggestion: "Add 'last visited [date]'"
      });
    }
    
    return issues;
  }
  
  // Format citation according to Bluebook rules
  static formatCitation(citation: BluebookCitation): string {
    let formatted = "";
    
    // Add signal if present
    if (citation.metadata.signal) {
      formatted += this.formatSignal(citation.metadata.signal) + " ";
    }
    
    // Format based on type
    switch (citation.type) {
      case "case":
        formatted += this.formatCase(citation);
        break;
      case "statute":
        formatted += this.formatStatute(citation);
        break;
      case "article":
        formatted += this.formatArticle(citation);
        break;
      case "book":
        formatted += this.formatBook(citation);
        break;
      case "website":
        formatted += this.formatWebsite(citation);
        break;
      default:
        formatted += citation.format;
    }
    
    // Add parenthetical if present
    if (citation.metadata.parenthetical) {
      formatted += ` (${citation.metadata.parenthetical})`;
    }
    
    return formatted;
  }
  
  private static formatSignal(signal: BluebookSignal): string {
    const signals: Record<BluebookSignal, string> = {
      "see": "See",
      "see_also": "See also",
      "cf": "Cf.",
      "compare_with": "Compare",
      "but_see": "But see",
      "but_cf": "But cf.",
      "see_generally": "See generally",
      "accord": "Accord",
      "contra": "Contra",
      "eg": "E.g.,"
    };
    return signals[signal] || "";
  }
  
  private static formatCase(citation: BluebookCitation): string {
    const { source } = citation;
    let formatted = citation.text;
    
    if (source.volume) formatted = `${source.volume} ${formatted}`;
    if (source.page) formatted += `, ${source.page}`;
    if (citation.metadata.pinCite) formatted += `, ${citation.metadata.pinCite}`;
    if (source.court && source.year) {
      formatted += ` (${source.court} ${source.year})`;
    }
    
    return formatted;
  }
  
  private static formatStatute(citation: BluebookCitation): string {
    const { source } = citation;
    return `${citation.text} (${source.year || "current"})`;
  }
  
  private static formatArticle(citation: BluebookCitation): string {
    const { source } = citation;
    const authors = source.author?.join(" & ") || "";
    let formatted = `${authors}, ${citation.text}`;
    
    if (source.volume) formatted += `, ${source.volume}`;
    if (source.page) formatted += ` at ${source.page}`;
    if (source.year) formatted += ` (${source.year})`;
    
    return formatted;
  }
  
  private static formatBook(citation: BluebookCitation): string {
    const { source } = citation;
    const authors = source.author?.join(" & ") || "";
    let formatted = `${authors}, ${citation.text}`;
    
    if (source.page) formatted += ` ${source.page}`;
    if (source.publisher && source.year) {
      formatted += ` (${source.publisher} ${source.year})`;
    } else if (source.year) {
      formatted += ` (${source.year})`;
    }
    
    return formatted;
  }
  
  private static formatWebsite(citation: BluebookCitation): string {
    const { source } = citation;
    let formatted = citation.text;
    
    if (source.author && source.author.length > 0) {
      formatted = `${source.author.join(" & ")}, ${formatted}`;
    }
    
    if (source.url) {
      formatted += `, ${source.url}`;
    }
    
    if (source.accessDate) {
      formatted += ` (last visited ${source.accessDate.toLocaleDateString()})`;
    }
    
    return formatted;
  }
}

// Research task manager
export class ResearchTaskManager {
  static createTask(
    articleId: string,
    type: ResearchTask["type"],
    citations: string[],
    assignedTo: string,
    assignedBy: string,
    priority: ResearchTask["priority"] = "medium"
  ): ResearchTask {
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      articleId,
      type,
      citations,
      completedCitations: [],
      assignedTo,
      assignedBy,
      createdAt: new Date(),
      status: "pending",
      priority
    };
  }
  
  static assignTask(task: ResearchTask, userId: string): void {
    task.assignedTo = userId;
    task.status = "pending";
  }
  
  static completeValidation(
    task: ResearchTask,
    citationId: string,
    validation: CitationValidation
  ): void {
    if (!task.completedCitations.includes(citationId)) {
      task.completedCitations.push(citationId);
    }
    
    // Check if all citations are completed
    if (task.completedCitations.length === task.citations.length) {
      task.status = "completed";
    }
  }
  
  static getTaskProgress(task: ResearchTask): number {
    if (task.citations.length === 0) return 100;
    return (task.completedCitations.length / task.citations.length) * 100;
  }
}