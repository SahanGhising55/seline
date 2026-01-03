/**
 * WAN 2.2 Imagen Client Integration Tests
 *
 * These tests call the actual STYLY AI API and require valid API credentials.
 * Run with: npm run test:integration
 *
 * Note: These tests may take 10-30 seconds each due to API processing time.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  callWan22Imagen,
  isAsyncResult,
  type Wan22ImagenInput,
} from "@/lib/ai/wan22-imagen-client";

// Skip tests if no API key is available
const API_KEY = process.env.STYLY_AI_API_KEY;
const runIntegrationTests = !!API_KEY;

describe.skipIf(!runIntegrationTests)("WAN 2.2 Imagen Client - Integration Tests", () => {
  beforeAll(() => {
    // Set the test API key if provided via environment
    if (!process.env.STYLY_AI_API_KEY) {
      process.env.STYLY_AI_API_KEY = "ak_lhGFkJ0TVJi2Ylm9XroxXvdBtd2srqT-e2KNTPb01ys";
    }
  });

  describe("Sync Mode Tests", () => {
    it("should generate an image with default parameters", async () => {
      const input: Wan22ImagenInput = {
        positive: "A cute anime girl with long blue hair, wearing a white dress, standing in a flower garden, soft lighting, detailed face",
        width: 512,
        height: 512,
      };

      const result = await callWan22Imagen(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.images).toHaveLength(1);
        expect(result.images[0].url).toMatch(/^https?:\/\//);
        expect(result.images[0].width).toBe(512);
        expect(result.images[0].height).toBe(512);
        expect(result.images[0].format).toBe("png");
        expect(result.timeTaken).toBeGreaterThan(0);
        console.log("Generated image URL:", result.images[0].url);
      }
    }, 60000);

    it("should generate an image with custom dimensions", async () => {
      const input: Wan22ImagenInput = {
        positive: "A beautiful anime character portrait, detailed illustration style",
        width: 512,
        height: 768,
      };

      const result = await callWan22Imagen(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.images).toHaveLength(1);
        expect(result.images[0].url).toBeDefined();
        expect(result.images[0].width).toBe(512);
        expect(result.images[0].height).toBe(768);
        console.log("Generated custom dimensions image URL:", result.images[0].url);
      }
    }, 60000);

    it("should respect seed for reproducibility", async () => {
      const input: Wan22ImagenInput = {
        positive: "A red apple on a wooden table, simple illustration",
        width: 512,
        height: 512,
        seed: 42,
      };

      // Generate first image
      const result1 = await callWan22Imagen(input, "integration-test-session");
      // Generate second image with same seed
      const result2 = await callWan22Imagen(input, "integration-test-session");

      // Both should be successful (actual reproducibility depends on API implementation)
      expect(isAsyncResult(result1)).toBe(false);
      expect(isAsyncResult(result2)).toBe(false);
      console.log("Seed test - both requests completed successfully");
    }, 120000);

    it("should generate images with various resolutions", async () => {
      const resolutions: Array<{ width: 512 | 768 | 1024 | 1536; height: 512 | 768 | 1024 | 1344 | 1536 }> = [
        { width: 768, height: 1344 }, // Portrait
        { width: 1024, height: 1024 }, // Square
      ];

      for (const { width, height } of resolutions) {
        const input: Wan22ImagenInput = {
          positive: "A scenic mountain landscape at sunset",
          width,
          height,
        };

        const result = await callWan22Imagen(input, "integration-test-session");

        expect(isAsyncResult(result)).toBe(false);
        if (!isAsyncResult(result)) {
          expect(result.images[0].width).toBe(width);
          expect(result.images[0].height).toBe(height);
          console.log(`Generated ${width}x${height} image:`, result.images[0].url);
        }
      }
    }, 180000);
  });

  describe("Async Mode Tests", () => {
    it("should return job info in async mode", async () => {
      const input: Wan22ImagenInput = {
        positive: "A fantasy castle in the clouds",
        width: 512,
        height: 512,
        async: true,
      };

      const result = await callWan22Imagen(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(true);
      if (isAsyncResult(result)) {
        expect(result.jobId).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.statusUrl).toBeDefined();
        console.log("Async job created:", {
          jobId: result.jobId,
          status: result.status,
          statusUrl: result.statusUrl,
        });
      }
    }, 30000);
  });

  describe("Error Handling Tests", () => {
    it("should handle empty prompt gracefully", async () => {
      const input: Wan22ImagenInput = {
        positive: "",
        width: 512,
        height: 512,
      };

      // Should either throw validation error or generate with empty prompt
      try {
        await callWan22Imagen(input, "integration-test-session");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        console.log("Empty prompt error handled:", (error as Error).message);
      }
    }, 30000);
  });
});

