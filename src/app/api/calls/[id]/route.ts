import { NextResponse } from 'next/server';

// Voice calls feature is not yet implemented
export async function PATCH() {
  return NextResponse.json(
    { error: 'امکان تماس صوتی هنوز فعال نشده است' },
    { status: 501 }
  );
}
