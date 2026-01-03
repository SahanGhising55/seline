# AI Pipelines

This document covers Seline's AI/ML components: LLM providers, vector search, embeddings, prompt enhancement, tools, memory, and media generation.

---

## LLM Providers (`lib/ai/providers.ts`)

Seline supports multiple LLM providers with runtime switching.

### Supported Providers

| Provider | Package | Models |
|----------|---------|--------|
| **Anthropic** | `@ai-sdk/anthropic` | Claude Sonnet 4.5, Claude Haiku 4.5 |
| **OpenRouter** | `@ai-sdk/openai-compatible` | 100+ models via unified API |

### Model Roles

| Function | Purpose | Fallback |
|----------|---------|----------|
| `getChatModel()` | Main conversation model | Provider default |
| `getResearchModel()` | Deep research mode | Chat model |
| `getVisionModel()` | Image analysis | Chat model (Claude has native vision) |
| `getUtilityModel()` | Background tasks (compaction, extraction) | Claude Haiku 4.5 / Gemini 2.5 Flash |
| `getEmbeddingModel()` | Vector embeddings | OpenRouter or local |

### Model Routing

```typescript
// getModelByName automatically routes to correct provider:
// - Claude models (claude-*) → Anthropic provider
// - Other models (provider/model format) → OpenRouter provider

const model = getModelByName("claude-sonnet-4-20250514"); // → Anthropic
const model = getModelByName("google/gemini-2.5-flash");   // → OpenRouter
```

### Provider Configuration

```json
{
  "llmProvider": "anthropic",
  "anthropicApiKey": "sk-ant-...",
  "openrouterApiKey": "sk-or-...",
  "chatModel": "claude-sonnet-4-20250514",
  "researchModel": "claude-sonnet-4-20250514",
  "visionModel": "claude-sonnet-4-20250514"
}
```

---

## Vector Database (`lib/vectordb/`)

LanceDB provides embedded vector search with no external server required.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Vector Pipeline                      │
│                                                       │
│  Documents → Chunking → Embeddings → LanceDB Tables  │
│      │           │           │              │         │
│      ▼           ▼           ▼              ▼         │
│  File/PDF   Token-based  Local or       Per-agent    │
│  parsing    splitting    Remote API     collections  │
└──────────────────────────────────────────────────────┘
```

### Module Structure

| Module | Lines | Purpose |
|--------|-------|---------|
| `client.ts` | 92 | LanceDB connection singleton |
| `sync-service.ts` | 1144 | Folder sync orchestration with parallel processing |
| `indexing.ts` | 1060 | Document chunking and embedding |
| `search.ts` | 879 | Similarity search queries |
| `search-router.ts` | 593 | Query routing between sources |
| `file-watcher.ts` | 619 | Real-time file change detection (chokidar) |
| `collections.ts` | 995 | Per-character table management |
| `background-sync.ts` | 648 | Background sync scheduling |

### Sync Service Features

- **Parallel Processing**: Configurable concurrency (default: 5)
- **File Hash Tracking**: Only re-indexes changed files
- **Timeout Handling**: 30-second per-file timeout
- **Progress Reporting**: Real-time progress updates to UI
- **Abort Support**: Cancellable sync operations

```typescript
interface SyncResult {
  folderId: string;
  filesProcessed: number;
  filesIndexed: number;
  filesSkipped: number;
  filesRemoved: number;
  errors: string[];
}
```

### Collections

Each agent has isolated vector collections:
- Table naming: `docs_{characterId}`
- Automatic schema rebuild on embedding model change
- Per-folder filtering via `folderId` metadata

### Vector Search Configuration

```typescript
{
  vectorDBEnabled: true,
  vectorSearchMaxChunks: 30,          // Max chunks to return
  vectorSearchTokenChunkSize: 256,     // Tokens per chunk
  vectorSearchTokenChunkStride: 8,     // Overlap stride
  vectorSearchMaxFileLines: 3000,      // Skip very large files
  vectorSearchMaxLineLength: 1000,     // Skip binary/minified
  vectorSearchRerankerEnabled: true,   // LLM reranking
}
```

---

## Embedding Pipeline

### Provider Options

| Provider | Model | Dimensions | Trade-offs |
|----------|-------|------------|------------|
| **Local** (Transformers.js) | bge-large-en-v1.5 | 1024 | Private, offline, higher quality, bundled with Electron |
| **OpenRouter** | qwen/qwen3-embedding-4b | 2048 | Fast, requires API key |

### Local Embeddings (`lib/ai/local-embeddings.ts`)

Uses `@xenova/transformers` with ONNX runtime:

```typescript
// Default bundled model
const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/bge-large-en-v1.5";

// Model loading with caching
const pipeline = await pipeline("feature-extraction", modelName, {
  cache_dir: process.env.EMBEDDING_CACHE_DIR,
  local_files_only: false, // Downloads on first use
});

// Storage locations (set by Electron main process)
// EMBEDDING_MODEL_DIR: {userData}/models/
// EMBEDDING_CACHE_DIR: {userData}/models-cache/
```

### Embedding Model Selection Logic

```typescript
function getEmbeddingModelId(): string {
  const settings = loadSettings();
  
  // Check settings for explicit model
  if (settings.embeddingModel) {
    return settings.embeddingModel;
  }
  
  // Check if local embeddings available
  if (canUseLocalEmbeddings()) {
    return `local:${DEFAULT_LOCAL_EMBEDDING_MODEL}`;
  }
  
  // Fall back to OpenRouter
  return `openrouter:${DEFAULT_EMBEDDING_MODEL}`;
}
```

### Local Embedding Availability

Local embeddings are available when:
1. Running in Electron (`ELECTRON_USER_DATA_PATH` is set)
2. Or `ALLOW_LOCAL_EMBEDDINGS=true` (development)
3. Or `EMBEDDING_MODEL_DIR` is set and exists

---

## Prompt Enhancement (`lib/ai/prompt-enhancement.ts`)

Enriches user queries with relevant context from synced folders (875 lines).

### Pipeline Stages

```
1. Concept Expansion     → 2. Vector Search     → 3. Dependency Resolution
   (domain mappings)        (LanceDB query)        (import chain following)
                                    │
                                    ▼
           4. Snippet Selection ← 5. Context Formatting
              (token budget)        (markdown code blocks)
```

### Domain Expansions (No LLM Call)

Fast term expansion using predefined mappings:

```typescript
const DOMAIN_EXPANSIONS = {
  // Authentication & Security
  auth: ["authentication", "session", "token", "login", "user", "jwt", "oauth"],
  login: ["authentication", "signin", "session", "user", "password"],
  
  // API & Networking
  api: ["endpoint", "route", "rest", "graphql", "request", "response"],
  fetch: ["http", "request", "api", "client", "networking"],
  
  // Database
  database: ["sql", "query", "orm", "schema", "migration", "drizzle"],
  query: ["sql", "select", "insert", "update", "delete", "where"],
  
  // AI/ML
  embedding: ["vector", "similarity", "search", "semantic"],
  vector: ["embedding", "similarity", "search", "semantic", "lance"],
  llm: ["language", "model", "ai", "prompt", "completion"],
  
  // ... 20+ more domains
};
```

### Token Budget Management

```typescript
const DEFAULT_TOKEN_BUDGET = {
  total: 4000,       // ~16K chars total enhanced prompt
  filePointers: 500, // ~2K chars for file list
  snippets: 3000,    // ~12K chars for content snippets
  metadata: 500,     // ~2K chars for instructions
};

// Token estimation: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Dependency Resolution

Automatic import chain following:
- Detects `import`, `require`, `@/` alias references
- Resolves relative paths to absolute
- Searches for referenced files in vector DB
- Includes related files in context

---

## Deep Research (`lib/ai/deep-research/`)

Multi-step research agent inspired by ThinkDepth.ai (459 lines orchestrator).

### 6-Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Deep Research Flow                        │
│                                                              │
│  Phase 1: PLANNING          Phase 2: QUERY GENERATION       │
│  ┌─────────────────┐        ┌─────────────────────────┐     │
│  │ Analyze query   │   →    │ Generate search queries │     │
│  │ Create plan     │        │ from research questions │     │
│  └─────────────────┘        └─────────────────────────┘     │
│                                      │                       │
│                                      ▼                       │
│  Phase 3: SEARCHING         Phase 4: SYNTHESIS              │
│  ┌─────────────────┐        ┌─────────────────────────┐     │
│  │ Parallel web    │   →    │ Analyze findings        │     │
│  │ & local search  │        │ Generate draft report   │     │
│  └─────────────────┘        └─────────────────────────┘     │
│                                      │                       │
│                                      ▼                       │
│  Phase 5: REFINEMENT        Phase 6: FINALIZATION           │
│  ┌─────────────────┐        ┌─────────────────────────┐     │
│  │ Identify gaps   │   →    │ Generate final report   │     │
│  │ Additional      │        │ with citations          │     │
│  │ searches        │        │                         │     │
│  └─────────────────┘        └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

```typescript
interface DeepResearchConfig {
  maxSearchQueries: number;     // Default: 10
  maxSearchResults: number;     // Per query
  includeLocalSearch: boolean;  // Include vector DB
  abortSignal?: AbortSignal;    // For cancellation
}
```

---

## Agent Memory (`lib/agent-memory/`)

Per-agent persistent memory with approval workflow.

### Storage Structure

```
{userData}/data/agents/{characterId}/memory/
├── memories.json     # Structured memory entries (array)
├── memory.md         # Human-readable (injected into prompts)
├── memory-log.jsonl  # Append-only audit trail
└── metadata.json     # Stats and timestamps
```

### Memory Categories

| Category | Description | Example |
|----------|-------------|---------|
| `preference` | User preferences and habits | "Prefers dark mode" |
| `fact` | Stated facts about user | "Works at Acme Corp" |
| `context` | Situational context | "Working on React project" |
| `instruction` | User-given directives | "Always use TypeScript" |
| `relationship` | Relationship dynamics | "Colleague is Sarah" |

### Memory Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Extraction  │ ──► │   Pending   │ ──► │  Approved   │
│   (LLM)     │     │             │     │             │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                      User Review         Prompt Injection
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     System message
                    │  Rejected   │     with memories
                    └─────────────┘
```

### AgentMemoryManager API

```typescript
class AgentMemoryManager {
  // Loading
  loadAllMemories(): Promise<MemoryEntry[]>;
  loadApprovedMemories(): Promise<MemoryEntry[]>;
  loadPendingMemories(): Promise<MemoryEntry[]>;
  
  // CRUD
  addMemory(input: CreateMemoryInput): Promise<MemoryEntry>;
  updateMemory(id: string, updates: UpdateMemoryInput): Promise<MemoryEntry | null>;
  deleteMemory(id: string): Promise<boolean>;
  
  // Approval workflow
  approveMemory(id: string, edits?: Partial<UpdateMemoryInput>): Promise<MemoryEntry | null>;
  rejectMemory(id: string): Promise<boolean>;
  
  // Prompt injection
  formatForPrompt(): string;  // Returns markdown formatted memories
}
```

---

## Tool System (`lib/ai/tool-registry/`)

Modular tool architecture with deferred loading for token efficiency.

### Registry Pattern

```typescript
// Singleton registry persisted across Next.js hot reloads
const registry = ToolRegistry.getInstance();

// Register a tool
registry.register("imageEdit", metadata, factory);

// Get tools for execution
const tools = registry.getTools({
  sessionId: "...",
  characterId: "...",
  userId: "...",
  loadingMode: "deferred",
});
```

### Loading Modes

| Mode | Behavior | Token Impact | When to Use |
|------|----------|--------------|-------------|
| **Deferred** | Core tools only; others via `requestTool` | ~500 tokens | Long conversations |
| **Always** | All registered tools in every request | ~3000+ tokens | Quick tasks |

### Tool Categories (from tool-definitions.ts)

| Category | Tools |
|----------|-------|
| **Search** | docsSearch, vectorSearch, webSearch, localGrep |
| **Media** | describeImage, gpt5ImageGenerate/Edit/Reference, gemini25FlashImageGenerate/Edit/Reference, gemini3ProImageGenerate/Edit/Reference, flux2FlexGenerate/Edit/Reference |
| **Research** | webBrowse, webQuery, firecrawlCrawl |
| **Knowledge** | readFile, retrieveFullContent |
| **Utility** | searchTools, listAllTools |

### Deferred Tool Discovery

When in deferred mode:

```typescript
// Agent discovers available tools
const tools = registry.getAvailableToolsList();
// → [{name: "imageEdit", description: "...", isDeferred: true}, ...]

// Agent can search for specific functionality
const results = registry.search("image generation", 5);

// Agent requests a specific tool
const tool = registry.get("flux2Generate")?.factory(context);
```

### Tool Metadata

```typescript
interface ToolMetadata {
  displayName: string;
  category: ToolCategory;
  description: string;           // Short, for tool discovery
  fullInstructions?: string;     // Detailed usage guide (for searchTools)
  deferred: boolean;             // Load on-demand vs always-on
  requiresApiKey?: string;       // Optional API key requirement
  enabledByEnv?: string;         // Environment variable check
}
```

---

## Vector Search Tool V2 (`lib/ai/vector-search/tool.ts`)

LLM-powered intelligent search with synthesis (807 lines).

### Features

- Semantic search with query understanding
- Secondary LLM for result synthesis
- File reading from synced folders AND knowledge base
- Path validation security checks
- Code language detection for syntax highlighting

### Components

| Function | Purpose |
|----------|---------|
| `createVectorSearchToolV2` | Main search with LLM synthesis |
| `createVectorQueryTool` | Basic query for follow-up searches |
| `createReadFileTool` | Read from synced folders or knowledge base |

### Read File Tool

Supports reading from two sources:
1. **Knowledge Base documents** — Uploaded PDFs, text, Markdown with extracted text
2. **Synced folders** — File system folders indexed for vector search

```typescript
interface ReadFileResult {
  status: "success" | "error";
  filePath?: string;
  language?: string;           // For syntax highlighting
  lineRange?: string;          // e.g., "1-100"
  totalLines?: number;
  content?: string;
  truncated?: boolean;
  source?: "synced_folder" | "knowledge_base";
  documentTitle?: string;      // For KB documents
}
```

## Image Generation

Seline uses OpenRouter image models for generation, editing, and reference-based image creation.

### Active Image Tools

| Tool | Model | Capabilities |
|------|-------|--------------|
| `gpt5ImageMiniGenerate` | GPT-5 Image Mini | Text-to-image generation |
| `gpt5ImageMiniEdit` | GPT-5 Image Mini | Image editing with prompts |
| `gpt5ImageMiniReference` | GPT-5 Image Mini | Reference-guided generation |
| `gpt5ImageGenerate` | GPT-5 Image | Higher quality text-to-image |
| `gpt5ImageEdit` | GPT-5 Image | Higher quality image editing |
| `gpt5ImageReference` | GPT-5 Image | Reference-guided generation |
| `gemini25FlashImageGenerate` | Gemini 2.5 Flash | Fast text-to-image |
| `gemini25FlashImageEdit` | Gemini 2.5 Flash | Fast image editing |
| `gemini25FlashImageReference` | Gemini 2.5 Flash | Reference-guided generation |
| `gemini3ProImageGenerate` | Gemini 3 Pro | High quality text-to-image |
| `gemini3ProImageEdit` | Gemini 3 Pro | High quality editing |
| `gemini3ProImageReference` | Gemini 3 Pro | Reference-guided generation |
| `flux2FlexGenerate` | Flux 2 Flex | Text-to-image with style options |
| `flux2FlexEdit` | Flux 2 Flex | Image editing |
| `flux2FlexReference` | Flux 2 Flex | Reference-guided generation (0-10 images) |

### Vision Analysis

| Tool | Description |
|------|-------------|
| `describeImage` | Vision model analysis (always loaded, uses Claude or OpenRouter vision model) |

### Tool Operations

Each image model supports 3 operation types:
- **Generate**: Text-to-image from prompt only
- **Edit**: Modify an existing image with instructions
- **Reference**: Generate using 1+ reference images for style/content guidance

### Legacy Tools (Disabled by Default)

The following tools require `ENABLE_LEGACY_IMAGE_TOOLS=true`:
- `editImage` — Gemini-based image editing
- `generateImageFlux2` — Direct Flux 2 API (not via OpenRouter)
- `wan22Imagen` — WAN 2.2 image generation
- `wan22Video` / `wan22PixelVideo` — Video generation (not active)

---

## Video Assembly (`lib/ai/video-assembly/`)

> **Note**: Video generation tools are not currently active in production. The Remotion-based assembly system exists but is not exposed to agents.

---

## Web Browsing (`lib/ai/web-browse/`)

Multi-step web browsing with session persistence.

### Module Structure

| File | Purpose |
|------|---------|
| `orchestrator.ts` (16K) | Page navigation and extraction |
| `session-store.ts` (11K) | Browser session persistence |
| `synthesizer.ts` (12K) | Content synthesis from pages |
| `tool.ts` (6.8K) | Tool wrapper |

### Session Store

- Maintains browser context across tool calls
- Stores extracted content with expiration
- Enables follow-up queries on same pages

---

## Document Processing (`lib/documents/`)

### Module Structure

| File | Purpose |
|------|---------|
| `parser.ts` | PDF, HTML, Markdown, plain text parsing |
| `chunking.ts` | Token-based text chunking |
| `embeddings.ts` | Embedding generation and storage |

### Supported Formats

| Format | Parser |
|--------|--------|
| PDF | `pdf-parse` |
| HTML | Custom DOM parser |
| Markdown | Native |
| Plain text | Native |

---

## LLM Session Management

### Context Handling

- Messages stored in SQLite with session IDs
- Memory injection at prompt build time
- Vector context injected via enhancement
- Tool results persisted in `toolRuns` table

### Streaming

```typescript
const result = streamText({
  model: getChatModel(),
  messages: preparedMessages,
  tools: registry.getTools(context),
  maxSteps: 100,              // From AI_CONFIG
  temperature: 0.85,          // Creative responses
  abortSignal: request.signal,
});
```

### Tool Execution

- Up to 100 tool roundtrips per request
- Automatic tool result injection
- Parallel tool execution where possible
- Error handling with retry logic
