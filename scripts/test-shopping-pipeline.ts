#!/usr/bin/env npx tsx
/**
 * Shopping Pipeline Diagnostic Test
 *
 * Comprehensive end-to-end test to identify why product images are not being
 * extracted from e-commerce sites. Tests the full pipeline:
 * 1. Direct Firecrawl API Testing
 * 2. WebBrowse Orchestrator Testing
 * 3. Synthesis Testing
 *
 * Run with: npx tsx scripts/test-shopping-pipeline.ts
 */

import { config } from "dotenv";
import { nanoid } from "nanoid";

// Load environment variables from .env.local (Next.js convention)
config({ path: ".env.local" });

// ============================================================================
// Configuration
// ============================================================================

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

// Test URLs - real e-commerce product pages
const TEST_URLS = [
  "https://www.homedepot.com/p/Husky-6-ft-Adjustable-Height-Solid-Wood-Top-Workbench-in-Black-HOWT62XDB12/313808037",
  "https://www.wayfair.com/furniture/pdp/wade-logan-aaliya-upholstered-bed-w001558867.html",
  "https://www.lowes.com/pd/CRAFTSMAN-2000-Series-41-in-W-x-37-5-in-H-10-Drawer-Steel-Rolling-Tool-Cabinet-Red/1000628721",
];

// Image extraction patterns
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?|$)/i;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

// ============================================================================
// Utility Functions
// ============================================================================

function printHeader(title: string): void {
  console.log("\n╔" + "═".repeat(60) + "╗");
  console.log("║" + title.padStart(30 + title.length / 2).padEnd(60) + "║");
  console.log("╚" + "═".repeat(60) + "╝\n");
}

function printSection(num: number, title: string): void {
  console.log(`\n[${num}] ${title}:`);
}

function printResult(label: string, value: string | number, success?: boolean): void {
  const icon = success === undefined ? "•" : success ? "✓" : "❌";
  console.log(`   ${icon} ${label}: ${value}`);
}

// Extract images from links array (current broken approach)
function extractFromLinks(links: string[]): string[] {
  return links.filter((link) => IMAGE_EXTENSIONS.test(link));
}

// Extract images from markdown using regex (proposed fix)
function extractFromMarkdown(markdown: string): string[] {
  const images: string[] = [];
  // Create new regex instance to avoid global state issues
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    images.push(match[2]);
  }
  return images;
}

// Filter product images (exclude icons/logos)
function filterProductImages(urls: string[]): string[] {
  return urls.filter((url) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("/icon") || lowerUrl.includes("/logo") || lowerUrl.includes("/favicon")) {
      return false;
    }
    if (/[_-](16|20|24|32|48|64)x?\d*\.(png|gif|svg)/i.test(url)) {
      return false;
    }
    return true;
  });
}

// ============================================================================
// Phase 1: Direct Firecrawl API Testing
// ============================================================================

interface FirecrawlTestResult {
  url: string;
  success: boolean;
  markdown: { length: number; preview: string };
  links: { count: number; firstFive: string[]; imageCount: number };
  ogImage: string | null;
  extraction: {
    fromLinks: number;
    fromMarkdown: number;
    fromOgImage: number;
    totalUnique: number;
  };
  rawResponse?: any;
}

async function testFirecrawlDirect(url: string): Promise<FirecrawlTestResult> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Testing URL: ${url}`);
  console.log("─".repeat(60));

  if (!FIRECRAWL_API_KEY) {
    console.error("   ❌ FIRECRAWL_API_KEY not configured!");
    return {
      url,
      success: false,
      markdown: { length: 0, preview: "" },
      links: { count: 0, firstFive: [], imageCount: 0 },
      ogImage: null,
      extraction: { fromLinks: 0, fromMarkdown: 0, fromOgImage: 0, totalUnique: 0 },
    };
  }

  try {
    const response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ Firecrawl API error: ${response.status}`);
      console.error(`   Error: ${errorText.substring(0, 200)}`);
      return {
        url,
        success: false,
        markdown: { length: 0, preview: "" },
        links: { count: 0, firstFive: [], imageCount: 0 },
        ogImage: null,
        extraction: { fromLinks: 0, fromMarkdown: 0, fromOgImage: 0, totalUnique: 0 },
      };
    }

    const data = await response.json();
    const markdown = data.data?.markdown || "";
    const links: string[] = data.data?.links || [];
    const ogImage = data.data?.metadata?.ogImage || null;

    printSection(1, "Firecrawl API Response");
    printResult("Markdown length", `${markdown.length} chars`);
    printResult("Markdown preview", markdown.substring(0, 200).replace(/\n/g, " ") + "...");
    printResult("Links array count", links.length);
    printResult("OG Image", ogImage || "not found", !!ogImage);

    // Analyze what's in the links array
    printSection(2, "Links Array Analysis (first 10 items)");
    const linksToShow = links.slice(0, 10);
    linksToShow.forEach((link, i) => {
      const isImage = IMAGE_EXTENSIONS.test(link);
      console.log(`   ${i + 1}. ${isImage ? "🖼️" : "🔗"} ${link.substring(0, 80)}${link.length > 80 ? "..." : ""}`);
    });

    // Extract images using different strategies
    const fromLinks = extractFromLinks(links);
    const fromMarkdown = extractFromMarkdown(markdown);
    const fromOgImage = ogImage ? [ogImage] : [];

    // Combine and deduplicate
    const allImages = new Set([
      ...filterProductImages(fromLinks),
      ...filterProductImages(fromMarkdown),
      ...fromOgImage,
    ]);

    printSection(3, "Image Extraction Results");
    printResult("From links array", `${fromLinks.length} images`, fromLinks.length > 0);
    printResult("From markdown syntax", `${fromMarkdown.length} images`, fromMarkdown.length > 0);
    printResult("From OG Image", `${fromOgImage.length} image`, fromOgImage.length > 0);
    printResult("Total unique (filtered)", `${allImages.size} images`, allImages.size > 0);

    // Show sample extracted images
    if (fromMarkdown.length > 0) {
      console.log("\n   Sample images from markdown:");
      fromMarkdown.slice(0, 5).forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.substring(0, 80)}${img.length > 80 ? "..." : ""}`);
      });
    }

    return {
      url,
      success: true,
      markdown: { length: markdown.length, preview: markdown.substring(0, 500) },
      links: { count: links.length, firstFive: links.slice(0, 5), imageCount: fromLinks.length },
      ogImage,
      extraction: {
        fromLinks: fromLinks.length,
        fromMarkdown: fromMarkdown.length,
        fromOgImage: fromOgImage.length,
        totalUnique: allImages.size,
      },
      rawResponse: data,
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return {
      url,
      success: false,
      markdown: { length: 0, preview: "" },
      links: { count: 0, firstFive: [], imageCount: 0 },
      ogImage: null,
      extraction: { fromLinks: 0, fromMarkdown: 0, fromOgImage: 0, totalUnique: 0 },
    };
  }
}

// ============================================================================
// Phase 2: WebBrowse Orchestrator Testing
// ============================================================================

async function testOrchestrator(url: string): Promise<void> {
  printSection(4, "WebBrowse Orchestrator Test");

  // Dynamic import to handle module resolution
  try {
    const { browseAndSynthesize } = await import("../lib/ai/web-browse/orchestrator");
    const { getSessionContent } = await import("../lib/ai/web-browse/session-store");

    const testSessionId = `diag-${nanoid(8)}`;
    const testQuery = "Find the main product with its image, price, and purchase link";

    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   Query: "${testQuery}"`);

    const result = await browseAndSynthesize({
      urls: [url],
      query: testQuery,
      options: {
        sessionId: testSessionId,
        userId: "diagnostic-test",
        characterId: null,
      },
    });

    printResult("Orchestrator success", result.success ? "YES" : "NO", result.success);
    printResult("URLs fetched", result.fetchedUrls.length.toString());
    printResult("URLs failed", result.failedUrls.length.toString(), result.failedUrls.length === 0);

    // Check session store
    const sessionContent = await getSessionContent(testSessionId);
    if (sessionContent.length > 0) {
      const entry = sessionContent[0];
      printSection(5, "Session Store Entry");
      printResult("Title", entry.title);
      printResult("Content length", `${entry.contentLength} chars`);
      printResult("Images stored", entry.images?.length?.toString() || "0", (entry.images?.length || 0) > 0);
      printResult("OG Image", entry.ogImage || "not stored", !!entry.ogImage);

      if (entry.images && entry.images.length > 0) {
        console.log("\n   Stored images (first 5):");
        entry.images.slice(0, 5).forEach((img, i) => {
          console.log(`   ${i + 1}. ${img.substring(0, 70)}...`);
        });
      }
    } else {
      printResult("Session content", "NOT FOUND", false);
    }

    // Check synthesis result
    if (result.synthesis) {
      printSection(6, "Synthesis Output Analysis");
      const synthesisHasImageUrls = /https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif|webp)/i.test(result.synthesis);
      const synthesisHasPrice = /\$[\d,]+(\.\d{2})?/i.test(result.synthesis);
      const synthesisHasPurchaseLink = /https?:\/\/(www\.)?(homedepot|wayfair|lowes)/i.test(result.synthesis);

      printResult("Contains image URLs", synthesisHasImageUrls ? "YES" : "NO", synthesisHasImageUrls);
      printResult("Contains price", synthesisHasPrice ? "YES" : "NO", synthesisHasPrice);
      printResult("Contains purchase link", synthesisHasPurchaseLink ? "YES" : "NO", synthesisHasPurchaseLink);
      printResult("Ready for showProductImages", synthesisHasImageUrls && synthesisHasPrice ? "YES" : "NO", synthesisHasImageUrls && synthesisHasPrice);

      console.log("\n   Synthesis preview (first 500 chars):");
      console.log("   " + result.synthesis.substring(0, 500).replace(/\n/g, "\n   "));
    }
  } catch (error) {
    console.error(`   ❌ Orchestrator test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack.split("\n").slice(0, 3).join("\n   ")}`);
    }
  }
}

// ============================================================================
// Phase 3: Summarize Results
// ============================================================================

interface TestSummary {
  url: string;
  site: string;
  linksCount: number;
  markdownCount: number;
  ogCount: number;
  totalCount: number;
}

function printSummary(results: FirecrawlTestResult[]): void {
  printHeader("SUMMARY");

  // Build summary table
  const summaries: TestSummary[] = results.map((r) => ({
    url: r.url,
    site: new URL(r.url).hostname.replace("www.", ""),
    linksCount: r.extraction.fromLinks,
    markdownCount: r.extraction.fromMarkdown,
    ogCount: r.extraction.fromOgImage,
    totalCount: r.extraction.totalUnique,
  }));

  console.log("| Site          | Links | Markdown | OG | Total |");
  console.log("|---------------|-------|----------|----|-------|");
  summaries.forEach((s) => {
    console.log(
      `| ${s.site.padEnd(13)} | ${s.linksCount.toString().padStart(5)} | ${s.markdownCount.toString().padStart(8)} | ${s.ogCount.toString().padStart(2)} | ${s.totalCount.toString().padStart(5)} |`
    );
  });

  // Analyze results to identify root cause
  const linksWorking = summaries.some((s) => s.linksCount > 0);
  const markdownWorking = summaries.some((s) => s.markdownCount > 0);
  const ogWorking = summaries.some((s) => s.ogCount > 0);

  console.log("\n🔍 ROOT CAUSE ANALYSIS:");
  if (!linksWorking && markdownWorking) {
    console.log("❌ Links array contains anchor hrefs, NOT image sources");
    console.log("✓ Markdown contains images in ![](url) syntax");
  } else if (linksWorking && markdownWorking) {
    console.log("✓ Both links and markdown contain images");
  } else if (!linksWorking && !markdownWorking && ogWorking) {
    console.log("❌ Neither links nor markdown contain extractable images");
    console.log("✓ Only OG Images available");
  } else if (!linksWorking && !markdownWorking && !ogWorking) {
    console.log("❌ No images found via any extraction method");
    console.log("   This may indicate the pages are blocking scraping or require JS rendering");
  }

  if (ogWorking) {
    console.log("✓ OG Images available for hero/product images");
  }

  // Recommendations
  console.log("\n💡 RECOMMENDED FIXES:");
  if (!linksWorking && markdownWorking) {
    console.log("1. Replace `filterProductImages(links)` with markdown image extraction");
    console.log('2. Use regex: /!\\[([^\\]]*)\\]\\(([^)]+)\\)/g to extract ![](url) syntax');
    console.log("3. Always include ogImage as first/primary product image");
    console.log("4. Update `fetchWebContent()` in lib/ai/web-browse/orchestrator.ts");
    console.log("\nExample fix for orchestrator.ts:");
    console.log("```typescript");
    console.log("// After getting markdown from Firecrawl:");
    console.log("const markdownImageRegex = /!\\[([^\\]]*)\\]\\(([^)]+)\\)/g;");
    console.log("const markdownImages: string[] = [];");
    console.log("let match;");
    console.log("while ((match = markdownImageRegex.exec(markdown)) !== null) {");
    console.log("  markdownImages.push(match[2]);");
    console.log("}");
    console.log("const images = filterProductImages(markdownImages);");
    console.log("// Then combine with ogImage");
    console.log("```");
  } else if (!linksWorking && !markdownWorking && ogWorking) {
    console.log("1. Rely on ogImage as the primary product image");
    console.log("2. Consider requesting 'screenshot' format from Firecrawl for visual fallback");
    console.log("3. May need to use waitFor option for JS-heavy sites");
  } else if (!linksWorking && !markdownWorking && !ogWorking) {
    console.log("1. These sites may require additional scraping configuration");
    console.log("2. Try adding waitFor: 3000 to allow JS rendering");
    console.log("3. Consider using Firecrawl's 'screenshot' format as fallback");
    console.log("4. Some sites may have anti-scraping measures");
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  printHeader("SHOPPING PIPELINE DIAGNOSTIC TEST");

  console.log("This diagnostic tests the full shopping pipeline to identify");
  console.log("why product images are not being extracted from e-commerce sites.\n");

  // Check API key
  if (!FIRECRAWL_API_KEY) {
    console.error("❌ FIRECRAWL_API_KEY is not configured!");
    console.error("   Please set it in your .env file or environment.");
    process.exit(1);
  }

  console.log("✓ FIRECRAWL_API_KEY is configured");
  console.log(`✓ Testing ${TEST_URLS.length} URLs\n`);

  const results: FirecrawlTestResult[] = [];

  // Phase 1: Test each URL with direct Firecrawl API
  printHeader("PHASE 1: Direct Firecrawl API Testing");

  for (const url of TEST_URLS) {
    const result = await testFirecrawlDirect(url);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Phase 2: Test orchestrator with first successful URL
  printHeader("PHASE 2: WebBrowse Orchestrator Testing");

  const successfulUrl = results.find((r) => r.success)?.url || TEST_URLS[0];
  await testOrchestrator(successfulUrl);

  // Phase 3: Summary and recommendations
  printSummary(results);

  console.log("\n" + "═".repeat(62) + "\n");
}

// Run the diagnostic
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

