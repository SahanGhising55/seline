import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set environment variables BEFORE importing the module
process.env.STYLY_AI_API_KEY = "test-api-key";
process.env.WAN22_IMAGEN_ENDPOINT = "https://example.test/models/wan-2-2-imagen/predict";

import {
  callWan22Imagen,
  isAsyncResult,
  type Wan22ImagenInput,
  type Wan22ImagenSyncResult,
  type Wan22ImagenAsyncResult,
} from "@/lib/ai/wan22-imagen-client";

// Mock the S3 client
vi.mock("@/lib/s3/client", () => ({
  uploadBase64Image: vi.fn().mockResolvedValue({
    key: "styly-agent/test-session/generated/mock-image.png",
    url: "https://cdn.example.com/styly-agent/test-session/generated/mock-image.png",
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WAN 2.2 Imagen Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure API key is set for each test
    process.env.STYLY_AI_API_KEY = "test-api-key";
  });

  describe("isAsyncResult", () => {
    it("should return true for async results", () => {
      const asyncResult: Wan22ImagenAsyncResult = {
        jobId: "job-123",
        status: "processing",
        statusUrl: "https://example.test/jobs/job-123",
      };
      expect(isAsyncResult(asyncResult)).toBe(true);
    });

    it("should return false for sync results", () => {
      const syncResult: Wan22ImagenSyncResult = {
        images: [{ url: "https://example.com/image.png", width: 768, height: 1344, format: "png" }],
        timeTaken: 5.2,
      };
      expect(isAsyncResult(syncResult)).toBe(false);
    });
  });

  describe("callWan22Imagen - Sync Mode", () => {
    it("should generate image with default parameters", async () => {
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: mockBase64,
          time_taken: 5.2,
          metadata: { request_id: "req-123" },
        }),
      });

      const input: Wan22ImagenInput = {
        positive: "A beautiful anime character",
      };

      const result = await callWan22Imagen(input, "test-session-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.test/models/wan-2-2-imagen/predict",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "test-api-key",
          },
        })
      );

      expect(isAsyncResult(result)).toBe(false);
      if (!isAsyncResult(result)) {
        expect(result.images).toHaveLength(1);
        expect(result.images[0].width).toBe(768);
        expect(result.images[0].height).toBe(1344);
        expect(result.timeTaken).toBe(5.2);
      }
    });

    it("should always send lora_strength as 0", async () => {
      const mockBase64 = "base64data";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockBase64, time_taken: 6.0 }),
      });

      const input: Wan22ImagenInput = {
        positive: "A character with custom style",
      };

      await callWan22Imagen(input, "test-session-id");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.lora_strength).toBe(0);
      expect(body.lora_name).toBeUndefined();
    });

    it("should generate image with custom dimensions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "base64", time_taken: 5.0 }),
      });

      const input: Wan22ImagenInput = {
        positive: "Square image",
        width: 1024,
        height: 1024,
      };

      const result = await callWan22Imagen(input, "test-session-id");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.width).toBe(1024);
      expect(body.height).toBe(1024);

      if (!isAsyncResult(result)) {
        expect(result.images[0].width).toBe(1024);
        expect(result.images[0].height).toBe(1024);
      }
    });

    it("should use seed for reproducibility", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "base64", time_taken: 5.0 }),
      });

      const input: Wan22ImagenInput = {
        positive: "Reproducible image",
        seed: 42,
      };

      await callWan22Imagen(input, "test-session-id");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.seed).toBe(42);
    });

    it("should use custom negative prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "base64", time_taken: 5.0 }),
      });

      const input: Wan22ImagenInput = {
        positive: "Beautiful scene",
        negative: "blurry, low quality, ugly",
      };

      await callWan22Imagen(input, "test-session-id");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.negative).toBe("blurry, low quality, ugly");
    });
  });

  describe("callWan22Imagen - Async Mode", () => {
    it("should return async job result when async=true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job_id: "job-456",
          status: "processing",
          status_url: "https://example.test/jobs/job-456",
          model_name: "wan-2-2-imagen",
          created_at: "2024-01-01T00:00:00Z",
        }),
      });

      const input: Wan22ImagenInput = {
        positive: "Async generation",
        async: true,
      };

      const result = await callWan22Imagen(input, "test-session-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.test/models/wan-2-2-imagen/predict?async=true",
        expect.any(Object)
      );

      expect(isAsyncResult(result)).toBe(true);
      if (isAsyncResult(result)) {
        expect(result.jobId).toBe("job-456");
        expect(result.status).toBe("processing");
        expect(result.statusUrl).toBe("https://example.test/jobs/job-456");
      }
    });
  });

  describe("callWan22Imagen - Error Handling", () => {
    it("should throw error when API key is not configured", async () => {
      delete process.env.STYLY_AI_API_KEY;

      const input: Wan22ImagenInput = {
        positive: "Test image",
      };

      await expect(callWan22Imagen(input, "test-session-id")).rejects.toThrow(
        "STYLY_AI_API_KEY environment variable is not configured"
      );
    });

    it("should throw error on 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const input: Wan22ImagenInput = {
        positive: "Test image",
      };

      await expect(callWan22Imagen(input, "test-session-id")).rejects.toThrow(
        "WAN 2.2 Imagen API authentication failed: Invalid API key"
      );
    });

    it("should throw error on 422 validation error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => "Invalid prompt format",
      });

      const input: Wan22ImagenInput = {
        positive: "",
      };

      await expect(callWan22Imagen(input, "test-session-id")).rejects.toThrow(
        "WAN 2.2 Imagen API validation error: Invalid prompt format"
      );
    });

    it("should throw error on 503 service unavailable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => "Service temporarily unavailable",
      });

      const input: Wan22ImagenInput = {
        positive: "Test image",
      };

      await expect(callWan22Imagen(input, "test-session-id")).rejects.toThrow(
        "WAN 2.2 Imagen API is temporarily unavailable. Please try again later."
      );
    });

    it("should throw error on other HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      const input: Wan22ImagenInput = {
        positive: "Test image",
      };

      await expect(callWan22Imagen(input, "test-session-id")).rejects.toThrow(
        "WAN 2.2 Imagen API error: 500 - Internal server error"
      );
    });
  });
});

