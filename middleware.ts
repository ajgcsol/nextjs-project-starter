import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle video files with proper caching headers
  if (request.nextUrl.pathname.startsWith('/uploads/videos/')) {
    const response = NextResponse.next()
    
    // Add cache headers for video files
    response.headers.set('Cache-Control', 'public, max-age=86400, immutable') // 24 hours
    response.headers.set('Accept-Ranges', 'bytes')
    
    // Add CORS headers for video playback
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    
    return response
  }

  // Handle thumbnail files
  if (request.nextUrl.pathname.startsWith('/uploads/thumbnails/')) {
    const response = NextResponse.next()
    
    // Add cache headers for thumbnails
    response.headers.set('Cache-Control', 'public, max-age=86400') // 24 hours
    response.headers.set('Access-Control-Allow-Origin', '*')
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/uploads/videos/:path*',
    '/uploads/thumbnails/:path*'
  ]
}