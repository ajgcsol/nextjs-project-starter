import { NextRequest, NextResponse } from 'next/server';

// Mock content database - in production, this would be a real database or content store
const contentDatabase: Record<string, any> = {
  'a4b6c2f1e5d3': {
    id: 'sha256:a4b6c2f1e5d3',
    title: 'Constitutional Law Analysis - Introduction & Background',
    article: 'AI Ethics in Legal Practice',
    type: 'editorial_section',
    content: `# Introduction & Background

This section provides a comprehensive analysis of constitutional law principles as they apply to AI ethics in modern legal practice. The fundamental constitutional considerations include due process, equal protection, and the intersection of technology with established legal precedents.

## Constitutional Framework

The constitutional framework for AI governance rests on several key pillars:

1. **Due Process Considerations**: The Fifth and Fourteenth Amendments require that AI systems used in legal proceedings meet fundamental fairness standards.

2. **Equal Protection**: AI systems must not create disparate impacts on protected classes without compelling governmental interest.

3. **First Amendment Implications**: AI-generated content and algorithmic content moderation raise significant free speech concerns.

[Content continues...]`,
    metadata: {
      wordCount: 850,
      lastModified: '2024-01-15T10:30:00Z',
      version: '1.2.3',
      hash: 'sha256:a4b6c2f1e5d3c4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
      author: 'Sarah Johnson',
      workflowType: 'editorial',
      status: 'in_progress'
    },
    citations: []
  },
  'b7c8d9e2f6g4': {
    id: 'sha256:b7c8d9e2f6g4',
    title: 'Blue Book Citation Review - Case References',
    article: 'Environmental Justice in Corporate Litigation',
    type: 'citation_review',
    content: `# Case References - Citation Review

This document contains the Blue Book citation review for case references in the Environmental Justice article.

## Case Citations Under Review

1. **Massachusetts v. EPA**, 549 U.S. 497 (2007) ✓ Correct format
2. **Lujan v. Defenders of Wildlife**, 504 U.S. 555, 560-61 (1992) ✓ Correct format  
3. **Friends of the Earth v. Laidlaw Environmental Services**, 528 U.S. 167 (2000) ⚠️ Missing pinpoint citation
4. **Chevron U.S.A. Inc. v. Natural Resources Defense Council**, 467 U.S. 837, 842-43 (1984) ✓ Correct format

## Errors Found

- Citation #3: Missing specific page reference for quoted material
- Citation #17: Incorrect court abbreviation (should use "D.C. Cir." not "D.C. Circuit")
- Citation #23: Missing parenthetical explanation for relevance

[Review continues...]`,
    metadata: {
      citationCount: 47,
      errorsFound: 3,
      lastModified: '2024-01-12T14:20:00Z',
      version: '2.1.0',
      hash: 'sha256:b7c8d9e2f6g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7',
      reviewer: 'Michael Chen',
      workflowType: 'bluebook',
      status: 'under_review'
    },
    citations: [
      {
        id: 1,
        text: 'Massachusetts v. EPA, 549 U.S. 497 (2007)',
        type: 'case_law',
        status: 'correct',
        rule: 'Rule 10.2.1'
      },
      {
        id: 3,
        text: 'Friends of the Earth v. Laidlaw Environmental Services, 528 U.S. 167 (2000)',
        type: 'case_law',
        status: 'error',
        rule: 'Rule 10.2.1',
        issue: 'Missing pinpoint citation for quoted material'
      }
    ]
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    
    // Remove 'sha256:' prefix if present
    const cleanContentId = contentId.replace('sha256:', '');
    
    const content = contentDatabase[cleanContentId];
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Add CORS headers for public access
    const response = NextResponse.json({
      success: true,
      data: content,
      permalink: `/content/${cleanContentId}`,
      accessed: new Date().toISOString()
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Cache-Control', 'public, max-age=3600, immutable');
    
    return response;

  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const cleanContentId = contentId.replace('sha256:', '');
    const content = contentDatabase[cleanContentId];
    
    if (!content) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Cache-Control', 'public, max-age=3600, immutable');
    response.headers.set('Last-Modified', content.metadata.lastModified);
    response.headers.set('ETag', `"${content.metadata.hash}"`);
    
    return response;

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}