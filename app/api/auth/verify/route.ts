import { NextRequest, NextResponse } from "next/server";
import {
  parseSessionCookie,
  getUserById,
  hasAnyUsers,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-auth";

export async function GET(req: NextRequest) {
  try {
    // Check if any users exist first
    const usersExist = await hasAnyUsers();
    if (!usersExist) {
      // Clear any stale session cookie when no users exist
      const response = NextResponse.json({
        authenticated: false,
        noUsers: true,
        user: null,
      });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    const cookieHeader = req.headers.get("cookie");
    const sessionId = parseSessionCookie(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({
        authenticated: false,
        noUsers: false,
        user: null,
      });
    }

    const user = await getUserById(sessionId);

    if (!user) {
      // Session cookie exists but user doesn't - clear the invalid cookie
      const response = NextResponse.json({
        authenticated: false,
        noUsers: false,
        user: null,
      });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      noUsers: false,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("[Auth] Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed", authenticated: false },
      { status: 500 }
    );
  }
}
