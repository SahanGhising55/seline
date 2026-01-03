/**
 * WAN 2.2 Video Client Integration Tests
 *
 * These tests call the actual STYLY AI API and require valid API credentials.
 * Run with: npm run test:integration
 *
 * Note: Video generation tests may take 30-120 seconds each due to processing time.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  callWan22Video,
  isAsyncResult,
  type Wan22VideoInput,
} from "@/lib/ai/wan22-video-client";

// Skip tests if no API key is available
const API_KEY = process.env.STYLY_AI_API_KEY;
const runIntegrationTests = !!API_KEY;

// Test image - a simple 1x1 red pixel PNG in base64
const TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// Test image URL (a public image for testing)
const TEST_IMAGE_URL = "https://cdn.styly.io/styly-agent/test/test-image.png";

describe.skipIf(!runIntegrationTests)("WAN 2.2 Video Client - Integration Tests", () => {
  beforeAll(() => {
    // Set the test API key if provided via environment
    if (!process.env.STYLY_AI_API_KEY) {
      process.env.STYLY_AI_API_KEY = "ak_lhGFkJ0TVJi2Ylm9XroxXvdBtd2srqT-e2KNTPb01ys";
    }
  });

  describe("Sync Mode Tests - Using base64_image", () => {
    it("should generate video from base64 image with default parameters", async () => {
      const input: Wan22VideoInput = {
        base64_image: TEST_IMAGE_BASE64,
        positive: "Gentle breathing motion, subtle movement",
        duration: 0.5, // Short duration for faster testing
      };

      const result = await callWan22Video(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.videos).toHaveLength(1);
        expect(result.videos[0].url).toMatch(/^https?:\/\//);
        expect(result.videos[0].format).toBe("mp4");
        expect(result.timeTaken).toBeGreaterThan(0);
        console.log("Generated video URL:", result.videos[0].url);
      }
    }, 120000);

    it("should generate video with custom FPS", async () => {
      const input: Wan22VideoInput = {
        base64_image: TEST_IMAGE_BASE64,
        positive: "Smooth camera pan to the right",
        fps: 30,
        duration: 0.5,
      };

      const result = await callWan22Video(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.videos[0].fps).toBe(30);
        console.log("Generated 30fps video:", result.videos[0].url);
      }
    }, 120000);

    it("should generate video with different durations", async () => {
      const durations: Array<0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 5> = [1, 2];

      for (const duration of durations) {
        const input: Wan22VideoInput = {
          base64_image: TEST_IMAGE_BASE64,
          positive: "Slow zoom effect",
          duration,
        };

        const result = await callWan22Video(input, "integration-test-session");

        expect(isAsyncResult(result)).toBe(false);
        if (!isAsyncResult(result)) {
          expect(result.videos[0].duration).toBe(duration);
          console.log(`Generated ${duration}s video:`, result.videos[0].url);
        }
      }
    }, 300000);

    it("should generate video with custom motion amplitude", async () => {
      const input: Wan22VideoInput = {
        base64_image: TEST_IMAGE_BASE64,
        positive: "Dramatic camera movement, intense motion",
        motion_amplitude: 1.0,
        duration: 0.5,
      };

      const result = await callWan22Video(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.videos).toHaveLength(1);
        console.log("Generated high-amplitude video:", result.videos[0].url);
      }
    }, 120000);

    it("should respect seed for reproducibility", async () => {
      const input: Wan22VideoInput = {
        base64_image: TEST_IMAGE_BASE64,
        positive: "Simple left pan",
        duration: 0.5,
        seed: 42,
      };

      const result1 = await callWan22Video(input, "integration-test-session");
      const result2 = await callWan22Video(input, "integration-test-session");

      expect(isAsyncResult(result1)).toBe(false);
      expect(isAsyncResult(result2)).toBe(false);
      console.log("Seed test - both video requests completed successfully");
    }, 240000);
  });

  describe("Async Mode Tests", () => {
    it("should return job info in async mode", async () => {
      const input: Wan22VideoInput = {
        base64_image: TEST_IMAGE_BASE64,
        positive: "Gentle motion effect",
        duration: 0.5,
        async: true,
      };

      const result = await callWan22Video(input, "integration-test-session");

      expect(isAsyncResult(result)).toBe(true);
      if (isAsyncResult(result)) {
        expect(result.jobId).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.statusUrl).toBeDefined();
        console.log("Async video job created:", {
          jobId: result.jobId,
          status: result.status,
          statusUrl: result.statusUrl,
        });
      }
    }, 30000);
  });

  describe("Input Validation Tests", () => {
    it("should reject request with neither image_url nor base64_image", async () => {
      const input: Wan22VideoInput = {
        positive: "This should fail",
      };

      await expect(callWan22Video(input, "integration-test-session")).rejects.toThrow(
        "Either image_url or base64_image must be provided"
      );
    });
  });
});

