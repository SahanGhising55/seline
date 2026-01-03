import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/local-auth";
import { getOrCreateLocalUser } from "@/lib/db/queries";
import { loadSettings } from "@/lib/settings/settings-manager";
import {
  getCharacter,
  getCharacterImages,
  createCharacterImage,
  deleteCharacterImage,
  setPrimaryCharacterImage,
} from "@/lib/characters";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET - List all images for a character
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id } = await params;

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const images = await getCharacterImages(id);
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Get character images error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get images" },
      { status: 500 }
    );
  }
}

// POST - Add a new image to a character
const createImageSchema = z.object({
  // Allow relative paths (e.g., /api/media/...) or full URLs
  url: z.string().min(1),
  localPath: z.string().min(1), // Required - local filesystem path
  imageType: z.enum(["portrait", "full_body", "expression", "outfit", "scene", "avatar"]).default("avatar"),
  isPrimary: z.boolean().default(false),
  thumbnailUrl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id } = await params;

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = createImageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const image = await createCharacterImage({
      characterId: id,
      ...parseResult.data,
    });

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Create character image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create image" },
      { status: 500 }
    );
  }
}

// PATCH - Set primary image
const setPrimarySchema = z.object({
  imageId: z.string(),
});

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id } = await params;

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = setPrimarySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const image = await setPrimaryCharacterImage(id, parseResult.data.imageId);
    return NextResponse.json({ image });
  } catch (error) {
    console.error("Set primary image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set primary" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an image
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);
    const { id } = await params;

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (character.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");
    if (!imageId) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    await deleteCharacterImage(imageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete character image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete image" },
      { status: 500 }
    );
  }
}

