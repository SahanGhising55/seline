
import { db } from "@/lib/db/sqlite-client";
import { agentSyncFolders } from "@/lib/db/sqlite-character-schema";

async function main() {
    console.log("Querying agent_sync_folders...");
    const folders = await db.select().from(agentSyncFolders);

    if (folders.length === 0) {
        console.log("No sync folders found.");
    } else {
        console.table(folders.map(f => ({
            id: f.id,
            path: f.folderPath,
            status: f.status,
            files: f.fileCount,
            updated: f.updatedAt
        })));
    }
}

main().catch(console.error).finally(() => process.exit(0));
