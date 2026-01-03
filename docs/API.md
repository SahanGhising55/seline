# API Reference

Internal modules and API endpoints in Seline.

---

## HTTP API Routes

All routes are under `/app/api/` using Next.js Route Handlers.

### Authentication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/verify` | GET | Session verification |
| `/api/auth/signup` | POST | User registration |

**Login Request:**
```typescript
{
  email: string;
  password: string;
}
```

**Login Response:**
```typescript
{
  success: boolean;
  user?: { id: string; email: string; name: string };
  error?: string;
}
```

---

### Chat

#### `POST /api/chat`

Streaming chat completions with tool execution.

**Request:**
```typescript
{
  messages: Message[];
  sessionId: string;
  characterId?: string;
  enhancedPrompt?: string;  // Optional pre-enhanced prompt
}
```

**Response:** Server-Sent Events stream with AI SDK format

---

### Prompt Enhancement

#### `POST /api/enhance-prompt`

Enhance a query with vector search context.

**Request:**
```typescript
{
  query: string;
  characterId: string;
  options?: {
    tokenBudget?: Partial<TokenBudget>;
    expandConcepts?: boolean;
    resolveDependencies?: boolean;
    includeSnippets?: boolean;
  };
}
```

**Response:**
```typescript
{
  enhanced: boolean;
  prompt: string;
  originalQuery: string;
  filesFound?: number;
  chunksRetrieved?: number;
  expandedConcepts?: string[];
  dependenciesResolved?: number;
  skipReason?: string;
}
```

---

### Vector Sync

#### `POST /api/vector-sync`

Manage vector database synchronization.

**Actions:**
```typescript
// Sync folder changes
{ action: "sync", characterId: string, folderId?: string }

// Full reindex (drops and rebuilds)
{ action: "reindex-all", characterId: string }

// Get sync status
{ action: "status", characterId: string }

// Add sync folder
{ action: "add-folder", characterId: string, config: SyncFolderConfig }

// Remove sync folder
{ action: "remove-folder", folderId: string }
```

#### `GET /api/sync-status`

Get folder sync progress.

**Query Parameters:**
- `characterId` - Agent ID

**Response:**
```typescript
{
  folders: Array<{
    id: string;
    displayName: string;
    folderPath: string;
    status: "idle" | "syncing" | "error";
    progress?: { current: number; total: number };
    lastSync?: string;
    fileCount?: number;
  }>;
}
```

---

### Sessions

#### `GET /api/sessions`

List all sessions for a user/character.

**Query Parameters:**
- `characterId` - Optional filter by agent
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

**Response:**
```typescript
{
  sessions: Array<{
    id: string;
    title: string;
    characterId?: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  total: number;
}
```

#### `POST /api/sessions`

Create a new session.

**Request:**
```typescript
{
  title?: string;
  characterId?: string;
}
```

#### `GET /api/sessions/[id]`

Get session with messages.

**Response:**
```typescript
{
  session: Session;
  messages: Message[];
  character?: Character;
}
```

#### `DELETE /api/sessions/[id]`

Delete a session and all associated data.

---

### Characters (Agents)

#### `GET /api/characters`

List all agents/characters.

**Response:**
```typescript
{
  characters: Array<{
    id: string;
    name: string;
    persona?: string;
    avatar?: string;
    status: "active" | "archived";
    createdAt: string;
  }>;
}
```

#### `POST /api/characters`

Create a new agent.

**Request:**
```typescript
{
  name: string;
  persona?: string;
  systemPrompt?: string;
  avatar?: string;
  syncFolders?: SyncFolderConfig[];
}
```

#### `GET /api/characters/[id]`

Get agent details with documents and folders.

#### `PATCH /api/characters/[id]`

Update agent configuration.

#### `DELETE /api/characters/[id]`

Delete agent and all associated data.

---

### Settings

#### `GET /api/settings`

Get current settings.

**Response:**
```typescript
AppSettings  // See ARCHITECTURE.md for full interface
```

#### `POST /api/settings`

Update settings.

**Request:**
```typescript
Partial<AppSettings>
```

---

### Media

#### `GET /api/media/[...path]`

Serve local media files from `{userData}/data/media/`.

**Security:** Path validation ensures files are within allowed directory.

---

### Upload

#### `POST /api/upload`

Upload files to media storage.

**Request:** `multipart/form-data`
- `file` - The file to upload
- `sessionId` - Associated session
- `type` - File type category

**Response:**
```typescript
{
  url: string;           // local-media:// URL
  filePath: string;      // Relative path
  fileName: string;
  mimeType: string;
  size: number;
}
```

---

### Deep Research

#### `POST /api/deep-research`

Execute deep research agent.

**Request:**
```typescript
{
  query: string;
  characterId?: string;
  sessionId: string;
  config?: {
    maxSearchQueries?: number;
    maxSearchResults?: number;
    includeLocalSearch?: boolean;
  };
}
```

**Response:** Server-Sent Events with research phases:
```typescript
// Event types
{ phase: "planning", message: string }
{ phase: "searching", progress: { current: number; total: number } }
{ phase: "synthesizing", message: string }
{ phase: "complete", report: FinalReport }
{ phase: "error", error: string }
```

---

### Video Assembly

#### `POST /api/video-assembly`

Generate video from images.

**Request:**
```typescript
{
  sessionId: string;
  images: string[];        // Image URLs
  audio?: string;          // Audio URL
  duration?: number;       // Per-image duration (ms)
  transition?: string;     // Transition type
  outputFormat?: "mp4" | "webm";
}
```

**Response:**
```typescript
{
  videoUrl: string;
  duration: number;
  format: string;
}
```

---

### Web Browse

#### `POST /api/web-browse`

Execute web browsing operation.

**Request:**
```typescript
{
  url: string;
  sessionId: string;
  action?: "navigate" | "extract" | "screenshot";
  selector?: string;       // CSS selector for extraction
}
```

---

### YouTube

#### `POST /api/youtube`

Extract YouTube transcript.

**Request:**
```typescript
{
  url: string;
  sessionId: string;
}
```

**Response:**
```typescript
{
  title: string;
  channel: string;
  transcript: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  description?: string;
}
```

---

### Tools

#### `GET /api/tools`

List available tools.

**Response:**
```typescript
{
  tools: Array<{
    name: string;
    displayName: string;
    category: string;
    description: string;
    isDeferred: boolean;
  }>;
}
```

---

### Folder Picker

#### `POST /api/folder-picker`

Open native folder picker dialog.

**Response:**
```typescript
{
  path?: string;           // Selected folder path
  cancelled: boolean;
}
```

---

## Core Modules

### Providers (`lib/ai/providers.ts`)

LLM and embedding model management.

```typescript
// Provider configuration
type LLMProvider = "anthropic" | "openrouter";
type EmbeddingProvider = "local" | "openrouter";

// Model access functions
function getChatModel(): LanguageModel;
function getResearchModel(): LanguageModel;
function getVisionModel(): LanguageModel;
function getUtilityModel(): LanguageModel;
function getModelByName(modelId: string): LanguageModel;

// Embedding functions
function getEmbeddingModel(modelOverride?: string): EmbeddingModel<string>;
function getEmbeddingModelId(): string;
function canUseLocalEmbeddings(): boolean;

// Configuration
function getConfiguredProvider(): LLMProvider;
function getConfiguredModel(): string;
function getProviderDisplayName(): string;

// Cache management
function invalidateProviderCache(): void;
function getOpenRouterApiKey(): string | undefined;
```

---

### Tool Registry (`lib/ai/tool-registry/`)

#### ToolRegistry Class

```typescript
class ToolRegistry {
  // Singleton access
  static getInstance(): ToolRegistry;
  static reset(): void;  // For testing
  
  // Registration
  register(name: string, metadata: ToolMetadata, factory: ToolFactory): void;
  has(name: string): boolean;
  get(name: string): RegisteredTool | undefined;
  
  // Discovery
  getToolNames(): string[];
  getToolsByCategory(category: ToolCategory): RegisteredTool[];
  isToolEnabled(name: string): boolean;
  search(query: string, limit?: number): ToolSearchResult[];
  
  // Tool creation
  getTools(context: ToolContext): Record<string, Tool>;
  
  // Deferred loading support
  getAvailableToolsList(): ToolInfo[];
  getToolDetails(toolName: string): ToolDetails | null;
}
```

#### Types

```typescript
interface ToolMetadata {
  displayName: string;
  category: ToolCategory;
  description: string;
  fullInstructions?: string;
  deferred: boolean;
  requiresApiKey?: string;
  enabledByEnv?: string;
}

interface ToolContext {
  sessionId: string;
  characterId?: string | null;
  userId: string;
  loadingMode: "deferred" | "always";
}

type ToolCategory = 
  | "search"
  | "media"
  | "research"
  | "knowledge"
  | "memory"
  | "code"
  | "video"
  | "discovery";
```

---

### Vector Database (`lib/vectordb/`)

#### Client Functions

```typescript
// Connection management
function getLanceDB(): Promise<Connection | null>;
function closeLanceDB(): void;

// Configuration
function isVectorDBEnabled(): boolean;
function getVectorDBPath(): string;

// Connection testing
function testVectorDBConnection(): Promise<{
  success: boolean;
  message: string;
  path?: string;
  tableCount?: number;
}>;
```

#### Sync Service

```typescript
// Folder management
function addSyncFolder(config: SyncFolderConfig): Promise<string>;
function getSyncFolders(characterId: string): Promise<AgentSyncFolder[]>;
function removeSyncFolder(folderId: string): Promise<void>;

// Sync operations
function syncFolder(
  folderId: string,
  parallelConfig?: Partial<ParallelConfig>,
  forceReindex?: boolean
): Promise<SyncResult>;

function syncAllFolders(
  characterId: string,
  parallelConfig?: Partial<ParallelConfig>,
  forceReindex?: boolean
): Promise<SyncResult[]>;

function reindexAllFolders(
  characterId: string,
  parallelConfig?: Partial<ParallelConfig>
): Promise<SyncResult[]>;

// Types
interface SyncFolderConfig {
  id?: string;
  userId: string;
  characterId: string;
  folderPath: string;
  displayName?: string;
  recursive?: boolean;
  includeExtensions?: string[];
  excludePatterns?: string[];
}

interface SyncResult {
  folderId: string;
  filesProcessed: number;
  filesIndexed: number;
  filesSkipped: number;
  filesRemoved: number;
  errors: string[];
}

interface ParallelConfig {
  concurrency: number;      // Default: 5
  staggerDelayMs: number;   // Default: 100
}
```

#### Search Functions

```typescript
// Document search
function searchDocuments(params: {
  characterId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  folderIds?: string[];
}): Promise<VectorSearchHit[]>;

interface VectorSearchHit {
  id: string;
  filePath: string;
  relativePath: string;
  content: string;
  chunkIndex: number;
  similarity: number;
  metadata?: Record<string, unknown>;
}
```

---

### Settings Manager (`lib/settings/`)

```typescript
// Core functions
function loadSettings(): AppSettings;
function saveSettings(settings: AppSettings): void;
function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): AppSettings;
function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K];

// Utilities
function hasRequiredApiKeys(): boolean;
function resetSettings(): AppSettings;
function initializeSettings(): void;
function getSettingsPath(): string;
function updateEnvFromSettings(settings: AppSettings): void;
```

---

### Agent Memory (`lib/agent-memory/`)

```typescript
class AgentMemoryManager {
  constructor(characterId: string);
  
  // Loading
  loadAllMemories(): Promise<MemoryEntry[]>;
  loadApprovedMemories(): Promise<MemoryEntry[]>;
  loadPendingMemories(): Promise<MemoryEntry[]>;
  getMemory(id: string): Promise<MemoryEntry | null>;
  
  // CRUD
  addMemory(input: CreateMemoryInput): Promise<MemoryEntry>;
  updateMemory(id: string, updates: UpdateMemoryInput): Promise<MemoryEntry | null>;
  deleteMemory(id: string): Promise<boolean>;
  
  // Approval workflow
  approveMemory(id: string, edits?: Partial<UpdateMemoryInput>): Promise<MemoryEntry | null>;
  rejectMemory(id: string): Promise<boolean>;
  
  // Prompt generation
  formatForPrompt(): string;
  loadAllMemoriesSync(): MemoryEntry[];  // For prompt building
  
  // Metadata
  getMetadata(): Promise<MemoryMetadata>;
  updateMetadata(): Promise<void>;
  markExtractionTime(): Promise<void>;
  
  // Utilities
  hasMemoryData(): boolean;
  getBasePath(): string;
  regenerateMemoryMarkdown(): Promise<void>;
}

// Types
interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  content: string;
  source: "user" | "extraction" | "agent";
  status: "approved" | "pending" | "rejected";
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

type MemoryCategory = 
  | "preference"
  | "fact"
  | "context"
  | "instruction"
  | "relationship";

interface CreateMemoryInput {
  category: MemoryCategory;
  content: string;
  source?: "user" | "extraction" | "agent";
  confidence?: number;
  tags?: string[];
}
```

---

### Prompt Enhancement (`lib/ai/prompt-enhancement.ts`)

```typescript
// Main function
function enhancePrompt(params: {
  query: string;
  characterId: string;
  userId: string;
  options?: EnhancedPromptOptions;
}): Promise<PromptEnhancementResult>;

// Types
interface EnhancedPromptOptions {
  tokenBudget?: Partial<TokenBudget>;
  expandConcepts?: boolean;
  resolveDependencies?: boolean;
  includeSnippets?: boolean;
}

interface TokenBudget {
  total: number;        // Default: 4000
  filePointers: number; // Default: 500
  snippets: number;     // Default: 3000
  metadata: number;     // Default: 500
}

interface PromptEnhancementResult {
  enhanced: boolean;
  prompt: string;
  originalQuery: string;
  filesFound?: number;
  chunksRetrieved?: number;
  expandedConcepts?: string[];
  dependenciesResolved?: number;
  skipReason?: string;
}

// Utilities
function expandQueryConcepts(query: string): ConceptExpansionResult;
function extractDependenciesFromChunk(chunkText: string, sourceFile: string): FileDependency[];
function selectSnippets(hits: VectorSearchHit[], tokenBudget: number): RankedSnippet[];
function formatSnippetsAsContext(snippets: RankedSnippet[]): string;
```

---

### Characters (`lib/characters/`)

```typescript
// Queries
function getCharacters(userId: string): Promise<Character[]>;
function getCharacter(characterId: string): Promise<CharacterFull | null>;
function createCharacter(data: NewCharacter): Promise<Character>;
function updateCharacter(id: string, data: Partial<NewCharacter>): Promise<Character>;
function deleteCharacter(id: string): Promise<void>;

// Validation
function validateCharacterName(name: string): ValidationResult;
function validateCharacterPersona(persona: string): ValidationResult;
```

---

## IPC Channels (Electron)

Communication between main and renderer processes via preload script.

### Window Controls

```typescript
// One-way (send)
electronAPI.window.minimize(): void
electronAPI.window.maximize(): void
electronAPI.window.close(): void

// Two-way (invoke)
electronAPI.window.isMaximized(): Promise<boolean>
```

### App Info

```typescript
electronAPI.app.getVersion(): Promise<string>
electronAPI.app.getName(): Promise<string>
electronAPI.app.getDataPath(): Promise<string>
electronAPI.app.getMediaPath(): Promise<string>
```

### Shell Operations

```typescript
electronAPI.shell.openExternal(url: string): Promise<void>
```

### Settings

```typescript
electronAPI.settings.get(): Promise<Record<string, unknown> | null>
electronAPI.settings.save(settings: Record<string, unknown>): Promise<boolean>
```

### File Operations

```typescript
electronAPI.file.read(filePath: string): Promise<Buffer | null>
electronAPI.file.write(filePath: string, data: Buffer | string): Promise<boolean>
electronAPI.file.delete(filePath: string): Promise<boolean>
electronAPI.file.exists(filePath: string): Promise<boolean>
```

### Model Management

```typescript
electronAPI.model.getModelsDir(): Promise<string>
electronAPI.model.checkExists(modelId: string): Promise<boolean>
electronAPI.model.download(modelId: string): Promise<{ success: boolean; error?: string }>
electronAPI.model.onProgress(callback: (data: ProgressData) => void): void
electronAPI.model.removeProgressListener(): void

interface ProgressData {
  modelId: string;
  status: string;
  progress?: number;
  file?: string;
  error?: string;
}
```

### Log Streaming

```typescript
electronAPI.logs.subscribe(): void
electronAPI.logs.unsubscribe(): void
electronAPI.logs.getBuffer(): Promise<LogEntry[]>
electronAPI.logs.clear(): void
electronAPI.logs.onEntry(callback: (entry: LogEntry) => void): void
electronAPI.logs.onCritical(callback: (data: CriticalError) => void): void
electronAPI.logs.removeListeners(): void

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface CriticalError {
  type: string;
  message: string;
}
```

### IPC Security

All IPC channels are whitelisted in preload.ts:

```typescript
// Allowed send channels
["window:minimize", "window:maximize", "window:close", 
 "logs:subscribe", "logs:unsubscribe", "logs:clear"]

// Allowed invoke channels
["window:isMaximized", "app:getVersion", "app:getName", 
 "app:getDataPath", "app:getMediaPath", "shell:openExternal",
 "settings:get", "settings:save", "file:read", "file:write",
 "file:delete", "file:exists", "model:getModelsDir",
 "model:checkExists", "model:download", "logs:getBuffer"]

// Allowed event channels
["window:maximized-changed", "model:downloadProgress",
 "logs:entry", "logs:critical"]
```
