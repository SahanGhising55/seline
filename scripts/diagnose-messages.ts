/**
 * Diagnostic script to check message persistence in the database
 * Run with: npx tsx --env-file=.env.local scripts/diagnose-messages.ts
 */

// Verify DATABASE_URL is loaded
console.log("DATABASE_URL:", process.env.DATABASE_URL || "(not set)");

import { db } from "../lib/db/client";
import { sessions, messages } from "../lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

async function diagnose() {
  console.log("\n========================================");
  console.log("MESSAGE PERSISTENCE DIAGNOSTIC");
  console.log("========================================\n");

  // 1. List all active sessions
  console.log("1. LISTING ACTIVE SESSIONS:");
  const allSessions = await db.query.sessions.findMany({
    where: eq(sessions.status, "active"),
    orderBy: desc(sessions.updatedAt),
    limit: 10,
  });

  console.log(`   Found ${allSessions.length} active sessions:\n`);
  for (const session of allSessions) {
    console.log(`   - ID: ${session.id}`);
    console.log(`     Title: ${session.title || "(no title)"}`);
    console.log(`     Created: ${session.createdAt}`);
    console.log(`     Updated: ${session.updatedAt}\n`);
  }

  if (allSessions.length === 0) {
    console.log("   No sessions found. Creating a test session would help diagnose.\n");
    process.exit(0);
  }

  // 2. For the most recent session, get all messages
  const latestSession = allSessions[0];
  console.log("========================================");
  console.log(`2. MESSAGES FOR LATEST SESSION: ${latestSession.id}`);
  console.log("========================================\n");

  const allMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, latestSession.id),
    orderBy: asc(messages.createdAt),
  });

  console.log(`   Total messages in DB: ${allMessages.length}\n`);

  for (const msg of allMessages) {
    console.log(`   [${msg.role.toUpperCase()}] ID: ${msg.id}`);
    console.log(`   Created: ${msg.createdAt}`);
    console.log(`   Is Compacted: ${msg.isCompacted}`);
    
    // Show content preview
    const content = msg.content as unknown[];
    if (Array.isArray(content)) {
      console.log(`   Content parts: ${content.length}`);
      for (const part of content) {
        const p = part as { type?: string; text?: string; toolName?: string };
        if (p.type === "text") {
          const preview = p.text?.substring(0, 80) || "";
          console.log(`     - text: "${preview}${(p.text?.length || 0) > 80 ? "..." : ""}"`);
        } else if (p.type === "image") {
          console.log(`     - image`);
        } else if (p.type === "tool-call") {
          console.log(`     - tool-call: ${p.toolName}`);
        } else if (p.type === "tool-result") {
          console.log(`     - tool-result`);
        }
      }
    }
    console.log("");
  }

  // 3. Check the raw SQL query that getSessionWithMessages would run
  console.log("========================================");
  console.log("3. QUERY ANALYSIS");
  console.log("========================================\n");
  
  console.log("   The getSessionWithMessages function uses:");
  console.log("   db.query.messages.findMany({");
  console.log("     where: eq(messages.sessionId, id),");
  console.log("     orderBy: asc(messages.createdAt),");
  console.log("   });");
  console.log("");
  console.log("   This query has NO LIMIT clause - should return all messages.");
  console.log("");

  // 4. Check for any duplicate message IDs
  console.log("========================================");
  console.log("4. CHECKING FOR DUPLICATE MESSAGE IDs");
  console.log("========================================\n");

  const messageIds = allMessages.map(m => m.id);
  const uniqueIds = new Set(messageIds);
  if (messageIds.length !== uniqueIds.size) {
    console.log("   WARNING: Duplicate message IDs found!");
    const counts: Record<string, number> = {};
    for (const id of messageIds) {
      counts[id] = (counts[id] || 0) + 1;
    }
    for (const [id, count] of Object.entries(counts)) {
      if (count > 1) {
        console.log(`   - ${id}: ${count} occurrences`);
      }
    }
  } else {
    console.log("   No duplicate IDs found.");
  }
  console.log("");

  // 5. Summary
  console.log("========================================");
  console.log("5. SUMMARY");
  console.log("========================================\n");

  const userMsgs = allMessages.filter(m => m.role === "user");
  const assistantMsgs = allMessages.filter(m => m.role === "assistant");

  console.log(`   User messages: ${userMsgs.length}`);
  console.log(`   Assistant messages: ${assistantMsgs.length}`);
  console.log(`   Total: ${allMessages.length}`);
  console.log("");

  // 6. Check ALL sessions for message counts
  console.log("========================================");
  console.log("6. MESSAGE COUNTS PER SESSION");
  console.log("========================================\n");

  for (const session of allSessions) {
    const sessionMessages = await db.query.messages.findMany({
      where: eq(messages.sessionId, session.id),
    });
    console.log(`   Session ${session.id.substring(0, 8)}...: ${sessionMessages.length} messages`);
  }
  console.log("");

  // 7. Detailed view of latest session
  console.log("========================================");
  console.log(`7. LATEST SESSION: ${latestSession.id}`);
  console.log("========================================\n");

  const detailedSession = latestSession.id;
  const detailedMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, detailedSession),
    orderBy: asc(messages.createdAt),
  });

  for (const msg of detailedMessages) {
    console.log(`   [${msg.role.toUpperCase()}] ID: ${msg.id.substring(0, 8)}...`);
    console.log(`   Created: ${msg.createdAt}`);
    const content = msg.content as unknown[];
    if (Array.isArray(content)) {
      for (const part of content) {
        const p = part as { type?: string; text?: string; toolName?: string };
        if (p.type === "text") {
          const preview = p.text?.substring(0, 60) || "";
          console.log(`     text: "${preview}${(p.text?.length || 0) > 60 ? "..." : ""}"`);
        } else {
          console.log(`     ${p.type}`);
        }
      }
    }
    console.log("");
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});

