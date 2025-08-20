import { NextRequest, NextResponse } from 'next/server'
// import { client, videoQueries, sanityHelpers } from '@/lib/sanity'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Sanity integration temporarily disabled' },
    { status: 503 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Sanity integration temporarily disabled' },
    { status: 503 }
  )
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Sanity integration temporarily disabled' },
    { status: 503 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Sanity integration temporarily disabled' },
    { status: 503 }
  )
}