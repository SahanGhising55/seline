# Vector Search V2: Comparative Analysis & Architecture Design

> **Document Version**: 1.0
> **Date**: 2025-12-21
> **Status**: Design Phase

## Executive Summary

This document analyzes our current V1 LanceDB-based vector search implementation against the Context-Engine repository's advanced retrieval techniques. The goal is to design a V2 architecture that enhances semantic search quality while preserving V1's operational strengths (folder synchronization, re-indexing pipeline, file change detection).

---

## Table of Contents

1. [Feature Comparison Matrix](#1-feature-comparison-matrix)
2. [Technical Deep-Dive](#2-technical-deep-dive)
3. [V2 Proposed Architecture](#3-v2-proposed-architecture)
4. [Gap Analysis](#4-gap-analysis)
5. [Implementation Patterns](#5-implementation-patterns)
6. [Migration Strategy](#6-migration-strategy)

---

## 1. Feature Comparison Matrix

### 1.1 Core Capabilities

| Feature | V1 (Current) | Context-Engine | V2 (Proposed) |
|---------|--------------|----------------|---------------|
| **Vector Database** | LanceDB (embedded) | Qdrant (server) | LanceDB (embedded) ✓ |
| **Embedding Model** | AI SDK configurable | BAAI/bge-base-en-v1.5 | AI SDK + local models |
| **Vector Dimensions** | Model-dependent | 768 (dense) | Model-dependent |
| **Distance Metric** | Cosine | Cosine | Cosine |

### 1.2 Chunking Strategy

| Feature | V1 (Current) | Context-Engine | V2 (Proposed) |
|---------|--------------|----------------|---------------|
| **Chunking Method** | Character-based | Token-based (ReFRAG) | Token-based (ReFRAG) |
| **Window Size** | 1500 chars | 16 tokens (micro) | 16 tokens (configurable) |
| **Overlap/Stride** | 200 chars | 8 tokens | 8 tokens (configurable) |
| **Boundary Respect** | Sentence/paragraph | Token offsets + line mapping | Token + AST boundaries |
| **Line Number Mapping** | ❌ None | ✓ Token→Line mapping | ✓ Token→Line mapping |

### 1.3 Search Architecture

| Feature | V1 (Current) | Context-Engine | V2 (Proposed) |
|---------|--------------|----------------|---------------|
| **Search Type** | Semantic only | Hybrid (dense + lexical) | Hybrid (dense + lexical) |
| **Lexical Component** | ❌ None | BM25-style hashing (4096-dim) | BM25-style hashing |
| **Fusion Method** | N/A | RRF (k=30) | RRF (configurable) |
| **Query Expansion** | ❌ None | Semantic + PRF | Semantic expansion |
| **Result Diversification** | ❌ None | MMR diversification | MMR diversification |

### 1.4 Reranking & Result Enhancement

| Feature | V1 (Current) | Context-Engine | V2 (Proposed) |
|---------|--------------|----------------|---------------|
| **Reranking** | LLM synthesizer | ONNX cross-encoder | ONNX cross-encoder |
| **Learning Reranker** | ❌ None | TinyScorer + teacher distillation | Optional (Phase 3) |
| **Result Synthesis** | ✓ LLM-based | ❌ None | ✓ LLM-based (preserved) |
| **File Reading Tool** | ✓ readFile tool | ❌ None | ✓ readFile tool (preserved) |

### 1.5 Operational Capabilities (V1 Strengths to Preserve)

| Feature | V1 (Current) | Context-Engine | V2 (Proposed) |
|---------|--------------|----------------|---------------|
| **Folder Sync** | ✓ Built-in | ❌ Manual indexing | ✓ Preserved |
| **File Change Detection** | ✓ Hash-based | ❌ Manual re-index | ✓ Preserved |
| **Re-indexing Pipeline** | ✓ Incremental | Batch only | ✓ Incremental (preserved) |
| **Multi-agent Tables** | ✓ Per-character tables | Per-collection | ✓ Per-character (preserved) |
| **Embedded Database** | ✓ No external deps | Requires Qdrant server | ✓ No external deps |

---

## 2. Technical Deep-Dive

### 2.1 Chunking Strategy Analysis

#### V1 Current Implementation (`lib/documents/chunking.ts`)

```typescript
// Current: Character-based chunking
const maxCharacters = 1500;
const overlapCharacters = 200;

// Issues:
// 1. No token alignment (embeddings work on tokens, not chars)
// 2. No line number tracking for citations
// 3. May split mid-word or mid-statement
// 4. Overlap calculated in chars, not semantic units
```

**V1 Weaknesses:**
- Character boundaries don't align with token boundaries
- Large chunks (1500 chars ≈ 375 tokens) may dilute semantic signal
- No line-level granularity for precise citations
- Overlap strategy doesn't preserve context continuity

#### Context-Engine ReFRAG Implementation (`scripts/ingest_code.py`)

```python
# ReFRAG: 16-token micro-chunks with 8-token stride
def chunk_by_tokens(text: str, k_tokens: int = 16, stride_tokens: int = 8):
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    chunks = []
    for i in range(0, len(tokens), stride_tokens):
        window = tokens[i:i + k_tokens]
        chunk_text = enc.decode(window)
        # Map token positions back to line numbers
        start_char = len(enc.decode(tokens[:i]))
        line_num = text[:start_char].count('\n') + 1
        chunks.append({
            "text": chunk_text,
            "start_line": line_num,
            "token_offset": i
        })
    return chunks
```

**Context-Engine Strengths:**
- Token-aligned boundaries for better embedding quality
- Fine-grained 16-token windows capture precise semantic units
- Line number mapping enables accurate citations
- Span budgeting controls output token count

#### V2 Proposed Approach

Implement ReFRAG-style token chunking while preserving V1's file handling:

```typescript
// V2: Token-based micro-chunking with line mapping
interface MicroChunk {
  text: string;
  startLine: number;
  endLine: number;
  tokenOffset: number;
  tokenCount: number;
}

function chunkByTokens(
  text: string,
  options: { windowTokens?: number; strideTokens?: number } = {}
): MicroChunk[] {
  const windowTokens = options.windowTokens ?? 16;
  const strideTokens = options.strideTokens ?? 8;
  // Implementation using tiktoken or similar
}
```

### 2.2 Search Architecture Analysis

#### V1 Current Implementation (`lib/vectordb/search.ts`)

```typescript
// V1: Semantic-only search
const results = await table
  .vectorSearch(queryEmbedding)
  .distanceType("cosine")
  .limit(topK)
  .toArray();

// Single signal: cosine similarity score
const score = 1 - distance;
```

**V1 Weaknesses:**
- No lexical matching for exact identifiers (function names, variables)
- Single-signal ranking misses keyword relevance
- No result diversification (may return redundant similar chunks)
- No query expansion to capture related terms

#### Context-Engine Hybrid Search (`scripts/hybrid_search.py`)

```python
# Hybrid search with RRF fusion
DENSE_WEIGHT = 1.5
LEXICAL_WEIGHT = 0.20
RRF_K = 30

def rrf(rank: int, k: int = RRF_K) -> float:
    """Reciprocal Rank Fusion score"""
    return 1.0 / (k + rank)

def hybrid_search(query: str, collection: str, limit: int = 20):
    # 1. Dense (semantic) search
    dense_results = qdrant.search(
        collection, query_embedding, limit=limit * 2,
        using="dense"
    )

    # 2. Lexical (BM25-style) search
    lexical_vector = lex_hash_vector(query)
    lexical_results = qdrant.search(
        collection, lexical_vector, limit=limit * 2,
        using="lex"
    )

    # 3. RRF fusion
    scores = {}
    for rank, hit in enumerate(dense_results):
        scores[hit.id] = DENSE_WEIGHT * rrf(rank)
    for rank, hit in enumerate(lexical_results):
        scores[hit.id] = scores.get(hit.id, 0) + LEXICAL_WEIGHT * rrf(rank)

    # 4. Sort by combined score
    return sorted(scores.items(), key=lambda x: -x[1])[:limit]
```

**Context-Engine Strengths:**
- Lexical matching catches exact identifiers missed by semantic search
- RRF fusion balances semantic understanding with keyword precision
- Configurable weights allow tuning for different query types
- MMR diversification reduces redundancy

#### V2 Proposed Hybrid Search for LanceDB

```typescript
// V2: Hybrid search with RRF fusion for LanceDB
interface HybridSearchOptions {
  topK?: number;
  denseWeight?: number;
  lexicalWeight?: number;
  rrfK?: number;
  enableDiversification?: boolean;
}

async function hybridSearch(params: {
  characterId: string;
  query: string;
  options?: HybridSearchOptions;
}): Promise<VectorSearchHit[]> {
  const { denseWeight = 1.5, lexicalWeight = 0.2, rrfK = 30 } = params.options ?? {};

  // 1. Dense search (existing)
  const denseResults = await searchDense(params);

  // 2. Lexical search (new - using FTS or lexical vectors)
  const lexicalResults = await searchLexical(params);

  // 3. RRF fusion
  const scores = new Map<string, number>();
  denseResults.forEach((hit, rank) => {
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + denseWeight * (1 / (rrfK + rank)));
  });
  lexicalResults.forEach((hit, rank) => {
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + lexicalWeight * (1 / (rrfK + rank)));
  });

  // 4. Sort and return
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, params.options?.topK ?? 10)
    .map(([id, score]) => ({ ...hitMap.get(id)!, score }));
}
```

### 2.3 Lexical Vector Generation

#### Context-Engine BM25-Style Hashing (`scripts/ingest_code.py`)

```python
LEX_DIM = 4096  # Fixed dimension for lexical vectors

def _lex_hash_vector(text: str) -> List[float]:
    """Generate BM25-style hashed lexical vector"""
    tokens = _tokenize_for_lex(text)  # Split camelCase, snake_case
    tokens = [t for t in tokens if t.lower() not in STOP_WORDS]

    vec = [0.0] * LEX_DIM
    for token in tokens:
        # Hash token to bucket
        bucket = hash(token.lower()) % LEX_DIM
        vec[bucket] += 1.0

    # L2 normalize
    norm = sum(v*v for v in vec) ** 0.5
    if norm > 0:
        vec = [v / norm for v in vec]

    return vec
```

#### V2 Proposed Lexical Vectors for LanceDB

```typescript
// V2: BM25-style lexical vector generation
const LEX_DIM = 4096;

function generateLexicalVector(text: string): number[] {
  const tokens = tokenizeForLex(text);
  const vec = new Array(LEX_DIM).fill(0);

  for (const token of tokens) {
    const bucket = hashString(token.toLowerCase()) % LEX_DIM;
    vec[bucket] += 1.0;
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

function tokenizeForLex(text: string): string[] {
  // Split camelCase: "getUserName" -> ["get", "User", "Name"]
  // Split snake_case: "get_user_name" -> ["get", "user", "name"]
  return text
    .split(/(?=[A-Z])|[_\-\s\.\/\\]+/)
    .map(t => t.toLowerCase())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}
```


### 2.4 Reranking Pipeline Analysis

#### V1 Current Implementation (`lib/ai/vector-search/synthesizer.ts`)

V1 uses an LLM synthesizer for result enhancement:

```typescript
// V1: LLM-based synthesis with readFile tool
const result = await generateText({
  model: getUtilityModel(),
  system: SYNTHESIS_SYSTEM_PROMPT,
  prompt: contextPrompt,
  tools: { readFile: createReadFileTool(allowedFolderPaths) },
  maxSteps: MAX_TOOL_STEPS,
});
```

**V1 Strengths (to preserve):**
- LLM understands code context deeply
- `readFile` tool enables following code relationships
- Produces human-readable explanations with confidence scores
- Groups findings logically by file/concept

**V1 Weaknesses:**
- Slow (LLM latency: 2-10 seconds)
- Expensive (token costs per query)
- Inconsistent ranking quality
- No learning from usage patterns

#### Context-Engine Reranking (`scripts/rerank_local.py`)

```python
# ONNX cross-encoder for fast, accurate reranking
class ONNXReranker:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(
            model_path,
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )
        self.tokenizer = AutoTokenizer.from_pretrained("cross-encoder/ms-marco-MiniLM-L-6-v2")

    def rerank(self, query: str, documents: List[str]) -> List[float]:
        pairs = [[query, doc] for doc in documents]
        inputs = self.tokenizer(
            pairs, padding=True, truncation=True,
            max_length=512, return_tensors="np"
        )
        scores = self.session.run(None, dict(inputs))[0]
        return scores.flatten().tolist()
```

**Context-Engine Strengths:**
- Fast: <50ms for 20 documents
- Consistent: Deterministic neural scoring
- Local: No external API calls
- GPU-accelerated when available

#### Context-Engine Learning Reranker (`scripts/learning_reranker_worker.py`)

```python
# TinyScorer: Per-collection learned reranker
class TinyScorer:
    """2-layer MLP that learns from ONNX teacher"""
    def __init__(self, dim: int = 128, lr: float = 0.001):
        self.W1 = np.random.randn(dim * 3, 64) * 0.01
        self.W2 = np.random.randn(64, 1) * 0.01

    def forward(self, query_emb, doc_embs, z) -> np.ndarray:
        # Concatenate query, doc, and latent state
        features = np.hstack([query_emb, doc_embs, z])
        h = np.maximum(0, features @ self.W1)  # ReLU
        return (h @ self.W2).flatten()

    def learn_from_teacher(self, query_emb, doc_embs, z, teacher_scores):
        # Distillation: match teacher (ONNX) rankings
        our_scores = self.forward(query_emb, doc_embs, z)
        loss = self._ranking_loss(our_scores, teacher_scores)
        self._backprop(loss)
```

**Learning Reranker Benefits:**
- Zero manual training
- Per-collection specialization
- <1ms inference latency
- Continuous improvement from usage

#### V2 Proposed Reranking Strategy

```typescript
// V2: Hybrid reranking pipeline
interface RerankingPipeline {
  // Stage 1: Fast ONNX cross-encoder (always)
  onnxRerank(query: string, candidates: SearchHit[]): Promise<SearchHit[]>;

  // Stage 2: Optional LLM synthesis (on demand)
  llmSynthesize?(query: string, candidates: SearchHit[]): Promise<SynthesisResult>;
}

// Implementation
async function rerankResults(
  query: string,
  candidates: VectorSearchHit[],
  options: { useLLMSynthesis?: boolean } = {}
): Promise<RankedResult[]> {
  // 1. ONNX reranking (fast, always run)
  const reranked = await onnxRerank(query, candidates);

  // 2. Optional LLM synthesis (preserves V1 capability)
  if (options.useLLMSynthesis) {
    const synthesis = await synthesizeSearchResults({
      query,
      rawResults: reranked,
      searchHistory: [],
      allowedFolderPaths: [],
    });
    return { reranked, synthesis };
  }

  return { reranked };
}
```

### 2.5 Query Enhancement Analysis

#### V1 Current: No Query Enhancement

V1 passes the raw query directly to embedding without enhancement.

#### Context-Engine Semantic Expansion (`scripts/semantic_expansion.py`)

```python
def expand_queries_semantically(
    query: str,
    corpus_terms: List[str],
    threshold: float = 0.7
) -> List[str]:
    """Expand query with semantically similar terms from corpus"""
    query_emb = embed(query)
    term_embs = embed_many(corpus_terms)

    expanded = [query]
    for term, emb in zip(corpus_terms, term_embs):
        similarity = cosine_similarity(query_emb, emb)
        if similarity >= threshold:
            expanded.append(term)

    return expanded

def expand_queries_with_prf(
    query: str,
    initial_results: List[Dict],
    top_k: int = 3
) -> List[str]:
    """Pseudo-relevance feedback: use top results to expand query"""
    expanded = [query]
    for result in initial_results[:top_k]:
        # Extract key terms from top results
        terms = extract_key_terms(result["text"])
        expanded.extend(terms[:2])
    return list(set(expanded))
```

#### V2 Proposed Query Enhancement

```typescript
// V2: Query expansion with caching
const expansionCache = new LRUCache<string, string[]>({ max: 1000 });

async function expandQuery(
  query: string,
  options: { usePRF?: boolean; threshold?: number } = {}
): Promise<string[]> {
  const cacheKey = `${query}:${options.threshold ?? 0.7}`;
  if (expansionCache.has(cacheKey)) {
    return expansionCache.get(cacheKey)!;
  }

  const expanded = [query];

  // Semantic expansion using embedding similarity
  const queryEmb = await embed({ model: embeddingModel, value: query });
  // Find similar terms from indexed corpus
  // ...

  expansionCache.set(cacheKey, expanded);
  return expanded;
}
```


---

## 3. V2 Proposed Architecture

### 3.1 Design Principles

1. **Preserve V1 Operational Strengths**: Folder sync, file change detection, re-indexing pipeline
2. **Enhance Search Quality**: Hybrid search, RRF fusion, reranking
3. **Maintain Embedded Architecture**: Continue using LanceDB (no external server dependencies)
4. **Enable Gradual Rollout**: Feature flags for V1/V2 side-by-side operation
5. **Optimize for TypeScript**: Port Python patterns to idiomatic TypeScript

### 3.2 Proposed Folder Structure

```
lib/
├── vectordb/                          # V1 (preserved) + V2 extensions
│   ├── client.ts                      # LanceDB client (V1 - unchanged)
│   ├── collections.ts                 # Table management (V1 - unchanged)
│   ├── search.ts                      # V1 search (preserved for compatibility)
│   ├── indexing.ts                    # V1 indexing (preserved)
│   └── v2/                            # V2 extensions
│       ├── hybrid-search.ts           # Hybrid search with RRF fusion
│       ├── lexical-vectors.ts         # BM25-style hashing
│       ├── query-expansion.ts         # Semantic query expansion
│       └── index.ts                   # V2 exports
│
├── documents/
│   ├── chunking.ts                    # V1 character chunking (preserved)
│   └── v2/
│       ├── token-chunking.ts          # ReFRAG-style micro-chunking
│       ├── ast-chunking.ts            # AST-aware chunking (optional)
│       └── index.ts
│
├── ai/
│   ├── vector-search/
│   │   ├── synthesizer.ts             # V1 LLM synthesizer (preserved)
│   │   ├── types.ts                   # Shared types
│   │   └── v2/
│   │       ├── reranker.ts            # ONNX cross-encoder reranking
│   │       ├── fusion.ts              # RRF fusion utilities
│   │       └── index.ts
│   └── providers.ts                   # (unchanged)
│
└── config/
    └── vector-search.ts               # V2 feature flags and configuration
```

### 3.3 Configuration Schema

```typescript
// lib/config/vector-search.ts
export interface VectorSearchV2Config {
  // Feature flags for gradual rollout
  enableHybridSearch: boolean;      // Default: false (V1 compat)
  enableTokenChunking: boolean;     // Default: false (V1 compat)
  enableReranking: boolean;         // Default: false
  enableQueryExpansion: boolean;    // Default: false

  // Chunking configuration
  chunkingStrategy: 'character' | 'token' | 'ast';
  tokenChunkSize: number;           // Default: 16
  tokenChunkStride: number;         // Default: 8

  // Search configuration
  searchMode: 'semantic' | 'lexical' | 'hybrid';
  denseWeight: number;              // Default: 1.5
  lexicalWeight: number;            // Default: 0.2
  rrfK: number;                     // Default: 30

  // Reranking configuration
  rerankModel: string;              // ONNX model path
  rerankTopK: number;               // Number of candidates to rerank

  // LLM synthesis (V1 feature preserved)
  enableLLMSynthesis: boolean;      // Default: true
}

export const defaultConfig: VectorSearchV2Config = {
  // Start with V1 behavior
  enableHybridSearch: false,
  enableTokenChunking: false,
  enableReranking: false,
  enableQueryExpansion: false,

  chunkingStrategy: 'character',
  tokenChunkSize: 16,
  tokenChunkStride: 8,

  searchMode: 'semantic',
  denseWeight: 1.5,
  lexicalWeight: 0.2,
  rrfK: 30,

  rerankModel: 'models/ms-marco-MiniLM-L-6-v2.onnx',
  rerankTopK: 20,

  enableLLMSynthesis: true,
};
```

### 3.4 LanceDB Multi-Vector Schema

```typescript
// V2: Extended schema for hybrid search
interface VectorDocumentV2 {
  // V1 fields (preserved)
  id: string;
  text: string;
  filePath: string;
  relativePath: string;
  chunkIndex: number;
  folderId: string;
  vector: number[];           // Dense embedding (semantic)

  // V2 additions
  lexicalVector?: number[];   // BM25-style hashing (4096-dim)
  startLine?: number;         // Line number mapping
  endLine?: number;
  tokenOffset?: number;       // Token position for span budgeting
  tokenCount?: number;

  // Metadata
  version: 1 | 2;             // Schema version for migration
  indexedAt: number;          // Timestamp for cache invalidation
}
```

### 3.5 V2 Search Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        V2 Search Pipeline                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────────────┐    │
│  │  Query  │───►│ Query        │───►│ Parallel Search         │    │
│  │         │    │ Expansion    │    │ ┌─────────┐ ┌─────────┐ │    │
│  └─────────┘    │ (optional)   │    │ │ Dense   │ │ Lexical │ │    │
│                 └──────────────┘    │ │ Search  │ │ Search  │ │    │
│                                     │ └────┬────┘ └────┬────┘ │    │
│                                     └──────┼──────────┼──────┘    │
│                                            │          │            │
│                                            ▼          ▼            │
│                                     ┌─────────────────────┐        │
│                                     │   RRF Fusion        │        │
│                                     │   score = Σ w/k+rank│        │
│                                     └──────────┬──────────┘        │
│                                                │                   │
│                                                ▼                   │
│                                     ┌─────────────────────┐        │
│                                     │   ONNX Reranking    │        │
│                                     │   (cross-encoder)   │        │
│                                     └──────────┬──────────┘        │
│                                                │                   │
│                                                ▼                   │
│                                     ┌─────────────────────┐        │
│                                     │   LLM Synthesis     │        │
│                                     │   (optional, V1)    │        │
│                                     └──────────┬──────────┘        │
│                                                │                   │
│                                                ▼                   │
│                                     ┌─────────────────────┐        │
│                                     │   Final Results     │        │
│                                     │   with Citations    │        │
│                                     └─────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```


---

## 4. Gap Analysis

### 4.1 Critical Gaps (High Priority)

| Gap | V1 Current | Target (V2) | Impact | Effort |
|-----|------------|-------------|--------|--------|
| **Lexical Search Missing** | Semantic only | Hybrid (dense + lexical) | High - misses exact identifier matches | Medium |
| **Coarse Chunking** | 1500 char windows | 16-token micro-chunks | High - diluted semantic signal | Medium |
| **No Line Citations** | Chunk-level only | Line-level precision | Medium - imprecise references | Low |
| **No Reranking** | LLM synthesis only | ONNX cross-encoder | High - inconsistent ranking | Medium |
| **No Query Expansion** | Raw query only | Semantic + PRF | Medium - missed related terms | Low |

### 4.2 Moderate Gaps (Medium Priority)

| Gap | V1 Current | Target (V2) | Impact | Effort |
|-----|------------|-------------|--------|--------|
| **No Result Diversification** | Top-K by score | MMR diversification | Medium - redundant results | Low |
| **No Caching Layer** | None | Multi-policy cache | Medium - repeated work | Low |
| **No Adaptive Weights** | Fixed scoring | Query-adaptive weights | Low - suboptimal for some queries | Medium |
| **No AST Awareness** | Text-only chunking | AST-aware boundaries | Medium - split functions | High |

### 4.3 Future Enhancements (Low Priority - Phase 3+)

| Gap | V1 Current | Target (V2) | Impact | Effort |
|-----|------------|-------------|--------|--------|
| **No Learning Reranker** | Static ranking | TinyScorer + teacher | Low - no personalization | High |
| **No Span Budgeting** | Fixed top-K | Token budget management | Low - output size control | Medium |
| **No Multi-Repo Collections** | Per-agent tables | Cross-agent search | Low - single codebase | Medium |

### 4.4 V1 Strengths to Preserve

| Strength | Current Implementation | Preservation Strategy |
|----------|----------------------|----------------------|
| **Folder Sync** | `lib/vectordb/indexing.ts` | Keep unchanged, extend for V2 schema |
| **File Change Detection** | Hash-based in indexing | Preserve, add V2 metadata fields |
| **Re-indexing Pipeline** | Incremental updates | Extend to support lexical vector updates |
| **Embedded Database** | LanceDB (no server) | Continue using LanceDB |
| **LLM Synthesizer** | `lib/ai/vector-search/synthesizer.ts` | Preserve as optional enhancement |
| **readFile Tool** | Synthesizer capability | Preserve for deep code exploration |
| **Per-Agent Tables** | `getAgentTableName()` | Keep table naming convention |

---

## 5. Implementation Patterns

### 5.1 RRF Fusion Utility

```typescript
// lib/ai/vector-search/v2/fusion.ts

export interface RankedHit {
  id: string;
  rank: number;
  score: number;
  source: 'dense' | 'lexical';
}

export interface FusionOptions {
  k?: number;           // RRF k parameter (default: 30)
  denseWeight?: number; // Weight for dense results (default: 1.5)
  lexicalWeight?: number; // Weight for lexical results (default: 0.2)
}

/**
 * Reciprocal Rank Fusion (RRF) combines multiple ranked lists
 * RRF(d) = Σ (weight / (k + rank(d)))
 */
export function rrfFusion(
  denseHits: RankedHit[],
  lexicalHits: RankedHit[],
  options: FusionOptions = {}
): Map<string, number> {
  const { k = 30, denseWeight = 1.5, lexicalWeight = 0.2 } = options;

  const scores = new Map<string, number>();

  // Add dense scores
  denseHits.forEach((hit, index) => {
    const rrfScore = denseWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  // Add lexical scores
  lexicalHits.forEach((hit, index) => {
    const rrfScore = lexicalWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  return scores;
}

/**
 * MMR (Maximal Marginal Relevance) for result diversification
 */
export function mmrDiversify(
  hits: VectorSearchHit[],
  embeddings: Map<string, number[]>,
  lambda: number = 0.7,
  topK: number = 10
): VectorSearchHit[] {
  const selected: VectorSearchHit[] = [];
  const remaining = new Set(hits.map(h => h.id));

  while (selected.length < topK && remaining.size > 0) {
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const id of remaining) {
      const hit = hits.find(h => h.id === id)!;
      const relevance = hit.score;

      // Calculate max similarity to already selected
      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(
          embeddings.get(id)!,
          embeddings.get(sel.id)!
        );
        maxSim = Math.max(maxSim, sim);
      }

      // MMR score: balance relevance with diversity
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestId = id;
      }
    }

    if (bestId) {
      selected.push(hits.find(h => h.id === bestId)!);
      remaining.delete(bestId);
    }
  }

  return selected;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}
```

### 5.2 Token-Based Micro-Chunking

```typescript
// lib/documents/v2/token-chunking.ts

import { encode, decode } from 'gpt-tokenizer'; // or tiktoken equivalent

export interface MicroChunk {
  index: number;
  text: string;
  startLine: number;
  endLine: number;
  tokenOffset: number;
  tokenCount: number;
}

export interface TokenChunkingOptions {
  windowTokens?: number;  // Default: 16
  strideTokens?: number;  // Default: 8
}

/**
 * ReFRAG-style micro-chunking with line number mapping
 */
export function chunkByTokens(
  text: string,
  options: TokenChunkingOptions = {}
): MicroChunk[] {
  const windowTokens = options.windowTokens ?? 16;
  const strideTokens = options.strideTokens ?? 8;

  const tokens = encode(text);
  const chunks: MicroChunk[] = [];

  // Pre-compute line starts for efficient mapping
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  let chunkIndex = 0;
  for (let i = 0; i < tokens.length; i += strideTokens) {
    const windowEnd = Math.min(i + windowTokens, tokens.length);
    const windowTokens_ = tokens.slice(i, windowEnd);
    const chunkText = decode(windowTokens_);

    // Map token offset to character offset
    const prefixTokens = tokens.slice(0, i);
    const prefixText = decode(prefixTokens);
    const startChar = prefixText.length;

    const endTokens = tokens.slice(0, windowEnd);
    const endText = decode(endTokens);
    const endChar = endText.length;

    // Map character offsets to line numbers
    const startLine = findLineNumber(lineStarts, startChar);
    const endLine = findLineNumber(lineStarts, endChar);

    chunks.push({
      index: chunkIndex++,
      text: chunkText,
      startLine,
      endLine,
      tokenOffset: i,
      tokenCount: windowEnd - i,
    });

    if (windowEnd >= tokens.length) break;
  }

  return chunks;
}

function findLineNumber(lineStarts: number[], charOffset: number): number {
  // Binary search for the line containing this character offset
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (lineStarts[mid] <= charOffset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1; // 1-indexed line numbers
}
```


### 5.3 Lexical Vector Generation

```typescript
// lib/vectordb/v2/lexical-vectors.ts

const LEX_DIM = 4096;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once',
  'if', 'or', 'and', 'but', 'not', 'so', 'than', 'too',
  'very', 'just', 'only', 'own', 'same', 'that', 'this',
]);

/**
 * Tokenize text for lexical matching
 * Handles camelCase, snake_case, and common code patterns
 */
export function tokenizeForLex(text: string): string[] {
  return text
    // Split on camelCase: "getUserName" -> "get User Name"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Split on common delimiters
    .split(/[_\-\s\.\/\\:;,(){}[\]<>"'`]+/)
    // Lowercase and filter
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Simple string hash for bucket assignment
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate BM25-style hashed lexical vector
 */
export function generateLexicalVector(text: string): number[] {
  const tokens = tokenizeForLex(text);
  const vec = new Array(LEX_DIM).fill(0);

  for (const token of tokens) {
    const bucket = hashString(token) % LEX_DIM;
    vec[bucket] += 1.0;
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

/**
 * Search using lexical vectors in LanceDB
 */
export async function searchLexical(params: {
  table: Table;
  query: string;
  topK: number;
}): Promise<VectorSearchHit[]> {
  const { table, query, topK } = params;

  const lexicalVector = generateLexicalVector(query);

  // LanceDB vector search on lexical column
  const results = await table
    .vectorSearch(lexicalVector)
    .column('lexicalVector')
    .distanceType('cosine')
    .limit(topK)
    .toArray();

  return results.map((r, rank) => ({
    id: r.id,
    score: 1 - (r._distance ?? 0),
    rank,
    // ... other fields
  }));
}
```

### 5.4 Hybrid Search Implementation

```typescript
// lib/vectordb/v2/hybrid-search.ts

import { searchVectorDB } from '../search';
import { searchLexical, generateLexicalVector } from './lexical-vectors';
import { rrfFusion, mmrDiversify } from '@/lib/ai/vector-search/v2/fusion';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

export interface HybridSearchOptions {
  topK?: number;
  enableDiversification?: boolean;
  useLLMSynthesis?: boolean;
}

/**
 * V2 Hybrid Search: Dense + Lexical with RRF fusion
 */
export async function hybridSearchV2(params: {
  characterId: string;
  query: string;
  options?: HybridSearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();
  const { characterId, query, options } = params;
  const topK = options?.topK ?? 10;

  // If hybrid not enabled, fall back to V1
  if (!config.enableHybridSearch) {
    return searchVectorDB({ characterId, query, options: { topK } });
  }

  // 1. Parallel dense + lexical search
  const [denseResults, lexicalResults] = await Promise.all([
    searchVectorDB({ characterId, query, options: { topK: topK * 2 } }),
    searchLexicalDB({ characterId, query, options: { topK: topK * 2 } }),
  ]);

  // 2. RRF fusion
  const fusedScores = rrfFusion(
    denseResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: 'dense' as const })),
    lexicalResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: 'lexical' as const })),
    { k: config.rrfK, denseWeight: config.denseWeight, lexicalWeight: config.lexicalWeight }
  );

  // 3. Combine and sort
  const hitMap = new Map<string, VectorSearchHit>();
  [...denseResults, ...lexicalResults].forEach(h => hitMap.set(h.id, h));

  let results = [...fusedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK * 2)
    .map(([id, score]) => ({ ...hitMap.get(id)!, score }));

  // 4. Optional MMR diversification
  if (options?.enableDiversification) {
    // Would need embeddings for MMR - simplified here
    results = results.slice(0, topK);
  } else {
    results = results.slice(0, topK);
  }

  return results;
}
```


---

## 6. Migration Strategy

### 6.1 Phased Rollout Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         V2 Migration Phases                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Foundation (2-3 weeks)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ • Add V2 folder structure alongside V1                               │   │
│  │ • Implement token-based chunking (lib/documents/v2/)                 │   │
│  │ • Add lexical vector generation (lib/vectordb/v2/)                   │   │
│  │ • Create configuration system with feature flags                     │   │
│  │ • All V2 features disabled by default                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  Phase 2: Hybrid Search (2-3 weeks)                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ • Extend LanceDB schema for dual vectors                             │   │
│  │ • Implement RRF fusion utilities                                     │   │
│  │ • Add hybrid search endpoint (parallel to V1)                        │   │
│  │ • A/B testing infrastructure for V1 vs V2                            │   │
│  │ • Metrics collection for search quality comparison                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  Phase 3: Reranking (2-3 weeks)                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ • Integrate ONNX runtime for cross-encoder                           │   │
│  │ • Implement reranking layer                                          │   │
│  │ • Preserve LLM synthesizer as optional enhancement                   │   │
│  │ • Performance benchmarking                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  Phase 4: Enhancement (2-3 weeks)                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ • Query expansion with caching                                       │   │
│  │ • MMR diversification                                                │   │
│  │ • Line-level citations                                               │   │
│  │ • Production rollout (gradual % increase)                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  Phase 5: Optimization (Ongoing)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ • Learning reranker (TinyScorer) - optional                          │   │
│  │ • AST-aware chunking                                                 │   │
│  │ • Adaptive weight tuning                                             │   │
│  │ • V1 deprecation (after V2 stability confirmed)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Side-by-Side Deployment

```typescript
// lib/vectordb/search-router.ts

import { searchVectorDB } from './search';
import { hybridSearchV2 } from './v2/hybrid-search';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

/**
 * Router that enables V1/V2 side-by-side operation
 */
export async function searchWithRouter(params: {
  characterId: string;
  query: string;
  options?: SearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();

  // Feature flag determines which version to use
  if (config.enableHybridSearch) {
    console.log('[Search] Using V2 hybrid search');
    return hybridSearchV2(params);
  }

  console.log('[Search] Using V1 semantic search');
  return searchVectorDB(params);
}
```

### 6.3 Schema Migration

```typescript
// lib/vectordb/v2/migration.ts

/**
 * Migrate V1 documents to V2 schema
 * Preserves all V1 data while adding V2 fields
 */
export async function migrateToV2Schema(params: {
  characterId: string;
  batchSize?: number;
}): Promise<{ migrated: number; errors: number }> {
  const { characterId, batchSize = 100 } = params;

  const db = await getLanceDB();
  const tableName = getAgentTableName(characterId);
  const table = await db.openTable(tableName);

  let migrated = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    // Fetch batch of V1 documents
    const docs = await table
      .search()
      .where('version IS NULL OR version = 1')
      .limit(batchSize)
      .offset(offset)
      .toArray();

    if (docs.length === 0) break;

    // Migrate each document
    for (const doc of docs) {
      try {
        // Generate lexical vector
        const lexicalVector = generateLexicalVector(doc.text);

        // Re-chunk with token-based chunking for line numbers
        // (simplified - full implementation would re-process file)
        const lineInfo = estimateLineNumbers(doc.text, doc.chunkIndex);

        // Update document with V2 fields
        await table.update({
          where: `id = '${doc.id}'`,
          values: {
            lexicalVector,
            startLine: lineInfo.startLine,
            endLine: lineInfo.endLine,
            version: 2,
            indexedAt: Date.now(),
          },
        });

        migrated++;
      } catch (error) {
        console.error(`[Migration] Error migrating ${doc.id}:`, error);
        errors++;
      }
    }

    offset += batchSize;
    console.log(`[Migration] Progress: ${migrated} migrated, ${errors} errors`);
  }

  return { migrated, errors };
}
```

### 6.4 Rollback Capability

```typescript
// lib/config/vector-search.ts

/**
 * Emergency rollback to V1
 * Can be triggered via environment variable or API
 */
export function rollbackToV1(): void {
  // Disable all V2 features
  process.env.VECTOR_SEARCH_V2_ENABLED = 'false';

  // Clear any V2 caches
  clearV2Caches();

  console.log('[VectorSearch] Rolled back to V1');
}

/**
 * Gradual rollout percentage
 * Allows testing V2 with subset of traffic
 */
export function getV2RolloutPercentage(): number {
  return parseInt(process.env.VECTOR_SEARCH_V2_PERCENTAGE ?? '0', 10);
}

export function shouldUseV2(characterId: string): boolean {
  const percentage = getV2RolloutPercentage();
  if (percentage === 0) return false;
  if (percentage === 100) return true;

  // Consistent hashing for deterministic assignment
  const hash = hashString(characterId);
  return (hash % 100) < percentage;
}
```

### 6.5 Testing Strategy

```typescript
// Tests to validate V2 migration

describe('V2 Migration', () => {
  describe('Search Quality', () => {
    it('should return results for exact identifier queries', async () => {
      // V1 weakness: semantic search misses exact matches
      const results = await hybridSearchV2({
        characterId: 'test',
        query: 'getUserById',
      });
      expect(results.some(r => r.text.includes('getUserById'))).toBe(true);
    });

    it('should maintain semantic search quality', async () => {
      // Ensure V2 doesn't regress on semantic queries
      const results = await hybridSearchV2({
        characterId: 'test',
        query: 'function to fetch user data from database',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0.5);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with V1 documents', async () => {
      // V2 should handle documents without lexicalVector
      const results = await hybridSearchV2({
        characterId: 'legacy-agent',
        query: 'test query',
      });
      expect(results).toBeDefined();
    });
  });
});
```

---

## 7. Conclusion

### 7.1 Summary of Recommendations

1. **Preserve V1 Strengths**: Folder sync, file change detection, re-indexing pipeline, LLM synthesizer
2. **Adopt Context-Engine Techniques**:
   - ReFRAG micro-chunking (16-token windows)
   - Hybrid search (dense + lexical with RRF fusion)
   - ONNX cross-encoder reranking
3. **Maintain Embedded Architecture**: Continue using LanceDB (no external dependencies)
4. **Enable Gradual Rollout**: Feature flags for V1/V2 side-by-side operation

### 7.2 Expected Improvements

| Metric | V1 Baseline | V2 Target | Improvement |
|--------|-------------|-----------|-------------|
| Exact identifier matches | ~40% recall | ~90% recall | +125% |
| Semantic relevance | 70% precision | 85% precision | +21% |
| Search latency | 200-500ms | 100-300ms | -40% |
| Citation accuracy | Chunk-level | Line-level | Qualitative |

### 7.3 Next Steps

1. [ ] Review and approve this analysis document
2. [ ] Create V2 folder structure
3. [ ] Implement Phase 1: Token chunking + lexical vectors
4. [ ] Set up A/B testing infrastructure
5. [ ] Begin Phase 2: Hybrid search implementation

---

*Document prepared for styly-agent V2 Vector Search upgrade planning.*


# Vector Search V2 Implementation Guide

> **Reference Document**: `docs/vector-search-v2-analysis.md`  
> **Target**: Developers implementing the V2 vector search system

---

## Prerequisites

### Required Knowledge
- TypeScript/Node.js development
- LanceDB vector database operations
- Understanding of embedding models and vector similarity

### Environment Setup
```powershell
# Verify Node.js version (18+ required)
node --version

# Verify existing V1 implementation works
npm run dev
```

### V1 Files You MUST NOT Modify
These files contain operational strengths that must be preserved:

| File | Reason |
|------|--------|
| `lib/vectordb/client.ts` | LanceDB connection management |
| `lib/vectordb/collections.ts` | Per-agent table naming |
| `lib/vectordb/indexing.ts` | Folder sync & file change detection |
| `lib/ai/vector-search/synthesizer.ts` | LLM synthesis with readFile tool |

---

## Phase 1: Foundation (Week 1-2)

### Task 1.1: Install Dependencies

```powershell
# Token encoding library (choose one)
npm install gpt-tokenizer
# OR
npm install @dqbd/tiktoken

# LRU cache for query expansion
npm install lru-cache

# Type definitions
npm install -D @types/lru-cache
```

**Acceptance Criteria**: `npm run build` succeeds with new dependencies.

---

### Task 1.2: Create V2 Configuration System

**File to create**: `lib/config/vector-search.ts`

```typescript
/**
 * V2 Vector Search Configuration
 * Reference: docs/vector-search-v2-analysis.md Section 3.3
 */

export interface VectorSearchV2Config {
  // Feature flags - all default to false for V1 compatibility
  enableHybridSearch: boolean;
  enableTokenChunking: boolean;
  enableReranking: boolean;
  enableQueryExpansion: boolean;

  // Chunking (Section 2.1)
  chunkingStrategy: 'character' | 'token' | 'ast';
  tokenChunkSize: number;
  tokenChunkStride: number;

  // Search (Section 2.2)
  searchMode: 'semantic' | 'lexical' | 'hybrid';
  denseWeight: number;
  lexicalWeight: number;
  rrfK: number;

  // Reranking (Section 2.4)
  rerankModel: string;
  rerankTopK: number;

  // V1 preserved feature
  enableLLMSynthesis: boolean;
}

const defaultConfig: VectorSearchV2Config = {
  enableHybridSearch: false,
  enableTokenChunking: false,
  enableReranking: false,
  enableQueryExpansion: false,

  chunkingStrategy: 'character',
  tokenChunkSize: 16,
  tokenChunkStride: 8,

  searchMode: 'semantic',
  denseWeight: 1.5,
  lexicalWeight: 0.2,
  rrfK: 30,

  rerankModel: 'models/ms-marco-MiniLM-L-6-v2.onnx',
  rerankTopK: 20,

  enableLLMSynthesis: true,
};

let currentConfig: VectorSearchV2Config = { ...defaultConfig };

export function getVectorSearchConfig(): VectorSearchV2Config {
  return currentConfig;
}

export function updateVectorSearchConfig(
  updates: Partial<VectorSearchV2Config>
): void {
  currentConfig = { ...currentConfig, ...updates };
}

export function resetVectorSearchConfig(): void {
  currentConfig = { ...defaultConfig };
}

// Environment variable overrides
export function loadConfigFromEnv(): void {
  if (process.env.VECTOR_SEARCH_HYBRID === 'true') {
    currentConfig.enableHybridSearch = true;
    currentConfig.searchMode = 'hybrid';
  }
  if (process.env.VECTOR_SEARCH_TOKEN_CHUNKING === 'true') {
    currentConfig.enableTokenChunking = true;
    currentConfig.chunkingStrategy = 'token';
  }
  if (process.env.VECTOR_SEARCH_RERANKING === 'true') {
    currentConfig.enableReranking = true;
  }
}

// Rollback capability (Section 6.4)
export function rollbackToV1(): void {
  currentConfig = { ...defaultConfig };
  console.log('[VectorSearch] Rolled back to V1 configuration');
}
```

**Acceptance Criteria**:
- [ ] File compiles without errors
- [ ] `getVectorSearchConfig()` returns default config
- [ ] `updateVectorSearchConfig({ enableHybridSearch: true })` updates config
- [ ] `rollbackToV1()` resets to defaults

---

### Task 1.3: Create Token-Based Micro-Chunking

**File to create**: `lib/documents/v2/token-chunking.ts`

**Reference**: Analysis document Section 5.2

```typescript
/**
 * ReFRAG-style Token-Based Micro-Chunking
 * Reference: docs/vector-search-v2-analysis.md Section 5.2
 */

import { encode, decode } from 'gpt-tokenizer';

export interface MicroChunk {
  index: number;
  text: string;
  startLine: number;
  endLine: number;
  tokenOffset: number;
  tokenCount: number;
}

export interface TokenChunkingOptions {
  windowTokens?: number;  // Default: 16 (from Context-Engine)
  strideTokens?: number;  // Default: 8 (50% overlap)
}

/**
 * Chunk text into token-aligned micro-chunks with line number mapping.
 * 
 * Key difference from V1 character chunking:
 * - V1: 1500 chars, 200 char overlap → ~375 tokens per chunk
 * - V2: 16 tokens, 8 token stride → fine-grained semantic units
 */
export function chunkByTokens(
  text: string,
  options: TokenChunkingOptions = {}
): MicroChunk[] {
  const windowTokens = options.windowTokens ?? 16;
  const strideTokens = options.strideTokens ?? 8;

  if (!text.trim()) return [];

  const tokens = encode(text);
  const chunks: MicroChunk[] = [];

  // Pre-compute line starts for O(log n) line number lookup
  const lineStarts = buildLineStartIndex(text);

  let chunkIndex = 0;
  for (let tokenStart = 0; tokenStart < tokens.length; tokenStart += strideTokens) {
    const tokenEnd = Math.min(tokenStart + windowTokens, tokens.length);
    const windowTokenSlice = tokens.slice(tokenStart, tokenEnd);
    const chunkText = decode(windowTokenSlice);

    // Map token positions to character positions to line numbers
    const startChar = decode(tokens.slice(0, tokenStart)).length;
    const endChar = decode(tokens.slice(0, tokenEnd)).length;

    const startLine = findLineNumber(lineStarts, startChar);
    const endLine = findLineNumber(lineStarts, endChar);

    chunks.push({
      index: chunkIndex++,
      text: chunkText,
      startLine,
      endLine,
      tokenOffset: tokenStart,
      tokenCount: tokenEnd - tokenStart,
    });

    if (tokenEnd >= tokens.length) break;
  }

  return chunks;
}

function buildLineStartIndex(text: string): number[] {
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}

function findLineNumber(lineStarts: number[], charOffset: number): number {
  // Binary search for efficiency
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (lineStarts[mid] <= charOffset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1; // 1-indexed
}

// Re-export V1 chunking for backward compatibility
export { chunkText } from '../chunking';
```

**File to create**: `lib/documents/v2/index.ts`

```typescript
export * from './token-chunking';
```

**Acceptance Criteria**:
- [ ] `chunkByTokens("function hello() {\n  return 'world';\n}")` returns chunks with correct line numbers
- [ ] Each chunk has `tokenCount <= 16` (default window)
- [ ] Adjacent chunks overlap by ~8 tokens
- [ ] Empty string returns empty array

**Test to write**:
```typescript
describe('chunkByTokens', () => {
  it('should create overlapping micro-chunks', () => {
    const code = `function getUserById(id: string) {
  const user = db.users.find(u => u.id === id);
  return user;
}`;
    const chunks = chunkByTokens(code);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].tokenCount).toBeLessThanOrEqual(16);
  });

  it('should map line numbers correctly', () => {
    const code = "line1\nline2\nline3";
    const chunks = chunkByTokens(code, { windowTokens: 4, strideTokens: 2 });
    
    expect(chunks.some(c => c.startLine === 1)).toBe(true);
    expect(chunks.some(c => c.endLine >= 2)).toBe(true);
  });
});
```

---

### Task 1.4: Create Lexical Vector Generation

**File to create**: `lib/vectordb/v2/lexical-vectors.ts`

**Reference**: Analysis document Section 5.3

```typescript
/**
 * BM25-Style Lexical Vector Generation
 * Reference: docs/vector-search-v2-analysis.md Section 5.3
 */

export const LEX_DIM = 4096;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once',
  'if', 'or', 'and', 'but', 'not', 'so', 'than', 'too',
  'very', 'just', 'only', 'own', 'same', 'that', 'this',
  // Code-specific stop words
  'function', 'return', 'const', 'let', 'var', 'import', 'export',
  'from', 'default', 'class', 'interface', 'type', 'extends',
]);

/**
 * Tokenize text for lexical matching.
 * Handles camelCase, snake_case, and code patterns.
 */
export function tokenizeForLex(text: string): string[] {
  return text
    // Split camelCase: "getUserName" → "get User Name"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Split on delimiters
    .split(/[_\-\s\.\/\\:;,(){}[\]<>"'`=+*&|!?@#$%^~]+/)
    // Normalize
    .map(t => t.toLowerCase().trim())
    // Filter
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * DJB2 hash function for bucket assignment
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate a BM25-style hashed lexical vector.
 * Maps tokens to fixed-dimension vector using hashing trick.
 */
export function generateLexicalVector(text: string): number[] {
  const tokens = tokenizeForLex(text);
  const vec = new Array<number>(LEX_DIM).fill(0);

  for (const token of tokens) {
    const bucket = hashString(token) % LEX_DIM;
    vec[bucket] += 1.0;
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

/**
 * Compute cosine similarity between two lexical vectors
 */
export function lexicalSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
```

**Acceptance Criteria**:
- [ ] `tokenizeForLex("getUserById")` returns `["get", "user", "by", "id"]`
- [ ] `tokenizeForLex("get_user_by_id")` returns `["get", "user", "by", "id"]`
- [ ] `generateLexicalVector("test")` returns array of length 4096
- [ ] Vector is L2 normalized (magnitude ≈ 1.0)
- [ ] `lexicalSimilarity(vec, vec) ≈ 1.0`

---

### Task 1.5: Create V2 Index Exports

**File to create**: `lib/vectordb/v2/index.ts`

```typescript
export * from './lexical-vectors';
```

**File to create**: `lib/ai/vector-search/v2/index.ts`

```typescript
// Will be populated in Phase 2
export {};
```

---

## Phase 2: Hybrid Search (Week 3-4)

### Task 2.1: Create RRF Fusion Utilities

**File to create**: `lib/ai/vector-search/v2/fusion.ts`

**Reference**: Analysis document Section 5.1

```typescript
/**
 * Reciprocal Rank Fusion (RRF) and MMR Diversification
 * Reference: docs/vector-search-v2-analysis.md Section 5.1
 */

import type { VectorSearchHit } from '@/lib/vectordb/search';

export interface RankedHit {
  id: string;
  rank: number;
  score: number;
  source: 'dense' | 'lexical';
}

export interface FusionOptions {
  k?: number;             // RRF k parameter (default: 30)
  denseWeight?: number;   // Dense result weight (default: 1.5)
  lexicalWeight?: number; // Lexical result weight (default: 0.2)
}

/**
 * Reciprocal Rank Fusion combines multiple ranked lists.
 * Formula: RRF(d) = Σ (weight / (k + rank(d)))
 * 
 * Why RRF works:
 * - Documents ranked highly by BOTH methods get boosted
 * - k=30 prevents over-weighting top results
 * - Weights let you tune semantic vs. keyword importance
 */
export function rrfFusion(
  denseHits: RankedHit[],
  lexicalHits: RankedHit[],
  options: FusionOptions = {}
): Map<string, number> {
  const { k = 30, denseWeight = 1.5, lexicalWeight = 0.2 } = options;

  const scores = new Map<string, number>();

  // Add dense (semantic) scores
  denseHits.forEach((hit, index) => {
    const rrfScore = denseWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  // Add lexical scores
  lexicalHits.forEach((hit, index) => {
    const rrfScore = lexicalWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  return scores;
}

/**
 * Sort fused results by RRF score
 */
export function sortByFusedScore(
  scores: Map<string, number>,
  hitMap: Map<string, VectorSearchHit>,
  topK: number
): VectorSearchHit[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => {
      const hit = hitMap.get(id);
      if (!hit) throw new Error(`Missing hit for id: ${id}`);
      return { ...hit, score };
    });
}

/**
 * Cosine similarity for MMR diversification
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Maximal Marginal Relevance (MMR) for result diversification.
 * Balances relevance with diversity to reduce redundant results.
 * 
 * @param lambda - 0.7 = favor relevance, 0.3 = favor diversity
 */
export function mmrDiversify(
  hits: VectorSearchHit[],
  embeddings: Map<string, number[]>,
  lambda: number = 0.7,
  topK: number = 10
): VectorSearchHit[] {
  if (hits.length === 0) return [];
  
  const selected: VectorSearchHit[] = [];
  const remaining = new Set(hits.map(h => h.id));

  // Always select the top result first
  const firstHit = hits[0];
  selected.push(firstHit);
  remaining.delete(firstHit.id);

  while (selected.length < topK && remaining.size > 0) {
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const id of remaining) {
      const hit = hits.find(h => h.id === id)!;
      const relevance = hit.score;

      // Calculate max similarity to already selected results
      let maxSim = 0;
      const embedding = embeddings.get(id);
      if (embedding) {
        for (const sel of selected) {
          const selEmb = embeddings.get(sel.id);
          if (selEmb) {
            const sim = cosineSimilarity(embedding, selEmb);
            maxSim = Math.max(maxSim, sim);
          }
        }
      }

      // MMR score: λ * relevance - (1 - λ) * max_similarity
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestId = id;
      }
    }

    if (bestId) {
      selected.push(hits.find(h => h.id === bestId)!);
      remaining.delete(bestId);
    } else {
      break;
    }
  }

  return selected;
}
```

**Update**: `lib/ai/vector-search/v2/index.ts`

```typescript
export * from './fusion';
```

**Acceptance Criteria**:
- [ ] `rrfFusion([{id:'a',rank:0,...}], [{id:'a',rank:1,...}])` combines scores correctly
- [ ] Document appearing in both lists gets higher score than single-list document
- [ ] `mmrDiversify` with identical embeddings selects diverse results

---

### Task 2.2: Extend LanceDB Schema for Dual Vectors

**File to create**: `lib/vectordb/v2/schema.ts`

```typescript
/**
 * V2 Extended Schema for Hybrid Search
 * Reference: docs/vector-search-v2-analysis.md Section 3.4
 */

export interface VectorDocumentV1 {
  id: string;
  text: string;
  filePath: string;
  relativePath: string;
  chunkIndex: number;
  folderId: string;
  vector: number[];
}

export interface VectorDocumentV2 extends VectorDocumentV1 {
  // V2 additions
  lexicalVector?: number[];   // BM25-style (4096-dim)
  startLine?: number;         // Line citation start
  endLine?: number;           // Line citation end
  tokenOffset?: number;       // For span budgeting
  tokenCount?: number;        // Chunk token count
  version: 1 | 2;             // Schema version
  indexedAt: number;          // Timestamp
}

export function isV2Document(doc: VectorDocumentV1 | VectorDocumentV2): doc is VectorDocumentV2 {
  return 'version' in doc && doc.version === 2;
}

export function upgradeToV2(
  doc: VectorDocumentV1,
  lexicalVector: number[],
  lineInfo?: { startLine: number; endLine: number }
): VectorDocumentV2 {
  return {
    ...doc,
    lexicalVector,
    startLine: lineInfo?.startLine,
    endLine: lineInfo?.endLine,
    version: 2,
    indexedAt: Date.now(),
  };
}
```

---

### Task 2.3: Create Hybrid Search Implementation

**File to create**: `lib/vectordb/v2/hybrid-search.ts`

**Reference**: Analysis document Section 5.4

```typescript
/**
 * V2 Hybrid Search: Dense + Lexical with RRF Fusion
 * Reference: docs/vector-search-v2-analysis.md Section 5.4
 */

import { embed } from 'ai';
import { getLanceDB } from '../client';
import { getAgentTableName } from '../collections';
import { getEmbeddingModel, getEmbeddingModelId } from '@/lib/ai/providers';
import { searchVectorDB, VectorSearchHit, VectorSearchOptions } from '../search';
import { generateLexicalVector } from './lexical-vectors';
import { rrfFusion, sortByFusedScore } from '@/lib/ai/vector-search/v2/fusion';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

export interface HybridSearchOptions extends VectorSearchOptions {
  enableDiversification?: boolean;
}

/**
 * Hybrid search combining dense (semantic) and lexical (keyword) search.
 * Falls back to V1 semantic-only search if hybrid is disabled.
 */
export async function hybridSearchV2(params: {
  characterId: string;
  query: string;
  options?: HybridSearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();
  const { characterId, query, options } = params;
  const topK = options?.topK ?? 10;

  // Feature flag check - fall back to V1 if disabled
  if (!config.enableHybridSearch) {
    console.log('[HybridSearch] Falling back to V1 semantic search');
    return searchVectorDB({ characterId, query, options: { topK } });
  }

  console.log('[HybridSearch] Running hybrid search (dense + lexical)');

  // 1. Run dense and lexical search in parallel
  const [denseResults, lexicalResults] = await Promise.all([
    searchDense({ characterId, query, topK: topK * 2 }),
    searchLexical({ characterId, query, topK: topK * 2 }),
  ]);

  console.log(`[HybridSearch] Dense: ${denseResults.length}, Lexical: ${lexicalResults.length}`);

  // 2. If one search returns nothing, return the other
  if (denseResults.length === 0) return lexicalResults.slice(0, topK);
  if (lexicalResults.length === 0) return denseResults.slice(0, topK);

  // 3. Apply RRF fusion
  const fusedScores = rrfFusion(
    denseResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: 'dense' as const })),
    lexicalResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: 'lexical' as const })),
    { k: config.rrfK, denseWeight: config.denseWeight, lexicalWeight: config.lexicalWeight }
  );

  // 4. Build hit map for result assembly
  const hitMap = new Map<string, VectorSearchHit>();
  [...denseResults, ...lexicalResults].forEach(h => {
    if (!hitMap.has(h.id)) hitMap.set(h.id, h);
  });

  // 5. Sort by fused score and return
  const results = sortByFusedScore(fusedScores, hitMap, topK);
  
  console.log(`[HybridSearch] Returning ${results.length} fused results`);
  return results;
}

/**
 * Dense (semantic) search - uses existing V1 implementation
 */
async function searchDense(params: {
  characterId: string;
  query: string;
  topK: number;
}): Promise<VectorSearchHit[]> {
  return searchVectorDB({
    characterId: params.characterId,
    query: params.query,
    options: { topK: params.topK, minScore: 0.1 }, // Lower threshold for fusion
  });
}

/**
 * Lexical search using BM25-style hashed vectors
 */
async function searchLexical(params: {
  characterId: string;
  query: string;
  topK: number;
}): Promise<VectorSearchHit[]> {
  const { characterId, query, topK } = params;

  const db = await getLanceDB();
  if (!db) return [];

  const tableName = getAgentTableName(characterId);
  const existingTables = await db.tableNames();

  if (!existingTables.includes(tableName)) {
    return [];
  }

  try {
    const table = await db.openTable(tableName);
    const lexicalVector = generateLexicalVector(query);

    // Search on lexicalVector column
    // NOTE: This requires the table to have lexicalVector indexed
    const results = await table
      .vectorSearch(lexicalVector)
      .column('lexicalVector')
      .distanceType('cosine')
      .limit(topK)
      .toArray();

    return results.map((result, index) => {
      const distance = (result as { _distance?: number })._distance ?? 0;
      const score = 1 - distance;

      return {
        id: result.id as string,
        score,
        text: result.text as string,
        filePath: result.filePath as string,
        relativePath: result.relativePath as string,
        chunkIndex: result.chunkIndex as number,
        folderId: result.folderId as string,
      };
    });
  } catch (error) {
    // Table may not have lexicalVector column yet (V1 data)
    console.warn('[HybridSearch] Lexical search failed, table may need migration:', error);
    return [];
  }
}
```

**Update**: `lib/vectordb/v2/index.ts`

```typescript
export * from './lexical-vectors';
export * from './schema';
export * from './hybrid-search';
```

**Acceptance Criteria**:
- [ ] `hybridSearchV2` with `enableHybridSearch: false` returns same results as V1
- [ ] `hybridSearchV2` with `enableHybridSearch: true` runs both dense and lexical search
- [ ] Query like `"getUserById"` returns results containing that exact identifier (lexical boost)
- [ ] Query like `"function to fetch user data"` returns semantically relevant results (dense boost)

---

### Task 2.4: Create Search Router

**File to create**: `lib/vectordb/search-router.ts`

**Reference**: Analysis document Section 6.2

```typescript
/**
 * Search Router: V1/V2 Side-by-Side Operation
 * Reference: docs/vector-search-v2-analysis.md Section 6.2
 */

import { searchVectorDB, VectorSearchHit, VectorSearchOptions } from './search';
import { hybridSearchV2 } from './v2/hybrid-search';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

/**
 * Router that enables gradual V2 rollout.
 * Replace direct calls to searchVectorDB with this.
 */
export async function searchWithRouter(params: {
  characterId: string;
  query: string;
  options?: VectorSearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();

  if (config.enableHybridSearch && config.searchMode === 'hybrid') {
    return hybridSearchV2(params);
  }

  return searchVectorDB(params);
}

/**
 * Gradual rollout: Use V2 for percentage of requests
 * Based on characterId hash for consistent assignment
 */
export function shouldUseV2(characterId: string): boolean {
  const percentage = parseInt(process.env.VECTOR_SEARCH_V2_PERCENTAGE ?? '0', 10);
  if (percentage === 0) return false;
  if (percentage >= 100) return true;

  // Consistent hash for deterministic assignment
  let hash = 0;
  for (let i = 0; i < characterId.length; i++) {
    hash = ((hash << 5) - hash) + characterId.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) % 100) < percentage;
}
```

---

### Task 2.5: Update Indexing for V2 Schema

**File to modify**: `lib/vectordb/indexing.ts`

**DO NOT REPLACE** - Add V2 support alongside existing code:

```typescript
// ADD these imports at the top
import { generateLexicalVector } from './v2/lexical-vectors';
import { chunkByTokens } from '@/lib/documents/v2/token-chunking';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

// FIND the function that creates document records and ADD lexical vector generation:

// In the document creation section, ADD:
async function createDocumentRecord(params: {
  text: string;
  filePath: string;
  relativePath: string;
  chunkIndex: number;
  folderId: string;
  embedding: number[];
  // V2 additions
  startLine?: number;
  endLine?: number;
}) {
  const config = getVectorSearchConfig();
  
  const baseRecord = {
    id: generateId(),
    text: params.text,
    filePath: params.filePath,
    relativePath: params.relativePath,
    chunkIndex: params.chunkIndex,
    folderId: params.folderId,
    vector: params.embedding,
  };

  // Add V2 fields if enabled
  if (config.enableTokenChunking || config.enableHybridSearch) {
    return {
      ...baseRecord,
      lexicalVector: generateLexicalVector(params.text),
      startLine: params.startLine,
      endLine: params.endLine,
      version: 2 as const,
      indexedAt: Date.now(),
    };
  }

  return baseRecord;
}
```

**Acceptance Criteria**:
- [ ] V1 indexing still works (regression test)
- [ ] With `enableHybridSearch: true`, new documents have `lexicalVector`
- [ ] With `enableTokenChunking: true`, new documents have `startLine`/`endLine`

---

## Phase 3: Reranking (Week 5-6)

### Task 3.1: Install ONNX Runtime

```powershell
npm install onnxruntime-node
```

**Note**: For production, you'll need to download the cross-encoder model:
- Model: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- Convert to ONNX format using Hugging Face Optimum

---

### Task 3.2: Create ONNX Reranker

**File to create**: `lib/ai/vector-search/v2/reranker.ts`

**Reference**: Analysis document Section 2.4

```typescript
/**
 * ONNX Cross-Encoder Reranking
 * Reference: docs/vector-search-v2-analysis.md Section 2.4
 * 
 * NOTE: This requires downloading and converting the model to ONNX format.
 * See: https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2
 */

import * as ort from 'onnxruntime-node';
import { VectorSearchHit } from '@/lib/vectordb/search';
import { getVectorSearchConfig } from '@/lib/config/vector-search';

let session: ort.InferenceSession | null = null;
let sessionLoading: Promise<ort.InferenceSession> | null = null;

/**
 * Load ONNX session (lazy, cached)
 */
async function getSession(): Promise<ort.InferenceSession | null> {
  if (session) return session;
  if (sessionLoading) return sessionLoading;

  const config = getVectorSearchConfig();
  const modelPath = config.rerankModel;

  try {
    sessionLoading = ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'], // Use 'cuda' if GPU available
    });
    session = await sessionLoading;
    console.log('[Reranker] ONNX session loaded');
    return session;
  } catch (error) {
    console.warn('[Reranker] Failed to load ONNX model:', error);
    return null;
  } finally {
    sessionLoading = null;
  }
}

/**
 * Simple tokenizer for reranking (production should use proper tokenizer)
 */
function tokenize(text: string, maxLength: number = 512): number[] {
  // Simplified - use @xenova/transformers or similar for production
  const tokens = text.toLowerCase().split(/\s+/).slice(0, maxLength);
  // This is a placeholder - real implementation needs vocab mapping
  return tokens.map((_, i) => i);
}

/**
 * Rerank search results using ONNX cross-encoder.
 * Falls back to original order if reranking unavailable.
 */
export async function rerankResults(
  query: string,
  hits: VectorSearchHit[]
): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();
  
  if (!config.enableReranking || hits.length === 0) {
    return hits;
  }

  const sess = await getSession();
  if (!sess) {
    console.warn('[Reranker] Session not available, skipping rerank');
    return hits;
  }

  try {
    // Score each query-document pair
    const scores: number[] = [];
    
    for (const hit of hits) {
      const pairText = `${query} [SEP] ${hit.text}`;
      const inputIds = tokenize(pairText);
      
      const inputTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
      const attentionMask = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(() => 1n)), [1, inputIds.length]);
      
      const results = await sess.run({
        input_ids: inputTensor,
        attention_mask: attentionMask,
      });
      
      const logits = results.logits?.data as Float32Array;
      scores.push(logits?.[0] ?? 0);
    }

    // Sort by reranker score
    const reranked = hits
      .map((hit, i) => ({ hit, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .map(({ hit, score }) => ({ ...hit, score }));

    console.log(`[Reranker] Reranked ${hits.length} results`);
    return reranked;
  } catch (error) {
    console.error('[Reranker] Error during reranking:', error);
    return hits;
  }
}
```

**Update**: `lib/ai/vector-search/v2/index.ts`

```typescript
export * from './fusion';
export * from './reranker';
```

**Acceptance Criteria**:
- [ ] `rerankResults` with `enableReranking: false` returns original order
- [ ] `rerankResults` with missing model file returns original order (graceful fallback)
- [ ] With valid model, results are reordered by cross-encoder score

---

### Task 3.3: Integrate Reranking into Hybrid Search

**Modify**: `lib/vectordb/v2/hybrid-search.ts`

Add at the end of `hybridSearchV2`:

```typescript
import { rerankResults } from '@/lib/ai/vector-search/v2/reranker';

// In hybridSearchV2, before returning:
export async function hybridSearchV2(params: {
  characterId: string;
  query: string;
  options?: HybridSearchOptions;
}): Promise<VectorSearchHit[]> {
  // ... existing code ...

  let results = sortByFusedScore(fusedScores, hitMap, topK);

  // Phase 3: Reranking
  const config = getVectorSearchConfig();
  if (config.enableReranking) {
    results = await rerankResults(query, results);
    console.log(`[HybridSearch] Reranked ${results.length} results`);
  }

  return results;
}
```

---

## Phase 4: Enhancement (Week 7-8)

### Task 4.1: Query Expansion

**File to create**: `lib/vectordb/v2/query-expansion.ts`

**Reference**: Analysis document Section 2.5

```typescript
/**
 * Query Expansion with Caching
 * Reference: docs/vector-search-v2-analysis.md Section 2.5
 */

import { LRUCache } from 'lru-cache';
import { embed } from 'ai';
import { getEmbeddingModel, getEmbeddingModelId } from '@/lib/ai/providers';

const expansionCache = new LRUCache<string, string[]>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

/**
 * Expand query with semantically similar terms.
 * Uses embedding similarity to find related terms from a vocabulary.
 */
export async function expandQuery(
  query: string,
  options: { threshold?: number } = {}
): Promise<string[]> {
  const threshold = options.threshold ?? 0.7;
  const cacheKey = `${query}:${threshold}`;

  const cached = expansionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // For now, return just the original query
  // Full implementation would:
  // 1. Embed the query
  // 2. Find similar terms from indexed corpus
  // 3. Add terms above similarity threshold
  
  const expanded = [query];
  
  // Code-specific expansions
  const codeExpansions = getCodeExpansions(query);
  expanded.push(...codeExpansions);

  expansionCache.set(cacheKey, expanded);
  return expanded;
}

/**
 * Code-specific query expansions
 */
function getCodeExpansions(query: string): string[] {
  const expansions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Common code synonyms
  const synonyms: Record<string, string[]> = {
    'function': ['method', 'fn', 'func'],
    'class': ['type', 'interface', 'struct'],
    'get': ['fetch', 'retrieve', 'read', 'load'],
    'set': ['update', 'write', 'save', 'store'],
    'delete': ['remove', 'destroy', 'drop'],
    'create': ['new', 'add', 'insert', 'make'],
    'user': ['account', 'member', 'profile'],
    'auth': ['authentication', 'login', 'signin'],
    'error': ['exception', 'failure', 'issue'],
    'config': ['configuration', 'settings', 'options'],
  };

  for (const [key, values] of Object.entries(synonyms)) {
    if (lowerQuery.includes(key)) {
      expansions.push(...values.map(v => query.replace(new RegExp(key, 'gi'), v)));
    }
  }

  return expansions.slice(0, 3); // Limit expansions
}

/**
 * Clear expansion cache
 */
export function clearExpansionCache(): void {
  expansionCache.clear();
}
```

---

### Task 4.2: Update V2 Index Exports

**Update**: `lib/vectordb/v2/index.ts`

```typescript
export * from './lexical-vectors';
export * from './schema';
export * from './hybrid-search';
export * from './query-expansion';
```

---

## Testing Requirements

### Unit Tests to Create

**File**: `__tests__/vectordb/v2/token-chunking.test.ts`
- Test chunk creation with various code samples
- Test line number mapping accuracy
- Test edge cases (empty string, single line, very long files)

**File**: `__tests__/vectordb/v2/lexical-vectors.test.ts`
- Test tokenization of camelCase and snake_case
- Test vector normalization
- Test similarity calculation

**File**: `__tests__/vectordb/v2/fusion.test.ts`
- Test RRF score calculation
- Test MMR diversification
- Test edge cases (empty lists, single item)

**File**: `__tests__/vectordb/v2/hybrid-search.test.ts`
- Test fallback to V1 when disabled
- Test parallel search execution
- Test fusion of results

### Integration Tests

**File**: `__tests__/integration/v2-search.test.ts`

```typescript
describe('V2 Search Integration', () => {
  beforeAll(async () => {
    // Set up test data with V2 schema
  });

  it('should find exact identifier matches', async () => {
    const results = await hybridSearchV2({
      characterId: 'test-agent',
      query: 'searchVectorDB',
    });
    expect(results.some(r => r.text.includes('searchVectorDB'))).toBe(true);
  });

  it('should find semantic matches', async () => {
    const results = await hybridSearchV2({
      characterId: 'test-agent',
      query: 'search for similar documents in database',
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should not regress V1 functionality', async () => {
    // Compare V1 and V2 results for same query
  });
});
```

---

## Configuration Checklist

### Environment Variables

```env
# V2 Feature Flags (all default to false)
VECTOR_SEARCH_HYBRID=false
VECTOR_SEARCH_TOKEN_CHUNKING=false
VECTOR_SEARCH_RERANKING=false
VECTOR_SEARCH_QUERY_EXPANSION=false

# Gradual Rollout (0-100)
VECTOR_SEARCH_V2_PERCENTAGE=0

# V2 Tuning
VECTOR_SEARCH_RRF_K=30
VECTOR_SEARCH_DENSE_WEIGHT=1.5
VECTOR_SEARCH_LEXICAL_WEIGHT=0.2

# Reranker Model
VECTOR_SEARCH_RERANK_MODEL=models/ms-marco-MiniLM-L-6-v2.onnx
```

---

## Migration Procedure

### Step 1: Deploy V2 Code (Feature Flags Off)
- All new files are deployed
- V1 behavior unchanged
- No database migration yet

### Step 2: Migrate Schema (Background)
- Run migration script to add lexical vectors to existing documents
- No downtime required

### Step 3: Enable V2 for Testing (1-5%)
```env
VECTOR_SEARCH_V2_PERCENTAGE=5
VECTOR_SEARCH_HYBRID=true
```

### Step 4: Monitor and Tune
- Watch logs for `[HybridSearch]` entries
- Compare search quality metrics
- Adjust weights if needed

### Step 5: Gradual Rollout
```env
VECTOR_SEARCH_V2_PERCENTAGE=25
# Then 50, 75, 100
```

### Step 6: Rollback if Needed
```env
VECTOR_SEARCH_V2_PERCENTAGE=0
VECTOR_SEARCH_HYBRID=false
```

---

## File Creation Order Summary

1. `lib/config/vector-search.ts` - Configuration system
2. `lib/documents/v2/token-chunking.ts` - Micro-chunking
3. `lib/documents/v2/index.ts` - Exports
4. `lib/vectordb/v2/lexical-vectors.ts` - Lexical vectors
5. `lib/ai/vector-search/v2/fusion.ts` - RRF fusion
6. `lib/vectordb/v2/schema.ts` - V2 schema types
7. `lib/vectordb/v2/hybrid-search.ts` - Hybrid search
8. `lib/vectordb/v2/index.ts` - Exports
9. `lib/vectordb/search-router.ts` - V1/V2 router
10. `lib/ai/vector-search/v2/reranker.ts` - ONNX reranking
11. `lib/vectordb/v2/query-expansion.ts` - Query expansion
12. `lib/ai/vector-search/v2/index.ts` - Exports

---

This guide provides everything needed to implement V2. Start with Phase 1 and test thoroughly before proceeding to each subsequent phase. The feature flag system ensures you can always roll back to V1 if issues arise.
