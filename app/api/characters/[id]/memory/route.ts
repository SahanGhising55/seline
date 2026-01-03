/**
 * Memory API Routes
 *
 * GET  - List memories (all, pending, or approved)
 * POST - Add a manual memory
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { getOrCreateLocalUser } from "@/lib/db/queries";
import { getCharacter } from "@/lib/characters/queries";
import { loadSettings } from "@/lib/settings/settings-manager";
import { AgentMemoryManager, type MemoryCategory } from "@/lib/agent-memory";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET - List memories
export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const manager = new AgentMemoryManager(characterId);
    const filter = req.nextUrl.searchParams.get("filter") || "all";

    let memories;
    switch (filter) {
      case "pending":
        memories = await manager.loadPendingMemories();
        break;
      case "approved":
        memories = await manager.loadApprovedMemories();
        break;
      default:
        memories = await manager.loadAllMemories();
    }

    const metadata = await manager.getMetadata();

    return NextResponse.json({ memories, metadata });
  } catch (error) {
    console.error("[Memory API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load memories" },
      { status: 500 }
    );
  }
}

// Schema for adding a manual memory
const addMemorySchema = z.object({
  category: z.enum([
    "visual_preferences",
    "communication_style",
    "workflow_patterns",
    "domain_knowledge",
    "business_rules",
  ]),
  content: z.string().min(1, "Content is required").max(1000, "Content too long"),
  reasoning: z.string().max(500).optional(),
});

// POST - Add a manual memory
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
    const parseResult = addMemorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const manager = new AgentMemoryManager(characterId);
    const memory = await manager.addMemory({
      category: parseResult.data.category as MemoryCategory,
      content: parseResult.data.content,
      reasoning: parseResult.data.reasoning || "Manually added by user",
      confidence: 1.0, // Manual entries have full confidence
      importance: 1.0, // Manual entries are always important
      factors: {
        repetition: 1.0,
        impact: 1.0,
        specificity: 1.0,
        recency: 1.0,
        conflictResolution: 0,
      },
      status: "approved", // Manual entries are auto-approved
      source: "manual",
    });

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error("[Memory API] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add memory" },
      { status: 500 }
    );
  }
}
