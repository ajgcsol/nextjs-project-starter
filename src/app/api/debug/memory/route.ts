import { NextResponse } from 'next/server';
import liteVideoDatabase from '@/lib/videoDatabase-lite';

export async function GET() {
  try {
    // Get Node.js memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get video database memory usage
    const dbMemoryUsage = liteVideoDatabase.getMemoryUsage();
    
    // Calculate memory usage in MB
    const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
    
    const memoryReport = {
      timestamp: new Date().toISOString(),
      process: {
        rss: formatBytes(memoryUsage.rss), // Resident Set Size
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        arrayBuffers: formatBytes(memoryUsage.arrayBuffers)
      },
      database: {
        recordCount: dbMemoryUsage.recordCount,
        estimatedSizeKB: dbMemoryUsage.estimatedSizeKB,
        estimatedSizeMB: (dbMemoryUsage.estimatedSizeKB / 1024).toFixed(2)
      },
      recommendations: []
    };

    // Add recommendations based on memory usage
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 400) {
      memoryReport.recommendations.push('High memory usage detected - consider optimization');
    }
    if (dbMemoryUsage.recordCount > 1000) {
      memoryReport.recommendations.push('Large number of video records - consider pagination');
    }

    console.log('🧠 Memory Report:', memoryReport);

    return NextResponse.json(memoryReport);
  } catch (error) {
    console.error('Memory report error:', error);
    return NextResponse.json({
      error: 'Failed to generate memory report',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}