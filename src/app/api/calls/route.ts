import { NextResponse } from 'next/server';

// Voice calls feature is not yet implemented
// This endpoint returns a proper response instead of crashing

export async function POST() {
  return NextResponse.json(
    { error: 'امکان تماس صوتی هنوز فعال نشده است' },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({
    data: [],
    message: 'امکان تماس صوتی هنوز فعال نشده است',
  });
}
