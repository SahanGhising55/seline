import { chunkByTokens } from "@/lib/documents/v2/token-chunking";

describe("chunkByTokens", () => {
  it("should create overlapping micro-chunks", () => {
    const code = `function getUserById(id: string) {
  const user = db.users.find(u => u.id === id);
  return user;
}`;
    const chunks = chunkByTokens(code);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].tokenCount).toBeLessThanOrEqual(16);
  });

  it("should map line numbers correctly", () => {
    const code = "line1\nline2\nline3";
    const chunks = chunkByTokens(code, { windowTokens: 4, strideTokens: 2 });

    expect(chunks.some((chunk) => chunk.startLine === 1)).toBe(true);
    expect(chunks.some((chunk) => chunk.endLine >= 2)).toBe(true);
  });

  it("should return empty array for empty input", () => {
    expect(chunkByTokens("")).toEqual([]);
  });
});
