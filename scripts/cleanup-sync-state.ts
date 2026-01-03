
import { db } from "@/lib/db/sqlite-client";
import { agentSyncFolders, agentSyncFiles } from "@/lib/db/sqlite-character-schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Cleaning up stuck sync folders...");

    // IDs identified from diagnostic script
    const stuckIds = [
        '696417ae-96c9-4344-b065-2c56aea37f7c',
        '14549457-de6d-4f10-b77a-41c08a453d8f'
    ];

    for (const id of stuckIds) {
        console.log(`Deleting file records for folder folder ${id}...`);
        await db.delete(agentSyncFiles).where(eq(agentSyncFiles.folderId, id));

        console.log(`Deleting folder record ${id}...`);
        await db.delete(agentSyncFolders).where(eq(agentSyncFolders.id, id));
    }

    console.log("Cleanup complete.");
}

main().catch(console.error).finally(() => process.exit(0));
