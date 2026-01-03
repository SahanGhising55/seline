# Development Guide

Setup, scripts, testing, and build process for Seline development.

## Quick Start

```bash
# Install dependencies
npm install

# Start development (Next.js + Electron)
npm run electron:dev
```

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ (22 recommended) | Native module compatibility with Electron 39 |
| npm | 9+ | Package management |
| Windows | 10/11 | Or macOS 12+ |

## Development Scripts

### Core

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server only (Turbopack) |
| `npm run electron:dev` | Full Electron + Next.js development |
| `npm run build` | Production Next.js build |

### Database

| Script | Purpose |
|--------|---------|
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio UI |

### Building

| Script | Purpose |
|--------|---------|
| `npm run electron:pack` | Package app without installer |
| `npm run electron:dist:win` | Build Windows installer |
| `npm run electron:dist:mac` | Build macOS DMG |
| `npm run electron:rebuild-native` | Rebuild native modules for Electron |

### Testing

| Script | Purpose |
|--------|---------|
| `npm test` | Run vitest in watch mode |
| `npm run test:run` | Single test run |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:integration` | Run integration tests |

### Utilities

| Script | Purpose |
|--------|---------|
| `npm run lint` | ESLint check |
| `npm run embedding:test` | Test embedding pipeline |
| `npm run embedding:pipeline-test` | Full embedding integration test |

## Project Structure

```
├── app/                  # Next.js App Router
├── components/           # React components
├── electron/             # Electron main process
├── lib/                  # Core business logic
├── scripts/              # Build and debug utilities
├── tests/                # Test files
│   └── lib/              # Unit tests for lib/
├── drizzle/              # Database migrations
└── docs/                 # Documentation
```

## Environment Variables

Create `.env.local` for development:

```bash
# Required (one of these)
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...

# Optional
TAVILY_API_KEY=tvly-...    # Web search
FIRECRAWL_API_KEY=fc-...   # Web scraping

# Development overrides
ALLOW_LOCAL_EMBEDDINGS=true  # Enable local embeddings in dev
```

### Electron-Specific Variables

Set automatically by `electron/main.ts`:
- `ELECTRON_USER_DATA_PATH` — User data directory
- `LOCAL_DATA_PATH` — Database and media storage
- `EMBEDDING_MODEL_DIR` — Local model directory
- `EMBEDDING_CACHE_DIR` — Model cache location

## Testing

### Test Framework

Vitest with Node environment:

```typescript
// vitest.config.ts
{
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    testTimeout: 30000,
  }
}
```

### Running Tests

```bash
# Watch mode
npm test

# Single run with coverage
npm run test:coverage

# Integration tests (separate config)
npm run test:integration
```

### Test Organization

```
tests/
├── lib/
│   ├── ai/               # AI pipeline tests
│   ├── vectordb/         # Vector database tests
│   └── ...
└── setup-integration.ts  # Integration test setup
```

## Build Pipeline

See [BUILD.md](./BUILD.md) for detailed build documentation.

### Quick Reference

1. **Development Build**
   ```bash
   npm run electron:pack
   # Output: dist-electron/ (unpacked app)
   ```

2. **Production Build**
   ```bash
   npm run electron:dist:win  # Windows
   npm run electron:dist:mac  # macOS
   # Output: electron-dist/ (installers)
   ```

### Build Steps (Internal)

The `electron:build` script runs:
1. `npm run build` — Next.js production build
2. `npm run electron:rebuild-native` — Rebuild native modules
3. `npm run electron:prepare` — Copy assets to standalone
4. `npm run electron:compile` — Compile Electron TypeScript

## Native Module Handling

Native modules (`better-sqlite3`, `onnxruntime-node`) require special handling:

```bash
# If you see NODE_MODULE_VERSION errors:
npm run electron:rebuild-native

# Verify Electron version matches
# Currently: Electron 39.2.4 (Node 22 / MODULE_VERSION 140)
```

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (standalone output) |
| `electron-builder.yml` | Electron packager configuration |
| `tsconfig.electron.json` | TypeScript for Electron main |
| `drizzle.config.ts` | Database ORM configuration |
| `vitest.config.ts` | Test runner configuration |

## Debugging

### Development

- DevTools open automatically in dev mode
- Console logs visible in terminal and DevTools

### Production

Debug logs written to: `{userData}/debug.log`

On Windows: `%APPDATA%/styly-agent/debug.log`
On macOS: `~/Library/Application Support/styly-agent/debug.log`

### Log Streaming

The app includes log streaming to the UI:
```typescript
// Subscribe to logs in renderer
window.electronAPI.onLogsEntry((entry) => {
  console.log(entry.timestamp, entry.level, entry.message);
});
```

## Code Style

- TypeScript strict mode
- ESLint with Next.js config
- Prettier for formatting (configured in editor)

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests
3. Run `npm run lint` and `npm test`
4. Ensure `npm run electron:pack` succeeds
5. Submit PR with description
