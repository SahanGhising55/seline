import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage/local-storage";
import { createImage, getSession, getOrCreateLocalUser } from "@/lib/db/queries";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/local-auth";
import { loadSettings } from "@/lib/settings/settings-manager";

export async function POST(req: NextRequest) {
  try {
    // Get local user for offline mode
    const userId = await requireAuth(req);
    const settings = loadSettings();
    const dbUser = await getOrCreateLocalUser(userId, settings.localUserEmail);

    const contentType = req.headers.get("content-type") || "";

    // Handle form data uploads
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const sessionId = formData.get("sessionId") as string | null;
      const role = (formData.get("role") as string) || "upload";

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate session ownership if sessionId is provided
      if (sessionId) {
        const session = await getSession(sessionId);
        if (session && session.userId !== dbUser.id) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
      }

      // Use a temporary session ID if none provided
      const effectiveSessionId = sessionId || `temp-${nanoid()}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await saveFile(
        buffer,
        effectiveSessionId,
        file.name,
        role as "upload" | "reference" | "generated" | "mask" | "tile"
      );

      // Save to database if we have a real session
      if (sessionId) {
        await createImage({
          sessionId,
          role: role as "upload" | "reference" | "generated" | "mask" | "tile",
          localPath: result.localPath,
          url: result.url,
          metadata: { originalFilename: file.name },
        });
      }

      return NextResponse.json({
        url: result.url,
        localPath: result.localPath,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
    }

    // For offline mode, we don't support presigned URLs
    // All uploads must go through form data
    return NextResponse.json(
      { error: "Presigned URLs are not supported in offline mode. Use form data upload instead." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
