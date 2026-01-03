This folder holds local embedding models for Electron builds.

Place Transformers.js model folders here, e.g.:
`models/Xenova/bge-large-en-v1.5/` (default local model)

During packaging, `electron-builder.yml` includes this folder as an extra resource
so the app can run embeddings offline.
