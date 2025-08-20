import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

interface UploadStep {
  step: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  details: any;
  error?: string;
}

interface UploadSession {
  sessionId: string;
  filename: string;
  fileSize: number;
  startTime: string;
  steps: UploadStep[];
  currentStatus: 'active' | 'completed' | 'failed';
}

// In-memory storage for upload sessions (in production, use Redis or database)
const uploadSessions = new Map<string, UploadSession>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, data } = body;

    switch (action) {
      case 'start':
        return handleStartSession(data);
      case 'log':
        return handleLogStep(sessionId, data);
      case 'complete':
        return handleCompleteSession(sessionId, data);
      case 'error':
        return handleErrorSession(sessionId, data);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Upload monitor error:', error);
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const action = url.searchParams.get('action');

    if (action === 'list') {
      // Return all active sessions
      const sessions = Array.from(uploadSessions.values()).map(session => ({
        sessionId: session.sessionId,
        filename: session.filename,
        fileSize: session.fileSize,
        startTime: session.startTime,
        currentStatus: session.currentStatus,
        stepCount: session.steps.length,
        lastStep: session.steps[session.steps.length - 1]?.step || 'none'
      }));
      
      return NextResponse.json({ sessions });
    }

    if (sessionId) {
      const session = uploadSessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: 'Missing sessionId or action' }, { status: 400 });
  } catch (error) {
    console.error('Upload monitor GET error:', error);
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}

function handleStartSession(data: any) {
  const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: UploadSession = {
    sessionId,
    filename: data.filename,
    fileSize: data.fileSize,
    startTime: new Date().toISOString(),
    steps: [{
      step: 'session_started',
      timestamp: new Date().toISOString(),
      status: 'success',
      details: {
        filename: data.filename,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        userAgent: data.userAgent
      }
    }],
    currentStatus: 'active'
  };
  
  uploadSessions.set(sessionId, session);
  
  console.log(`🔍 UPLOAD MONITOR: Started session ${sessionId} for ${data.filename}`);
  
  return NextResponse.json({ sessionId });
}

function handleLogStep(sessionId: string, data: any) {
  const session = uploadSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  const step: UploadStep = {
    step: data.step,
    timestamp: new Date().toISOString(),
    status: data.status || 'pending',
    details: data.details || {},
    error: data.error
  };
  
  session.steps.push(step);
  
  console.log(`🔍 UPLOAD MONITOR [${sessionId}]: ${data.step} - ${data.status}`, data.details);
  
  return NextResponse.json({ success: true });
}

function handleCompleteSession(sessionId: string, data: any) {
  const session = uploadSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  session.currentStatus = 'completed';
  session.steps.push({
    step: 'upload_completed',
    timestamp: new Date().toISOString(),
    status: 'success',
    details: data
  });
  
  console.log(`🔍 UPLOAD MONITOR [${sessionId}]: COMPLETED successfully`);
  
  return NextResponse.json({ success: true });
}

function handleErrorSession(sessionId: string, data: any) {
  const session = uploadSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  session.currentStatus = 'failed';
  session.steps.push({
    step: 'upload_failed',
    timestamp: new Date().toISOString(),
    status: 'error',
    details: data.details || {},
    error: data.error
  });
  
  console.error(`🔍 UPLOAD MONITOR [${sessionId}]: FAILED - ${data.error}`);
  
  return NextResponse.json({ success: true });
}
