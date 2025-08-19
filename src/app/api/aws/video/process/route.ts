import { NextRequest, NextResponse } from 'next/server';
import { AWSVideoProcessor } from '@/lib/aws-integration';

export async function POST(request: NextRequest) {
  try {
    const { inputUrl, title, outputPath } = await request.json();

    if (!inputUrl || !title) {
      return NextResponse.json(
        { error: 'Input URL and title are required' },
        { status: 400 }
      );
    }

    // Start video processing job
    const job = await AWSVideoProcessor.processVideo(inputUrl, outputPath || '', title);

    return NextResponse.json({
      success: true,
      jobId: job.Id,
      status: job.Status,
      message: 'Video processing job started'
    });

  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json(
      { error: 'Video processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const listAll = searchParams.get('list') === 'true';

    if (listAll) {
      // List all jobs
      const jobs = await AWSVideoProcessor.listJobs();
      return NextResponse.json({
        success: true,
        jobs: jobs.map((job) => ({
          id: job.Id || '',
          status: job.Status || '',
          createdAt: job.CreatedAt || '',
          settings: job.Settings || {}
        }))
      });
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get specific job status
    const job = await AWSVideoProcessor.getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      job: {
        id: job.Id,
        status: job.Status,
        progress: job.JobPercentComplete,
        createdAt: job.CreatedAt,
        completedAt: (job as any).FinishedAt,
        errorMessage: job.ErrorMessage
      }
    });

  } catch (error) {
    console.error('Video status error:', error);
    return NextResponse.json(
      { error: 'Failed to get video status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
