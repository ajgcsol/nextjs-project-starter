import { NextRequest, NextResponse } from 'next/server';

interface BluebookCitation {
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

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Call Ollama API for Bluebook citation checking
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'codellama',
        prompt: `Analyze the following legal text and identify all citations. Check if they follow proper Bluebook citation format (20th edition). For each citation found, provide the original text, whether it's correctly formatted, and suggest the proper Bluebook format if needed.

Text to analyze:
${content}

Please respond in JSON format with an array of citations:
{
  "citations": [
    {
      "originalText": "the citation as found in text",
      "startPosition": number,
      "endPosition": number,
      "isValid": boolean,
      "suggestedFormat": "proper Bluebook format",
      "citationType": "case|statute|book|article|etc",
      "issues": ["list of formatting issues if any"]
    }
  ]
}

Focus on common Bluebook rules:
- Case citations: Name v. Name, Volume Reporter Page (Court Year)
- Statute citations: Title U.S.C. § Section (Year)
- Law review articles: Author, Title, Volume Journal Page (Year)
- Books: Author, Title Page (Year)`,
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
      const responseText = ollamaResult.response;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', parseError);
      analysisResult = { citations: [] };
    }

    // Convert to our format
    const citations: BluebookCitation[] = analysisResult.citations?.map((citation: any, index: number) => {
      // Calculate line position (approximate)
      const textBeforeCitation = content.substring(0, citation.startPosition || 0);
      const linesBefore = textBeforeCitation.split('\n').length;
      
      return {
        id: `citation-${Date.now()}-${index}`,
        originalText: citation.originalText || '',
        suggestedFormat: citation.suggestedFormat || citation.originalText || '',
        isValid: citation.isValid || false,
        source: citation.citationType || 'unknown',
        position: {
          startLine: linesBefore,
          endLine: linesBefore,
          startChar: citation.startPosition || 0,
          endChar: citation.endPosition || 0
        }
      };
    }) || [];

    return NextResponse.json(citations);

  } catch (error) {
    console.error('Bluebook check error:', error);
    
    // Return empty array if service is unavailable
    return NextResponse.json([]);
  }
}
