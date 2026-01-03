/**
 * Admin API: List Prompt Templates
 * 
 * GET /api/admin/prompts - List all prompt templates
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { listPromptTemplates } from "@/lib/observability";

export async function GET(req: NextRequest) {
  try {
    // Skip auth in development for admin endpoints
    if (process.env.NODE_ENV !== "development") {
      await requireAuth(req);
    }

    const templates = await listPromptTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[Admin API] Error listing prompts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list prompts" },
      { status: 500 }
    );
  }
}

