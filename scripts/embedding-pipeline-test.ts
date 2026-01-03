import path from "node:path";
import process from "node:process";

const timestamp = Date.now();
const testDataPath = path.join(process.cwd(), ".local-data", `embedding-pipeline-test-${timestamp}`);

process.env.LOCAL_DATA_PATH = testDataPath;
process.env.EMBEDDING_PROVIDER = "local";
process.env.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/bge-large-en-v1.5";
process.env.EMBEDDING_CACHE_DIR =
  process.env.EMBEDDING_CACHE_DIR || path.join(testDataPath, "transformers-cache");
process.env.ALLOW_LOCAL_EMBEDDINGS = process.env.ALLOW_LOCAL_EMBEDDINGS || "true";

async function main() {
  const { loadSettings, saveSettings } = await import("../lib/settings/settings-manager");
  const settings = loadSettings();
  saveSettings({
    ...settings,
    vectorDBEnabled: true,
    embeddingProvider: "local",
    embeddingModel: process.env.EMBEDDING_MODEL,
  });

  const { indexTextToVectorDB } = await import("../lib/vectordb/indexing");
  const { searchVectorDB } = await import("../lib/vectordb/search");
  const { closeLanceDB } = await import("../lib/vectordb/client");

  const characterId = "embedding-pipeline-test";
  const folderId = "embedding-pipeline-test";
  const sourceName = "embedding-pipeline";
  const sampleText = `
function greet(name) {
  return \`Hello, \${name}!\`;
}

function add(a, b) {
  return a + b;
}
  `.trim();

  console.log("[Embedding Pipeline Test] Data path:", testDataPath);
  console.log("[Embedding Pipeline Test] Provider:", process.env.EMBEDDING_PROVIDER);
  console.log("[Embedding Pipeline Test] Model:", process.env.EMBEDDING_MODEL);

  const indexResult = await indexTextToVectorDB({
    characterId,
    folderId,
    text: sampleText,
    sourceName,
  });

  if (indexResult.error) {
    console.error("[Embedding Pipeline Test] Indexing failed:", indexResult.error);
    process.exitCode = 1;
    closeLanceDB();
    return;
  }

  console.log(
    `[Embedding Pipeline Test] Indexed ${indexResult.chunkCount} chunks from ${sourceName}`
  );

  const results = await searchVectorDB({
    characterId,
    query: "function that returns a greeting for a name",
    options: { topK: 5, minScore: 0.1 },
  });

  if (!results.length) {
    console.error("[Embedding Pipeline Test] No search results returned.");
    process.exitCode = 1;
  } else {
    console.log(
      `[Embedding Pipeline Test] Top result score: ${results[0].score.toFixed(4)}`
    );
    console.log("[Embedding Pipeline Test] Top result path:", results[0].relativePath);
  }

  closeLanceDB();
}

main().catch((error) => {
  console.error("[Embedding Pipeline Test] Failed:", error);
  process.exitCode = 1;
});
