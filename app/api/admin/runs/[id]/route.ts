/**
 * Admin API: Get Agent Run Details
 * 
 * GET /api/admin/runs/[id] - Get run with events
 */

import { NextRequest, NextResponse } from "next/server";
import { getAgentRunWithEvents } from "@/lib/observability";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Run ID is required" },
        { status: 400 }
      );
    }

    const result = await getAgentRunWithEvents(id);

    if (!result) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Admin API] Error getting run:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get run" },
      { status: 500 }
    );
  }
}

