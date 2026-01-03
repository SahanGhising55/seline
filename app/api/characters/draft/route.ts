import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { getOrCreateLocalUser } from "@/lib/db/queries";
import { loadSettings } from "@/lib/settings/settings-manager";
import { createCharacter } from "@/lib/characters/queries";
import { createCharacterSchema, agentMetadataSchema } from "@/lib/characters/validation";
import { z } from "zod";

/**
 * Draft character creation schema for B2B agent wizard.
 * Creates a draft character that can be finalized later.
 */
const draftCharacterSchema = z.object({
  character: createCharacterSchema,
  metadata: agentMetadataSchema.optional(),
});

/**
 * POST /api/characters/draft
 * 
 * Creates a draft character for the wizard flow.
 * This allows document uploads before finalizing the character.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);

    const body = await req.json();

    // Validate input
    const parseResult = draftCharacterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { character: charData, metadata } = parseResult.data;

    // Create the draft character
    const character = await createCharacter({
      ...charData,
      userId: dbUser.id,
      status: "draft",
      metadata: metadata ?? {},
    });

    return NextResponse.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error("Create draft character error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create draft character" },
      { status: 500 }
    );
  }
}

