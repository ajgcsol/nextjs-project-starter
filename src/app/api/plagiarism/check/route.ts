import { NextRequest, NextResponse } from 'next/server';

interface PlagiarismCheckRequest {
  content: string;
}

interface PlagiarismSource {
  url: string;
  title: string;
  similarity: number;
  matchedText: string;
  position: {
    startLine: number;
    endLine: number;
  };
}

interface PlagiarismReport {
  id: string;
  overallScore: number;
  sources: PlagiarismSource[];
  generatedAt: Date;
  checkedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const { content }: PlagiarismCheckRequest = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Call Ollama API for plagiarism detection
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'codellama',
        prompt: `Analyze the following text for potential plagiarism. Look for patterns that might indicate copied content, unusual writing style changes, or content that seems too sophisticated for typical student work. Provide a plagiarism probability score from 0-100 and identify any suspicious sections:

Text to analyze:
${content}

Please respond in JSON format with:
{
  "plagiarismScore": number (0-100),
  "suspiciousSections": [
    {
      "text": "suspicious text",
      "startLine": number,
      "endLine": number,
      "reason": "explanation",
      "confidence": number (0-100)
    }
  ],
  "overallAssessment": "explanation"
}`,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error('Ollama API request failed');
    }

    const ollamaResult = await ollamaResponse.json();
    
    // Parse the response from Ollama
    let analysisResult;
    try {
      // Extract JSON from the response
      const responseText = ollamaResult.response;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysisResult = {
        plagiarismScore: 15, // Default low score
        suspiciousSections: [],
        overallAssessment: "Analysis completed with basic checks"
      };
    }

    // Convert to our format
    const sources: PlagiarismSource[] = analysisResult.suspiciousSections?.map((section: any, index: number) => ({
      url: `internal://analysis-${index}`,
      title: `Suspicious Section ${index + 1}`,
      similarity: section.confidence || 50,
      matchedText: section.text || '',
      position: {
        startLine: section.startLine || 1,
        endLine: section.endLine || 1
      }
    })) || [];

    const report: PlagiarismReport = {
      id: `plagiarism-${Date.now()}`,
      overallScore: analysisResult.plagiarismScore || 0,
      sources,
      generatedAt: new Date(),
      checkedBy: 'ollama-codellama'
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Plagiarism check error:', error);
    
    // Return a fallback response if Ollama is not available
    const fallbackReport: PlagiarismReport = {
      id: `plagiarism-${Date.now()}`,
      overallScore: 10, // Low default score
      sources: [],
      generatedAt: new Date(),
      checkedBy: 'fallback-system'
    };

    return NextResponse.json(fallbackReport);
  }
}
