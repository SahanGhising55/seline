/**
 * Single Memory API Routes
 *
 * GET    - Get a single memory
 * PATCH  - Update memory (approve, reject, edit)
 * DELETE - Delete a memory
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { getOrCreateLocalUser } from "@/lib/db/queries";
import { getCharacter } from "@/lib/characters/queries";
import { loadSettings } from "@/lib/settings/settings-manager";
import { AgentMemoryManager, type MemoryCategory } from "@/lib/agent-memory";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string; memoryId: string }> };

// GET - Get a single memory
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id: characterId, memoryId } = await params;

    // Verify character ownership
    const character = await getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const manager = new AgentMemoryManager(characterId);
    const memory = await manager.getMemory(memoryId);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("[Memory API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get memory" },
      { status: 500 }
    );
  }
}

// Schema for updating a memory
const updateMemorySchema = z.object({
  action: z.enum(["approve", "reject", "edit"]),
  content: z.string().min(1).max(1000).optional(),
  category: z.enum([
    "visual_preferences",
    "communication_style",
    "workflow_patterns",
    "domain_knowledge",
    "business_rules",
  ]).optional(),
  reasoning: z.string().max(500).optional(),
});

// PATCH - Update memory (approve, reject, edit)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id: characterId, memoryId } = await params;

    // Verify character ownership
    const character = await getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = updateMemorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const manager = new AgentMemoryManager(characterId);
    const { action, content, category, reasoning } = parseResult.data;

    let memory;
    switch (action) {
      case "approve":
        memory = await manager.approveMemory(memoryId, {
          content,
          category: category as MemoryCategory,
        });
        if (!memory) {
          return NextResponse.json({ error: "Memory not found" }, { status: 404 });
        }
        break;

      case "reject":
        const rejected = await manager.rejectMemory(memoryId);
        if (!rejected) {
          return NextResponse.json({ error: "Memory not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });

      case "edit":
        memory = await manager.updateMemory(memoryId, {
          content,
          category: category as MemoryCategory,
          reasoning,
        });
        if (!memory) {
          return NextResponse.json({ error: "Memory not found" }, { status: 404 });
        }
        break;
    }

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error("[Memory API] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update memory" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a memory permanently
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id: characterId, memoryId } = await params;

    // Verify character ownership
    const character = await getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const manager = new AgentMemoryManager(characterId);
    const deleted = await manager.deleteMemory(memoryId);

    if (!deleted) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Memory API] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete memory" },
      { status: 500 }
    );
  }
}
