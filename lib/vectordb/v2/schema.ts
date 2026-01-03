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
  lexicalVector?: number[];
  startLine?: number;
  endLine?: number;
  tokenOffset?: number;
  tokenCount?: number;
  version: 1 | 2;
  indexedAt: number;
}

export function isV2Document(
  doc: VectorDocumentV1 | VectorDocumentV2
): doc is VectorDocumentV2 {
  return "version" in doc && doc.version === 2;
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
