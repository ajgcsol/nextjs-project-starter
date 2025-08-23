import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle ALL video format uploads - Mux supports everything!
  if (request.nextUrl.pathname.startsWith('/api/videos/upload') || 
      request.nextUrl.pathname.startsWith('/api/videos/multipart-upload')) {
    const response = NextResponse.next()
    
    // Universal video upload headers - works for ANY format
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours preflight cache
    
    // Support large files of any format
    if (request.method === 'POST' || request.method === 'PUT') {
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
    }
    
    return response
  }

  // Handle Mux streaming - works for ALL processed formats
  if (request.nextUrl.pathname.startsWith('/api/videos/stream/')) {
    const response = NextResponse.next()
    
    // Universal streaming headers
    response.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes
    response.headers.set('Accept-Ranges', 'bytes')
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization')
    response.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
    
    return response
  }

  // Handle thumbnails - generated from ANY video format
  if (request.nextUrl.pathname.startsWith('/api/videos/thumbnail/') ||
      request.nextUrl.pathname.startsWith('/uploads/thumbnails/')) {
    const response = NextResponse.next()
    
    // Universal thumbnail headers
    response.headers.set('Cache-Control', 'public, max-age=3600, immutable') // 1 hour
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Content-Type', 'image/jpeg')
    
    return response
  }

  // Handle video processing status - universal for all formats
  if (request.nextUrl.pathname.startsWith('/api/videos/') && 
      (request.nextUrl.pathname.includes('/status') || 
       request.nextUrl.pathname.includes('/progress'))) {
    const response = NextResponse.next()
    
    // Real-time status updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Access-Control-Allow-Origin', '*')
    
    return response
  }

  // Handle Mux webhooks - universal processing notifications
  if (request.nextUrl.pathname.startsWith('/api/webhooks/mux')) {
    const response = NextResponse.next()
    
    // Secure webhook handling
    response.headers.set('Access-Control-Allow-Origin', 'https://webhook.mux.com')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Mux-Signature')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    
    return response
  }

  // Handle legacy video files - backward compatibility for any format
  if (request.nextUrl.pathname.startsWith('/uploads/videos/')) {
    const response = NextResponse.next()
    
    // Universal video file headers
    response.headers.set('Cache-Control', 'public, max-age=86400, immutable') // 24 hours
    response.headers.set('Accept-Ranges', 'bytes')
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Universal video processing endpoints
    '/api/videos/upload/:path*',
    '/api/videos/multipart-upload/:path*',
    '/api/videos/stream/:path*',
    '/api/videos/thumbnail/:path*',
    '/api/webhooks/mux/:path*',
    
    // Status endpoints for any format
    '/api/videos/:path*/status',
    '/api/videos/:path*/progress',
    
    // Legacy file access (any format)
    '/uploads/videos/:path*',
    '/uploads/thumbnails/:path*'
  ]
}
