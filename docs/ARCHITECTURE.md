# Seline Architecture

This document describes the high-level architecture of the Seline desktop application.

## Overview

Seline is a Next.js 15 application wrapped in Electron 39. The **Next.js standalone server** runs inside the Electron shell, combining web-based UI development speed with native desktop capabilities.

```
┌─────────────────────────────────────────────────────┐
│                    Electron Shell                   │
│  ┌───────────────────────────────────────────────┐  │
│  │               Next.js Standalone              │  │
│  │  ┌─────────────┐  ┌──────────────────────┐   │  │
│  │  │   App Router │  │   API Routes         │   │  │
│  │  │   (React UI) │  │   (Server Actions)   │   │  │
│  │  └─────────────┘  └──────────────────────┘   │  │
│  │                        │                      │  │
│  │  ┌─────────────────────┴────────────────┐    │  │
│  │  │            lib/ Core                 │    │  │
│  │  │  AI · VectorDB · Sessions · Storage  │    │  │
│  │  └──────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────┘  │
│           ▲                    ▲                    │
│           │ IPC                │ protocol           │
│  ┌────────┴────────┐  ┌───────┴──────────┐         │
│  │   Electron Main │  │ local-media://   │         │
│  │   (main.ts)     │  │ protocol handler │         │
│  └─────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
styly-agent/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth-protected route group
│   ├── api/                # API routes (17 route handlers)
│   ├── chat/               # Main chat interface
│   ├── settings/           # Settings page
│   └── page.tsx            # Root page
├── components/             # React components
│   ├── assistant-ui/       # Chat/thread components (14 files)
│   ├── ui/                 # shadcn/ui primitives (30 files)
│   └── vector-search/      # Vector search UI (6 files)
├── electron/               # Electron main process
│   ├── main.ts             # Main process entry (~1000 lines)
│   └── preload.ts          # Context bridge (~187 lines)
├── lib/                    # Core business logic
│   ├── ai/                 # AI/LLM integrations (68 files)
│   ├── agent-memory/       # Per-agent memory storage
│   ├── db/                 # SQLite + Drizzle ORM (9 files)
│   ├── vectordb/           # LanceDB vector database (14 files)
│   ├── documents/          # Document parsing/chunking
│   ├── characters/         # Character/agent management
│   └── settings/           # Settings manager
├── scripts/                # Build and debug scripts (12 files)
├── tests/                  # Test files
│   └── lib/                # Unit tests (9 files)
└── docs/                   # Documentation
```

---

## Electron Shell

### Main Process (`electron/main.ts`)

The main process (~1000 lines) handles:

| Responsibility | Description |
|---------------|-------------|
| **Window Management** | Custom frameless window on Windows, hiddenInset titlebar on macOS |
| **Theme Handling** | Reads theme from settings, syncs with `nativeTheme`, updates on system change |
| **IPC Channels** | 20+ channels for window, app, settings, file, model, and log operations |
| **Local Media Protocol** | `local-media://` for secure media file access with path validation |
| **Next.js Server Spawn** | Production: spawns standalone server on port 3456 with `ELECTRON_RUN_AS_NODE=1` |
| **Debug Logging** | Writes to `{userData}/debug.log`, streams to renderer via IPC |
| **Embedding Model Setup** | Copies bundled models, sets `EMBEDDING_MODEL_DIR` environment variable |

#### Production Server Spawning

```typescript
nextServer = spawn(process.execPath, [standaloneServer], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "3456",
    HOSTNAME: "localhost",
    ELECTRON_RUN_AS_NODE: "1",  // Makes Electron binary run as Node.js
    LOCAL_DATA_PATH: path.join(userDataPath, "data"),
  },
});
```

### Preload Script (`electron/preload.ts`)

Exposes safe APIs via `contextBridge` with channel whitelisting:

```typescript
const electronAPI = {
  platform: process.platform,
  isElectron: true,
  
  window: {
    minimize: () => void,
    maximize: () => void,
    close: () => void,
    isMaximized: () => Promise<boolean>,
  },
  
  app: {
    getVersion: () => Promise<string>,
    getName: () => Promise<string>,
    getDataPath: () => Promise<string>,
    getMediaPath: () => Promise<string>,
  },
  
  shell: {
    openExternal: (url: string) => Promise<void>,
  },
  
  settings: {
    get: () => Promise<Record<string, unknown> | null>,
    save: (settings) => Promise<boolean>,
  },
  
  file: {
    read: (filePath: string) => Promise<Buffer | null>,
    write: (filePath: string, data: Buffer | string) => Promise<boolean>,
    delete: (filePath: string) => Promise<boolean>,
    exists: (filePath: string) => Promise<boolean>,
  },
  
  model: {
    getModelsDir: () => Promise<string>,
    checkExists: (modelId: string) => Promise<boolean>,
    download: (modelId: string) => Promise<{ success: boolean; error?: string }>,
    onProgress: (callback) => void,
  },
  
  logs: {
    subscribe: () => void,
    unsubscribe: () => void,
    getBuffer: () => Promise<LogEntry[]>,
    clear: () => void,
    onEntry: (callback) => void,
    onCritical: (callback) => void,
  },
};
```

---

## App Router Structure

### Route Groups

| Route | Purpose |
|-------|---------|
| `/` | Root page (redirects to `/chat`) |
| `/chat` | Main conversational interface |
| `/settings` | User settings (API keys, models, sync folders) |
| `/create-character` | Agent/character creation wizard |
| `/agents` | Agent listing and management |
| `/about` | About page |
| `/usage` | Usage statistics |
| `/admin` | Admin panel (8 sub-routes) |
| `/(auth)/login` | Local authentication |
| `/(auth)/signup` | User registration |

### Middleware (`middleware.ts`)

Handles authentication and i18n:

```typescript
// Session cookie: "zlutty-session"
// Public routes: ["/login", "/signup", "/api/auth"]

// Flow:
// 1. Skip static routes (/_next, /favicon.ico, /assets)
// 2. Detect locale from cookie or Accept-Language header
// 3. Check session cookie for protected routes
// 4. Redirect to /login if no session, or to / if authenticated user visits auth pages
```

### API Routes (`app/api/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Streaming chat completions with tools |
| `/api/enhance-prompt` | POST | Prompt enhancement with vector context |
| `/api/vector-sync` | POST | Vector database sync operations |
| `/api/sync-status` | GET | Get folder sync progress |
| `/api/sessions` | GET/POST | Session CRUD |
| `/api/sessions/[id]` | GET/DELETE | Session detail operations |
| `/api/characters` | GET/POST | Agent/character management |
| `/api/characters/[id]` | GET/PATCH/DELETE | Character detail operations |
| `/api/settings` | GET/POST | Settings read/write |
| `/api/media` | GET | Local media file serving |
| `/api/upload` | POST | File upload handling |
| `/api/folder-picker` | POST | Native folder picker dialog |
| `/api/deep-research` | POST | Deep research agent |
| `/api/video-assembly` | POST | Remotion video rendering |
| `/api/web-browse` | POST | Web browsing tool |
| `/api/youtube` | POST | YouTube transcript extraction |
| `/api/tools` | GET | List available tools |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/verify` | GET | Session verification |
| `/api/auth/signup` | POST | User registration |

---

## Database Layer (`lib/db/`)

### SQLite Schema

Uses Drizzle ORM with better-sqlite3.

#### Core Tables (`sqlite-schema.ts`)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, password, name, createdAt |
| `sessions` | Chat sessions | id, userId, title, characterId, createdAt, metadata |
| `messages` | Chat messages | id, sessionId, role, content, parentId, createdAt |
| `toolRuns` | Tool executions | id, sessionId, toolName, input, output, status, duration |
| `webBrowseEntries` | Web cache | id, sessionId, url, title, content, expiresAt |
| `images` | Generated images | id, sessionId, prompt, url, toolRunId, metadata |

#### Character Tables (`sqlite-character-schema.ts`)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `characters` | Agent definitions | id, userId, name, persona, systemPrompt, avatar, status |
| `characterImages` | Agent images | id, characterId, imageType, url, isDefault |
| `agentDocuments` | Knowledge base | id, userId, characterId, fileName, fileType, content, chunkCount |
| `agentDocumentChunks` | Embedded chunks | id, documentId, chunkIndex, content, tokenCount |
| `agentSyncFolders` | Synced folders | id, userId, characterId, folderPath, displayName, recursive, includeExtensions, excludePatterns |
| `agentSyncFiles` | Indexed files | id, folderId, filePath, relativePath, contentHash, lastIndexed |

#### Observability Tables (`sqlite-observability-schema.ts`)

| Table | Purpose |
|-------|---------|
| Agent runs, events, prompt versioning for debugging and analytics |

---

## Component Architecture

### Chat UI (`components/assistant-ui/`)

Built on [@assistant-ui/react](https://github.com/assistant-ui/assistant-ui):

| Component | Purpose |
|-----------|---------|
| `thread.tsx` | Main conversation container (40K+ bytes) |
| `markdown-text.tsx` | Markdown rendering with syntax highlighting |
| `shiki-highlighter.tsx` | Code syntax highlighting |
| `tool-fallback.tsx` | Tool call UI rendering |
| `vector-search-inline.tsx` | Inline vector search results |
| `web-browse-inline.tsx` | Web browsing results display |
| `youtube-inline.tsx` | YouTube transcript display |
| `deep-research-panel.tsx` | Deep research progress panel |
| `product-gallery-inline.tsx` | Shopping results gallery |
| `image-link-preview.tsx` | Image preview tooltip |
| `character-context.tsx` | Agent context provider |
| `gallery-context.tsx` | Image gallery provider |
| `deep-research-context.tsx` | Research state provider |

### Custom Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `useDesktopSidebarState` | Persistent sidebar state for desktop |
| `useVectorSyncStatus` | Vector sync progress polling |

### Vector Search UI (`components/vector-search/`)

| Component | Purpose |
|-----------|---------|
| Sync folder management UI |
| Document upload interface |
| Search results display |
| Reindexing controls |
| Status indicators |

---

## Settings Manager (`lib/settings/`)

### Configuration Options

```typescript
interface AppSettings {
  // LLM Provider
  llmProvider: "anthropic" | "openrouter";
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  chatModel?: string;
  researchModel?: string;
  visionModel?: string;
  
  // Embedding
  embeddingProvider?: "local" | "openrouter";
  embeddingModel?: string;
  
  // Vector Search Configuration
  vectorDBEnabled: boolean;
  vectorSearchMaxChunks: number;           // Default: 30
  vectorSearchTokenChunkSize: number;      // Default: 256
  vectorSearchTokenChunkStride: number;    // Default: 8
  vectorSearchMaxFileLines: number;        // Default: 3000
  vectorSearchMaxLineLength: number;       // Default: 1000
  vectorSearchRerankerEnabled?: boolean;
  
  // Tool Loading
  toolLoadingMode?: "deferred" | "always";
  
  // Web Scraping
  webScraperProvider?: "firecrawl" | "local";
  tavilyApiKey?: string;
  firecrawlApiKey?: string;
  
  // Local Grep
  localGrepEnabled: boolean;
  localGrepMaxResults: number;             // Default: 100
  localGrepContextLines: number;           // Default: 2
  localGrepRespectGitignore: boolean;      // Default: true
  
  // User Identity
  localUserId: string;
  localUserEmail: string;
  
  // Theme
  theme: "dark" | "light" | "system";
  
  // Data Path
  dataPath?: string;
}
```

### Settings Storage

- **Path**: `{userData}/data/settings.json`
- **Cache**: 1-second TTL for performance
- **Cache Invalidation**: Automatic on `saveSettings()`

---

## AI Configuration (`lib/ai/config.ts`)

```typescript
const AI_CONFIG = {
  model: getConfiguredModel(),          // Dynamic from settings
  provider: getConfiguredProvider(),    // Dynamic from settings
  maxSteps: 100,                        // Max tool call steps per request
  temperature: 0.85,                    // Creative responses
  toolTemperature: 0.7,                 // Tool-heavy operations (more deterministic)
  toolChoice: "auto",                   // Model decides tool usage
};
```

---

## Data Flow

### Message Flow

```
User Input → Composer → /api/chat
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   Tool Registry    Memory Injection   Vector Context
         │                │                │
         └────────────────┴────────────────┘
                          │
                          ▼
                   LLM Provider
                   (Anthropic/OpenRouter)
                          │
                          ▼
            Streaming Response → Thread UI
```

### Prompt Enhancement Flow

```
User Query → /api/enhance-prompt
                    │
     ┌──────────────┴──────────────┐
     ▼                             ▼
Concept Expansion           Vector Search
(domain mappings)           (LanceDB query)
     │                             │
     └──────────────┬──────────────┘
                    ▼
           Snippet Selection
           (token budget: 4000)
                    │
                    ▼
         Formatted Context + Query
```

---

## External Dependencies

### AI/ML
- `@ai-sdk/anthropic` — Anthropic Claude integration
- `@ai-sdk/openai` — OpenAI API compatibility
- `@ai-sdk/openai-compatible` — OpenRouter support
- `@xenova/transformers` — Local embedding models (Transformers.js)
- `@lancedb/lancedb` — Embedded vector database
- `onnxruntime-node` — ONNX model inference

### Native Modules
- `better-sqlite3` — SQLite bindings (requires Electron rebuild)
- `chokidar` — File system watching

### UI
- `@assistant-ui/react` — Chat UI primitives
- `@radix-ui/*` — Accessible UI primitives
- `framer-motion` — Animations
- `lucide-react` — Icons
- `sonner` — Toast notifications

### Video
- `remotion` — Programmatic video rendering
- `@remotion/bundler`, `@remotion/cli`, `@remotion/renderer`

### Utilities
- `drizzle-orm` — Type-safe ORM
- `zod` — Schema validation
- `gpt-tokenizer` — Token counting
- `nanoid` — ID generation
- `pdf-parse` — PDF text extraction
- `puppeteer` — Web scraping

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Context Isolation** | Enabled in BrowserWindow |
| **Node Integration** | Disabled in renderer |
| **Sandbox** | Enabled for additional security |
| **CSP** | Strict Content Security Policy headers |
| **Path Validation** | Media protocol validates paths stay within allowed directories |
| **IPC Whitelisting** | Preload script only allows specific IPC channels |
| **Session Cookies** | HTTP-only session cookies for authentication |

---

## i18n Support

- **Locales**: Configured in `i18n/config.ts`
- **Detection**: Cookie → Accept-Language header → Default
- **Library**: `next-intl`
- **Locale Files**: `locales/{locale}/` directories
