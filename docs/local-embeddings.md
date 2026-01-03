# Local Embeddings (Transformers.js)

## Overview
- Default local model: `Xenova/bge-large-en-v1.5` (1024 dimensions)
- Local embeddings run fully offline inside the Electron build when model files are bundled.
- OpenRouter remains the fallback when local models are unavailable or disabled.

## Model Packaging (Electron)
1) Download the Transformers.js model files and place them under:
   `models/Xenova/bge-large-en-v1.5/`
2) The `electron-builder.yml` `extraResources` section bundles `models/` outside the asar.
3) At runtime, the Electron main process copies bundled models to:
   `app.getPath("userData")/models`

## Settings
- In the settings UI, choose **Embedding Provider = Local**.
- Set **Embedding Model** to `Xenova/bge-large-en-v1.5` (or another supported model ID).
- Optionally set **Local Model Path** if you are testing with a custom location.

Environment variables (optional overrides):
- `EMBEDDING_PROVIDER=local`
- `EMBEDDING_MODEL=Xenova/bge-large-en-v1.5`
- `EMBEDDING_MODEL_DIR=C:\path\to\models`
- `EMBEDDING_CACHE_DIR=C:\path\to\cache`
- `LOCAL_EMBEDDING_QUERY_PREFIX=Represent this code for search:`
- `LOCAL_EMBEDDING_QUERY_MAX_CHARS=512`
- `ALLOW_LOCAL_EMBEDDINGS=true` (allow remote downloads in non-Electron runs)

## Reindexing
Switching embedding models changes vector dimensions. Use the **Reindex All** action
in Settings > Vector Search when prompted to rebuild the LanceDB vectors.

## Testing
- Standalone embedding test:
  - `npm run embedding:test`
- End-to-end pipeline test (index -> search):
  - `npm run embedding:pipeline-test`
