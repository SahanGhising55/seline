/**
 * Admin API: List Agent Runs
 * 
 * GET /api/admin/runs - List runs with filters and pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { listAgentRuns, type ListAgentRunsOptions } from "@/lib/observability";
import type { AgentRunStatus } from "@/lib/db/sqlite-schema";

export async function GET(req: NextRequest) {
  try {

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;

    const options: ListAgentRunsOptions = {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "50", 10),
      sessionId: searchParams.get("sessionId") || search || undefined,
      userId: searchParams.get("userId") || (search && !search.includes("-") ? search : undefined),
      pipelineName: searchParams.get("pipelineName") || undefined,
      status: (searchParams.get("status") as AgentRunStatus) || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    // Validate limit
    if (options.limit && options.limit > 100) {
      options.limit = 100;
    }

    const result = await listAgentRuns(options);

    return NextResponse.json({
      runs: result.runs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error("[Admin API] Error listing runs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list runs" },
      { status: 500 }
    );
  }
}

