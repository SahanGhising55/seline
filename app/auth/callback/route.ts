import { NextRequest, NextResponse } from "next/server";

// In offline mode, auth callbacks are not used - redirect to home
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  return NextResponse.redirect(`${origin}/`);
}

