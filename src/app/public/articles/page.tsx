"use client";

import { PublicLayout } from "@/components/PublicLayout";
import { ReadabilityWrapper } from "@/components/ReadabilityWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";

// Mock data for law review articles
const lawReviewArticles = [
  {
    id: 1,
    title: "Constitutional Interpretation in the Digital Age: Privacy Rights and Emerging Technologies",
    abstract: "This article examines the evolving landscape of constitutional privacy rights in the context of emerging digital technologies. Through analysis of recent Supreme Court decisions and lower court rulings, we explore how traditional Fourth Amendment protections apply to modern surveillance techniques, data collection practices, and artificial intelligence systems. The article proposes a framework for balancing individual privacy rights with legitimate government interests in the digital era.",
    authors: ["Prof. Sarah Johnson", "Dr. Michael Chen"],
    affiliation: "Constitutional Law Institute",
    date: "2024-01-15",
    volume: "Vol. 47",
    issue: "Issue 2",
    pages: "pp. 245-298",
    keywords: ["Constitutional Law", "Privacy Rights", "Digital Technology", "Fourth Amendment", "Surveillance"],
    citationCount: 23,
    downloadCount: 1247,
    category: "Constitutional Law",
    type: "law-review"
  },
  {
    id: 2,
    title: "Corporate Governance in the Age of Stakeholder Capitalism: A Comparative Analysis",
    abstract: "This comprehensive study analyzes the shift from shareholder primacy to stakeholder capitalism in corporate governance structures across different jurisdictions. The article examines recent legislative changes, judicial decisions, and corporate practices in the United States, European Union, and Asia-Pacific regions. We propose a new framework for evaluating corporate governance effectiveness that incorporates environmental, social, and governance (ESG) factors while maintaining fiduciary duties to shareholders.",
    authors: ["Prof. Emily Rodriguez", "Dr. James Wilson"],
    affiliation: "Corporate Law Research Center",
    date: "2024-01-08",
    volume: "Vol. 47",
    issue: "Issue 1",
    pages: "pp. 45-102",
    keywords: ["Corporate Law", "Stakeholder Capitalism", "ESG", "Fiduciary Duty", "Comparative Law"],
    citationCount: 18,
    downloadCount: 892,
    category: "Corporate Law",
    type: "law-review"
  },
  {
    id: 3,
    title: "Environmental Justice and Climate Change Litigation: Emerging Trends and Future Directions",
    abstract: "This article provides a comprehensive analysis of the intersection between environmental justice principles and climate change litigation. Through examination of recent landmark cases and emerging legal theories, we explore how courts are addressing the disproportionate impacts of climate change on vulnerable communities. The article discusses the evolution of standing doctrine, causation requirements, and remedial approaches in climate litigation, with particular attention to cases involving environmental justice claims.",
    authors: ["Prof. David Kim", "Dr. Lisa Thompson"],
    affiliation: "Environmental Law Institute",
    date: "2023-12-20",
    volume: "Vol. 46",
    issue: "Issue 4",
    pages: "pp. 567-634",
    keywords: ["Environmental Law", "Climate Change", "Environmental Justice", "Litigation", "Standing Doctrine"],
    citationCount: 31,
    downloadCount: 1456,
    category: "Environmental Law",
    type: "law-review"
  }
];

// Mock data for academic materials
const academicMaterials = [
  {
    id: 4,
    title: "Introduction to Contract Law: Fundamentals and Case Studies",
    abstract: "A comprehensive introduction to contract law principles covering formation, performance, breach, and remedies. This academic material includes case studies, practice problems, and real-world applications designed for first-year law students.",
    authors: ["Prof. Michael Chen"],
    affiliation: "Law School Faculty",
    date: "2024-01-20",
    course: "Contracts I",
    courseCode: "LAW 101",
    semester: "Spring 2024",
    keywords: ["Contract Law", "Legal Education", "Case Studies", "Formation", "Breach"],
    downloadCount: 2341,
    category: "Contract Law",
    type: "academic-material"
  },
  {
    id: 5,
    title: "Constitutional Law: Separation of Powers and Federalism",
    abstract: "This academic material explores the fundamental principles of separation of powers and federalism in constitutional law. Includes Supreme Court cases, analysis frameworks, and comparative constitutional perspectives.",
    authors: ["Prof. Sarah Johnson"],
    affiliation: "Law School Faculty",
    date: "2024-01-18",
    course: "Constitutional Law I",
    courseCode: "LAW 201",
    semester: "Spring 2024",
    keywords: ["Constitutional Law", "Separation of Powers", "Federalism", "Supreme Court", "Legal Analysis"],
    downloadCount: 1876,
    category: "Constitutional Law",
    type: "academic-material"
  },
  {
    id: 6,
    title: "Criminal Procedure: Fourth Amendment and Search & Seizure",
    abstract: "Comprehensive study materials covering Fourth Amendment protections, search and seizure law, warrant requirements, and exceptions. Includes recent case law developments and practical applications.",
    authors: ["Prof. David Kim"],
    affiliation: "Law School Faculty",
    date: "2024-01-15",
    course: "Criminal Procedure",
    courseCode: "LAW 301",
    semester: "Spring 2024",
    keywords: ["Criminal Law", "Fourth Amendment", "Search and Seizure", "Warrants", "Criminal Procedure"],
    downloadCount: 1654,
    category: "Criminal Law",
    type: "academic-material"
  },
  {
    id: 7,
    title: "Corporate Law: Fiduciary Duties and Business Judgment Rule",
    abstract: "Advanced study materials on corporate fiduciary duties, the business judgment rule, and director liability. Covers Delaware case law, practical applications, and recent developments in corporate governance.",
    authors: ["Prof. Emily Rodriguez"],
    affiliation: "Law School Faculty",
    date: "2024-01-12",
    course: "Corporate Law",
    courseCode: "LAW 401",
    semester: "Spring 2024",
    keywords: ["Corporate Law", "Fiduciary Duties", "Business Judgment Rule", "Director Liability", "Delaware Law"],
    downloadCount: 1432,
    category: "Corporate Law",
    type: "academic-material"
  }
];

const courseSubjects = [
  "All Subjects",
  "Constitutional Law",
  "Contract Law", 
  "Corporate Law",
  "Criminal Law",
  "Environmental Law",
  "Immigration Law",
  "Intellectual Property",
  "International Law",
  "Tax Law",
  "Torts"
];

// Mock data for academic materials
const academicMaterials = [
  {
    id: 4,
    title: "Contract Law: Formation and Performance",
    abstract: "Comprehensive study materials covering the essential elements of contract formation, including offer, acceptance, consideration, and performance obligations. This academic resource includes case studies, practice problems, and theoretical frameworks.",
    authors: ["Prof. Michael Chen"],
    affiliation: "Contract Law Department",
    date: "2024-01-18",
    courseSubject: "Contract Law",
    courseCode: "LAW 201",
    type: "Study Guide",
    keywords: ["Contract Formation", "Performance", "Breach", "Remedies"],
    downloadCount: 892,
    category: "Academic Material"
  },
  {
    id: 5,
    title: "Constitutional Law Case Brief Collection",
    abstract: "A curated collection of landmark constitutional law cases with detailed briefs, analysis, and discussion questions. Essential reading for constitutional law students and practitioners seeking to understand key precedents.",
    authors: ["Prof. Sarah Johnson", "Dr. Lisa Park"],
    affiliation: "Constitutional Law Institute",
    date: "2024-01-15",
    courseSubject: "Constitutional Law",
    courseCode: "LAW 101",
    type: "Case Collection",
    keywords: ["Constitutional Law", "Case Briefs", "Precedents", "Supreme Court"],
    downloadCount: 1456,
    category: "Academic Material"
  },
  {
    id: 6,
    title: "Criminal Procedure: Investigation and Trial",
    abstract: "Detailed examination of criminal procedure from investigation through trial, including Fourth Amendment protections, Miranda rights, and trial procedures. Includes practical exercises and real-world applications.",
    authors: ["Prof. David Rodriguez"],
    affiliation: "Criminal Law Department",
    date: "2024-01-12",
    courseSubject: "Criminal Law",
    courseCode: "LAW 301",
    type: "Textbook Chapter",
    keywords: ["Criminal Procedure", "Fourth Amendment", "Miranda Rights", "Trial Procedure"],
    downloadCount: 743,
    category: "Academic Material"
  },
  {
    id: 7,
    title: "Corporate Governance and Ethics",
    abstract: "Analysis of corporate governance structures, fiduciary duties, and ethical considerations in business law. Covers recent developments in ESG compliance and stakeholder capitalism.",
    authors: ["Prof. Emily Rodriguez"],
    affiliation: "Business Law Department",
    date: "2024-01-10",
    courseSubject: "Corporate Law",
    courseCode: "LAW 401",
    type: "Research Paper",
    keywords: ["Corporate Governance", "Fiduciary Duty", "ESG", "Business Ethics"],
    downloadCount: 567,
    category: "Academic Material"
  },
  {
    id: 8,
    title: "Environmental Law and Policy Analysis",
    abstract: "Comprehensive overview of environmental law principles, regulatory frameworks, and policy analysis. Includes current issues in climate change law and environmental justice.",
    authors: ["Prof. James Wilson"],
    affiliation: "Environmental Law Center",
    date: "2024-01-08",
    courseSubject: "Environmental Law",
    courseCode: "LAW 501",
    type: "Policy Analysis",
    keywords: ["Environmental Law", "Climate Change", "Regulatory Framework", "Environmental Justice"],
    downloadCount: 934,
    category: "Academic Material"
  },
  {
    id: 9,
    title: "International Law: Treaties and Jurisdiction",
    abstract: "Study of international legal principles, treaty interpretation, and jurisdictional issues in international courts. Essential for understanding global legal frameworks.",
    authors: ["Prof. Maria Santos"],
    affiliation: "International Law Institute",
    date: "2024-01-05",
    courseSubject: "International Law",
    courseCode: "LAW 601",
    type: "Academic Paper",
    keywords: ["International Law", "Treaties", "Jurisdiction", "International Courts"],
    downloadCount: 678,
    category: "Academic Material"
  }
];

const courseSubjects = [
  "All Subjects",
  "Constitutional Law",
  "Contract Law", 
  "Criminal Law",
  "Corporate Law",
  "Environmental Law",
  "International Law",
  "Intellectual Property",
  "Immigration Law",
  "Tax Law",
  "Family Law"
];

const recentIssues = [
  { volume: "Vol. 47", issue: "Issue 2", date: "January 2024", articles: 8 },
  { volume: "Vol. 47", issue: "Issue 1", date: "October 2023", articles: 6 },
  { volume: "Vol. 46", issue: "Issue 4", date: "July 2023", articles: 7 },
  { volume: "Vol. 46", issue: "Issue 3", date: "April 2023", articles: 9 }
];

export default function ArticlesPage() {
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter academic materials based on subject and search query
  const filteredAcademicMaterials = academicMaterials.filter(material => {
    const subjectMatch = selectedSubject === "All Subjects" || material.courseSubject === selectedSubject;
    const searchMatch = searchQuery === "" || 
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    return subjectMatch && searchMatch;
  });

  return (
    <PublicLayout
      title="Articles & Academic Materials"
      description="Access peer-reviewed legal scholarship from our law review and academic course materials organized by subject."
    >
      <div className="py-8">
        <ReadabilityWrapper maxWidth="2xl">
          {/* Main Content Tabs */}
          <Tabs defaultValue="law-review" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="law-review">Law Review</TabsTrigger>
              <TabsTrigger value="academic-materials">Academic Materials</TabsTrigger>
            </TabsList>

            {/* Law Review Tab */}
              {/* Current Issue Highlight */}
              <div className="mb-12">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg p-8 border">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="text-sm">Current Issue</Badge>
                    <span className="text-sm text-slate-600">January 2024</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Volume 47, Issue 2</h2>
                  <p className="text-slate-600 mb-4">
                    Featuring articles on constitutional law, corporate governance, and environmental justice.
                  </p>
                  <div className="flex gap-4">
                    <Button>View Full Issue</Button>
                    <Button variant="outline">Download PDF</Button>
                  </div>
                </div>
              </div>

              {/* Featured Articles */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Featured Articles</h2>
                <div className="space-y-8">
                  {lawReviewArticles.map((article) => (
                    <Card key={article.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{article.category}</Badge>
                          <Badge variant="secondary">{article.volume}</Badge>
                          <span className="text-sm text-slate-500">{article.pages}</span>
                        </div>
                        <CardTitle className="text-xl leading-tight mb-3">
                          {article.title}
                        </CardTitle>
                        <div className="text-sm text-slate-600 mb-3">
                          <p className="font-medium">
                            {article.authors.join(", ")} • {article.affiliation}
                          </p>
                          <p>{article.date}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-6">
                          <h4 className="font-semibold text-slate-900 mb-2">Abstract</h4>
                          <p className="text-slate-700 leading-relaxed text-justify">
                            {article.abstract}
                          </p>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="font-semibold text-slate-900 mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {article.keywords.map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6 text-sm text-slate-600">
                            <span>{article.citationCount} citations</span>
                            <span>{article.downloadCount} downloads</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Cite Article
                            </Button>
                            <Button variant="outline" size="sm">
                              Download PDF
                            </Button>
                            <Button size="sm">
                              Read Full Text
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Issues */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Recent Issues</h2>
                <div className="grid md:grid-cols-2 gap-6">
        </ReadabilityWrapper>
      </div>
    </PublicLayout>
  );
}
