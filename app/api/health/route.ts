import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    runtime: 'node',
    timestamp: new Date().toISOString(),
  })
}
