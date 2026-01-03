/**
 * Memory Extraction API Route
 *
 * POST - Manually trigger memory extraction for a session
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { getOrCreateLocalUser } from "@/lib/db/queries";
import { getCharacter } from "@/lib/characters/queries";
import { loadSettings } from "@/lib/settings/settings-manager";
import { manualExtraction } from "@/lib/agent-memory";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// Schema for extraction request
const extractSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

// POST - Trigger manual extraction
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id: characterId } = await params;

    // Verify character ownership
    const character = await getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = extractSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId } = parseResult.data;

    // Run extraction
    const result = await manualExtraction(characterId, sessionId);

    return NextResponse.json({
      success: true,
      extracted: result.extracted.length,
      skipped: result.skipped,
      memories: result.extracted,
      error: result.error,
    });
  } catch (error) {
    console.error("[Memory API] Extract error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract memories" },
      { status: 500 }
    );
  }
}
