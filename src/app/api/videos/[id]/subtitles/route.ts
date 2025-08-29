import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'vtt';

    console.log(`📄 Serving ${format.toUpperCase()} subtitles for video:`, videoId);

    // Get video from database
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return new NextResponse('Video not found', { status: 404 });
    }

    // Check if we have transcript text to convert
    if (!video.transcript_text) {
      return new NextResponse('No transcript available', { status: 404 });
    }

    console.log('✅ Found transcript text:', video.transcript_text.length, 'characters');

    let subtitleContent: string;
    let contentType: string;
    let filename: string;

    // Try to get real speaker segments with timestamps first
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    let realSegments: any[] = [];
    try {
      const segmentsResult = await pool.query(`
        SELECT speaker_label, start_time, end_time, text, confidence, is_relevant
        FROM speaker_segments 
        WHERE video_id = $1 AND (is_relevant IS NULL OR is_relevant = true)
        ORDER BY start_time
      `, [videoId]);
      realSegments = segmentsResult.rows;
      console.log('📊 Found real speaker segments:', realSegments.length);
    } catch (segmentError) {
      console.warn('⚠️ Could not fetch speaker segments, using fallback:', segmentError);
    }

    if (format === 'srt') {
      subtitleContent = realSegments.length > 0 
        ? convertRealSegmentsToSRT(realSegments)
        : convertToSRT(video.transcript_text, video.speaker_count);
      contentType = 'application/x-subrip';
      filename = `${video.title || 'video'}-subtitles.srt`;
    } else {
      // Default to VTT
      subtitleContent = realSegments.length > 0 
        ? convertRealSegmentsToVTT(realSegments)
        : convertToVTT(video.transcript_text, video.speaker_count);
      contentType = 'text/vtt';
      filename = `${video.title || 'video'}-subtitles.vtt`;
    }

    console.log(`📝 Generated ${format.toUpperCase()} subtitles:`, subtitleContent.length, 'characters');

    return new NextResponse(subtitleContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Failed to serve subtitles:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Convert transcript text to WebVTT format
 */
function convertToVTT(transcriptText: string, speakerCount?: number): string {
  let vtt = 'WEBVTT\n\n';
  
  // Split transcript into sentences and create timed segments
  const sentences = transcriptText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Create segments with estimated timing (roughly 3 seconds per sentence)
  let currentTime = 0;
  const segmentDuration = 3; // seconds

  sentences.forEach((sentence, index) => {
    const startTime = formatVTTTime(currentTime);
    const endTime = formatVTTTime(currentTime + segmentDuration);
    
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    
    // Add speaker information if available
    if (speakerCount && speakerCount > 1) {
      const speaker = `Speaker ${(index % speakerCount) + 1}`;
      vtt += `<v ${speaker}>${sentence.trim()}</v>\n\n`;
    } else {
      vtt += `${sentence.trim()}\n\n`;
    }
    
    currentTime += segmentDuration;
  });
  
  return vtt;
}

/**
 * Convert transcript text to SRT format
 */
function convertToSRT(transcriptText: string, speakerCount?: number): string {
  let srt = '';
  
  // Split transcript into sentences and create timed segments
  const sentences = transcriptText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Create segments with estimated timing (roughly 3 seconds per sentence)
  let currentTime = 0;
  const segmentDuration = 3; // seconds

  sentences.forEach((sentence, index) => {
    const startTime = formatSRTTime(currentTime);
    const endTime = formatSRTTime(currentTime + segmentDuration);
    
    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    
    // Add speaker information if available
    if (speakerCount && speakerCount > 1) {
      const speaker = `Speaker ${(index % speakerCount) + 1}`;
      srt += `${speaker}: ${sentence.trim()}\n\n`;
    } else {
      srt += `${sentence.trim()}\n\n`;
    }
    
    currentTime += segmentDuration;
  });
  
  return srt;
}

/**
 * Convert real speaker segments to WebVTT format with actual timestamps
 */
function convertRealSegmentsToVTT(segments: any[]): string {
  let vtt = 'WEBVTT\n\n';
  
  segments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.start_time);
    const endTime = formatVTTTime(segment.end_time);
    
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    
    if (segment.speaker_label) {
      vtt += `<v ${segment.speaker_label}>${segment.text.trim()}</v>\n\n`;
    } else {
      vtt += `${segment.text.trim()}\n\n`;
    }
  });
  
  return vtt;
}

/**
 * Convert real speaker segments to SRT format with actual timestamps
 */
function convertRealSegmentsToSRT(segments: any[]): string {
  let srt = '';
  
  segments.forEach((segment, index) => {
    const startTime = formatSRTTime(segment.start_time);
    const endTime = formatSRTTime(segment.end_time);
    
    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    
    const text = segment.speaker_label 
      ? `${segment.speaker_label}: ${segment.text.trim()}`
      : segment.text.trim();
    
    srt += `${text}\n\n`;
  });
  
  return srt;
}

/**
 * Format time for WebVTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}