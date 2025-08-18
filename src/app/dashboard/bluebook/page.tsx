"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, CheckCircle, AlertTriangle, Clock, Scale, FileText, Link2 } from "lucide-react";

export default function BlueBookPage() {
  const { isAuthenticated, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!canAccess("bluebook", "view") && !canAccess("*", "*")) {
      router.push("/dashboard");
      return;
    }
  }, [isAuthenticated, canAccess, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blue Book Citation Management</h1>
          <p className="text-slate-600 mt-2">
            Manage legal citations according to The Bluebook: A Uniform System of Citation
          </p>
        </div>
        <Button>
          <BookOpenCheck className="h-4 w-4 mr-2" />
          New Citation Review
        </Button>
      </div>

      {/* Citation Workflow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BookOpenCheck className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-sm text-slate-600">Active Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">7</p>
                <p className="text-sm text-slate-600">Citation Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-slate-600">Verified Citations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-slate-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blue Book Citation Queue */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Citation Review Queue</CardTitle>
          <CardDescription>
            Articles requiring Blue Book citation review and verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: "Environmental Justice in Corporate Litigation",
                section: "Case References & Statutory Citations",
                assignee: "Sarah Johnson",
                citationCount: 47,
                errorsFound: 3,
                status: "under_review",
                priority: "high",
                due: "2024-01-22",
                contentId: "sha256:b7c8d9e2f6g4",
                permalink: "/content/b7c8d9e2f6g4",
                citationType: ["case_law", "statutes", "regulations"]
              },
              {
                title: "International Trade Law Post-Brexit",
                section: "Footnotes 1-25",
                assignee: "Michael Chen",
                citationCount: 25,
                errorsFound: 1,
                status: "revisions_requested",
                priority: "medium",
                due: "2024-01-25",
                contentId: "sha256:c8d9e3f7h5i2",
                permalink: "/content/c8d9e3f7h5i2",
                citationType: ["treaties", "case_law"]
              },
              {
                title: "Corporate Governance in Modern Law",
                section: "Bibliography & Sources",
                assignee: "Emily Rodriguez",
                citationCount: 62,
                errorsFound: 0,
                status: "in_progress",
                priority: "high",
                due: "2024-01-21",
                contentId: "sha256:e5f9g7h4j8k1",
                permalink: "/content/e5f9g7h4j8k1",
                citationType: ["law_reviews", "books", "case_law"]
              },
              {
                title: "AI Ethics in Legal Practice",
                section: "Comparative Law Citations",
                assignee: "David Kim",
                citationCount: 34,
                errorsFound: 2,
                status: "quality_check",
                priority: "urgent",
                due: "2024-01-20",
                contentId: "sha256:f6g0h8i5j2k9",
                permalink: "/content/f6g0h8i5j2k9",
                citationType: ["foreign_law", "case_law", "law_reviews"]
              }
            ].map((review, index) => (
              <div key={index} className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3 flex-1">
                  <BookOpenCheck className="h-5 w-5 text-purple-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{review.title}</h3>
                      {review.priority === "urgent" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                      {review.priority === "high" && (
                        <Badge variant="secondary" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Section: {review.section}</p>
                    <p className="text-sm text-slate-500 mb-2">Assigned to: {review.assignee}</p>
                    
                    {/* Citation Type Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {review.citationType.map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs text-purple-600 border-purple-200">
                          {type.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center text-xs text-slate-500 gap-4 mb-1">
                      <span>{review.citationCount} citations</span>
                      <span className={review.errorsFound > 0 ? "text-red-600" : "text-green-600"}>
                        {review.errorsFound} errors found
                      </span>
                      <span>Due: {review.due}</span>
                    </div>
                    
                    <div className="flex items-center text-xs text-slate-400 gap-2">
                      <Link2 className="h-3 w-3" />
                      <code className="bg-slate-100 px-1 rounded">{review.permalink}</code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      review.status === "quality_check" ? "default" : 
                      review.status === "under_review" ? "secondary" : 
                      review.status === "revisions_requested" ? "destructive" :
                      "outline"
                    }
                  >
                    {review.status.replace("_", " ")}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Scale className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blue Book Rules Reference */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Blue Book Rules Quick Reference</CardTitle>
          <CardDescription>
            Common citation formats and rules for legal documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                rule: "Rule 10",
                title: "Cases",
                format: "Plaintiff v. Defendant, Volume Reporter Page (Court Year).",
                example: "Brown v. Board of Ed., 347 U.S. 483 (1954)."
              },
              {
                rule: "Rule 12",
                title: "Statutes",
                format: "Title Code § Section (Year).",
                example: "42 U.S.C. § 1983 (2018)."
              },
              {
                rule: "Rule 16",
                title: "Law Review Articles",
                format: "Author, Title, Volume Journal Page (Year).",
                example: "John Smith, Legal Theory, 95 Harv. L. Rev. 1234 (2022)."
              },
              {
                rule: "Rule 21",
                title: "Foreign Materials",
                format: "[Country] Citation Format",
                example: "R v. Oakes, [1986] 1 S.C.R. 103 (Can.)."
              },
              {
                rule: "Rule 18",
                title: "Books",
                format: "Author, Title Page (Edition Year).",
                example: "Black's Law Dictionary 1205 (11th ed. 2019)."
              },
              {
                rule: "Rule 14",
                title: "Regulations",
                format: "Title C.F.R. § Section (Year).",
                example: "29 C.F.R. § 1910.95 (2023)."
              }
            ].map((rule, index) => (
              <Card key={index} className="border border-purple-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-purple-700">{rule.rule}</CardTitle>
                    <Badge variant="outline" className="text-xs">Blue Book</Badge>
                  </div>
                  <CardDescription className="text-sm font-medium text-slate-700">
                    {rule.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Format:</p>
                      <code className="text-xs text-slate-800 bg-slate-100 p-1 rounded block">
                        {rule.format}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Example:</p>
                      <code className="text-xs text-green-700 bg-green-50 p-1 rounded block">
                        {rule.example}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}