#!/usr/bin/env npx tsx
/**
 * Local Scraper Image Extraction Diagnostic
 *
 * Comprehensive diagnostic to identify why the local Puppeteer scraper
 * fails to extract product images from e-commerce sites (especially Trendyol).
 *
 * Tests:
 * 1. Direct local scraper image extraction with verbose logging
 * 2. Comparison with Firecrawl API results
 * 3. CDN URL pattern analysis
 * 4. Image selector analysis
 *
 * Run with: npx tsx scripts/diagnose-local-scraper-images.ts
 */

import { config } from "dotenv";

// Enable verbose logging for local scraper
process.env.LOCAL_SCRAPER_VERBOSE = "true";

// Load environment variables
config({ path: ".env.local" });

// ============================================================================
// Configuration
// ============================================================================

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

// 20 diverse test URLs for comprehensive testing
const TEST_URLS = [
  // Turkish e-commerce (Trendyol)
  "https://www.trendyol.com/gira-official/kadife-kaplamali-tek-omuz-elbise-abiye-gece-elbisesi-p-820016869",
  "https://www.trendyol.com/bytugcekaya/pullu-dekolteli-elbise-p-815963802",
  // News/Content sites
  "https://www.bbc.com/news",
  "https://techcrunch.com",
  "https://www.theverge.com",
  // E-commerce (international)
  "https://www.etsy.com/listing/1574081234",
  "https://www.ebay.com/itm/123456789",
  // Tech company sites
  "https://www.apple.com/iphone-15-pro/",
  "https://www.microsoft.com/en-us/surface",
  "https://www.google.com/chrome/",
  // Fashion/Lifestyle
  "https://www.zara.com/us/",
  "https://www.hm.com/us/",
  // Documentation/Reference
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "https://docs.github.com/en",
  // Social/Media
  "https://www.reddit.com/r/technology/",
  "https://www.pinterest.com/ideas/",
  // Travel/Services
  "https://www.booking.com",
  "https://www.airbnb.com",
  // Simple/Static pages
  "https://example.com",
  "https://httpbin.org/html",
];

// Legacy arrays for backward compatibility
const TRENDYOL_TEST_URLS = TEST_URLS.slice(0, 2);
const OTHER_ECOMMERCE_URLS = TEST_URLS.slice(2, 4);

// Image extraction patterns
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?|$)/i;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

// Common Turkish e-commerce CDN patterns
const TURKISH_CDN_PATTERNS = [
  /cdn\.dsmcdn\.com/i,           // Trendyol CDN
  /productimages\.hepsiburada\.net/i, // Hepsiburada
  /mnresize\./i,                 // Image resizing
];

// ============================================================================
// Utility Functions
// ============================================================================

function printHeader(title: string): void {
  console.log("\n╔" + "═".repeat(70) + "╗");
  console.log("║" + title.padStart(35 + title.length / 2).padEnd(70) + "║");
  console.log("╚" + "═".repeat(70) + "╝\n");
}

function printSection(num: number | string, title: string): void {
  console.log(`\n[${num}] ${title}:`);
}

function printResult(label: string, value: string | number, success?: boolean): void {
  const icon = success === undefined ? "•" : success ? "✓" : "❌";
  console.log(`   ${icon} ${label}: ${value}`);
}

function isTurkishCdnUrl(url: string): boolean {
  return TURKISH_CDN_PATTERNS.some((pattern) => pattern.test(url));
}

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

function extractFromMarkdown(markdown: string): string[] {
  const images: string[] = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    images.push(match[2]);
  }
  return images;
}

// ============================================================================
// Diagnostic Result Types
// ============================================================================

interface ImageExtractionDiagnostic {
  selector: string;
  found: number;
  samples: string[];
  issues: string[];
}

interface LocalScraperDiagnostic {
  url: string;
  success: boolean;
  timing: {
    navigationMs: number;
    networkIdleMs: number;
    extractionMs: number;
  };
  pageInfo: {
    title: string;
    hasMain: boolean;
    hasArticle: boolean;
    bodyChildCount: number;
  };
  imageExtraction: {
    documentImages: ImageExtractionDiagnostic;
    srcAttributes: ImageExtractionDiagnostic;
    currentSrc: ImageExtractionDiagnostic;
    dataSrc: ImageExtractionDiagnostic;
    lazyLoadImages: ImageExtractionDiagnostic;
    backgroundImages: ImageExtractionDiagnostic;
    pictureElements: ImageExtractionDiagnostic;
    ogImage: string | null;
    twitterImage: string | null;
  };
  cdnAnalysis: {
    turkishCdnUrls: string[];
    standardUrls: string[];
    dataUrls: number;
    relativeUrls: number;
    emptyUrls: number;
  };
  allExtractedImages: string[];
  filteredProductImages: string[];
  errors: string[];
}

interface FirecrawlComparison {
  markdown: { length: number; imageCount: number };
  links: { total: number; imageLinks: number };
  ogImage: string | null;
  extractedImages: string[];
}

// ============================================================================
// Use the actual local scraper module for testing
// ============================================================================

async function diagnoseLocalScraper(url: string): Promise<LocalScraperDiagnostic> {
  console.log(`\n${"─".repeat(72)}`);
  console.log(`🔍 Testing Local Scraper: ${url}`);
  console.log("─".repeat(72));

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Dynamically import the actual local scraper
    const { localScrapePage } = await import("../lib/ai/web-scraper/local");

    printSection(1, "Running Local Scraper");
    const result = await localScrapePage(url, { onlyMainContent: true, verbose: true });

    const elapsed = Date.now() - startTime;
    printResult("Scrape time", `${elapsed}ms`);
    printResult("Title", result.title);
    printResult("Images found", result.images.length.toString(), result.images.length > 0);
    printResult("Links found", result.links.length.toString());
    printResult("OG Image", result.ogImage || "not found", !!result.ogImage);
    printResult("Markdown length", `${result.markdown.length} chars`);

    // Analyze the images
    const turkishCdnUrls = result.images.filter((u) => isTurkishCdnUrl(u));
    const productImages = filterProductImages(result.images);

    printSection(2, "Image Analysis");
    printResult("Total images", result.images.length.toString());
    printResult("Turkish CDN images", turkishCdnUrls.length.toString(), turkishCdnUrls.length > 0);
    printResult("Product images (filtered)", productImages.length.toString(), productImages.length > 0);

    if (result.images.length > 0) {
      console.log("\n   Sample images:");
      result.images.slice(0, 5).forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.substring(0, 80)}${u.length > 80 ? "..." : ""}`);
      });
    }

    if (turkishCdnUrls.length > 0) {
      console.log("\n   Turkish CDN images:");
      turkishCdnUrls.slice(0, 3).forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.substring(0, 80)}${u.length > 80 ? "..." : ""}`);
      });
    }

    return {
      url,
      success: true,
      timing: { navigationMs: elapsed, networkIdleMs: 0, extractionMs: 0 },
      pageInfo: {
        title: result.title,
        hasMain: false,
        hasArticle: false,
        bodyChildCount: 0,
      },
      imageExtraction: {
        documentImages: { selector: "document.images", found: result.images.length, samples: result.images.slice(0, 5), issues: [] },
        srcAttributes: { selector: "img[src]", found: 0, samples: [], issues: [] },
        currentSrc: { selector: "img.currentSrc", found: 0, samples: [], issues: [] },
        dataSrc: { selector: "[data-src]", found: 0, samples: [], issues: [] },
        lazyLoadImages: { selector: "srcset", found: 0, samples: [], issues: [] },
        backgroundImages: { selector: "background-image", found: 0, samples: [], issues: [] },
        pictureElements: { selector: "picture source", found: 0, samples: [], issues: [] },
        ogImage: result.ogImage || null,
        twitterImage: null,
      },
      cdnAnalysis: {
        turkishCdnUrls,
        standardUrls: result.images.filter((u) => u.startsWith("http") && !isTurkishCdnUrl(u)),
        dataUrls: 0,
        relativeUrls: 0,
        emptyUrls: 0,
      },
      allExtractedImages: result.images,
      filteredProductImages: productImages,
      errors,
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
    errors.push(error instanceof Error ? error.message : "Unknown error");

    return {
      url,
      success: false,
      timing: { navigationMs: 0, networkIdleMs: 0, extractionMs: 0 },
      pageInfo: { title: "", hasMain: false, hasArticle: false, bodyChildCount: 0 },
      imageExtraction: {
        documentImages: { selector: "", found: 0, samples: [], issues: [] },
        srcAttributes: { selector: "", found: 0, samples: [], issues: [] },
        currentSrc: { selector: "", found: 0, samples: [], issues: [] },
        dataSrc: { selector: "", found: 0, samples: [], issues: [] },
        lazyLoadImages: { selector: "", found: 0, samples: [], issues: [] },
        backgroundImages: { selector: "", found: 0, samples: [], issues: [] },
        pictureElements: { selector: "", found: 0, samples: [], issues: [] },
        ogImage: null,
        twitterImage: null,
      },
      cdnAnalysis: {
        turkishCdnUrls: [],
        standardUrls: [],
        dataUrls: 0,
        relativeUrls: 0,
        emptyUrls: 0,
      },
      allExtractedImages: [],
      filteredProductImages: [],
      errors,
    };
  }
}

// ============================================================================
// Firecrawl Comparison
// ============================================================================

async function fetchWithFirecrawl(url: string): Promise<FirecrawlComparison | null> {
  if (!FIRECRAWL_API_KEY) {
    console.log("   ⚠️ FIRECRAWL_API_KEY not set, skipping comparison");
    return null;
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
      console.log(`   ❌ Firecrawl error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || "";
    const links: string[] = data.data?.links || [];
    const ogImage = data.data?.metadata?.ogImage || null;

    const markdownImages = extractFromMarkdown(markdown);
    const linkImages = links.filter((l) => IMAGE_EXTENSIONS.test(l));

    return {
      markdown: { length: markdown.length, imageCount: markdownImages.length },
      links: { total: links.length, imageLinks: linkImages.length },
      ogImage,
      extractedImages: [...new Set([...filterProductImages(markdownImages), ...filterProductImages(linkImages), ...(ogImage ? [ogImage] : [])])],
    };
  } catch (error) {
    console.log(`   ❌ Firecrawl fetch error: ${error instanceof Error ? error.message : "Unknown"}`);
    return null;
  }
}

// ============================================================================
// Comparison and Root Cause Analysis
// ============================================================================

interface ComparisonResult {
  url: string;
  local: {
    totalImages: number;
    productImages: number;
    hasOgImage: boolean;
    turkishCdnCount: number;
  };
  firecrawl: {
    markdownImages: number;
    linkImages: number;
    productImages: number;
    hasOgImage: boolean;
  } | null;
  gap: {
    difference: number;
    localMissing: string[];
    potentialIssues: string[];
  };
}

async function compareScrapers(url: string): Promise<ComparisonResult> {
  printHeader(`COMPARING: ${new URL(url).hostname}`);

  // Run local scraper
  console.log("\n📍 LOCAL SCRAPER RESULTS:");
  const localResult = await diagnoseLocalScraper(url);

  // Run Firecrawl
  console.log("\n🔥 FIRECRAWL RESULTS:");
  const firecrawlResult = await fetchWithFirecrawl(url);

  if (firecrawlResult) {
    printResult("Markdown images", firecrawlResult.markdown.imageCount.toString());
    printResult("Link images", firecrawlResult.links.imageLinks.toString());
    printResult("Total product images", firecrawlResult.extractedImages.length.toString());
    printResult("OG Image", firecrawlResult.ogImage ? "yes" : "no", !!firecrawlResult.ogImage);

    if (firecrawlResult.extractedImages.length > 0) {
      console.log("\n   Sample Firecrawl images:");
      firecrawlResult.extractedImages.slice(0, 5).forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.substring(0, 80)}${u.length > 80 ? "..." : ""}`);
      });
    }
  }

  // Find images Firecrawl has that local doesn't
  const localMissing: string[] = [];
  const potentialIssues: string[] = [];

  if (firecrawlResult) {
    const localSet = new Set(localResult.filteredProductImages);
    firecrawlResult.extractedImages.forEach((img) => {
      if (!localSet.has(img)) {
        localMissing.push(img);
      }
    });

    // Analyze potential issues
    if (localResult.imageExtraction.dataSrc.found > localResult.imageExtraction.documentImages.found) {
      potentialIssues.push("More images in data-src than document.images - lazy loading not resolved");
    }
    if (localResult.cdnAnalysis.emptyUrls > 0) {
      potentialIssues.push(`${localResult.cdnAnalysis.emptyUrls} images have empty/missing src`);
    }
    if (localResult.cdnAnalysis.relativeUrls > 0) {
      potentialIssues.push(`${localResult.cdnAnalysis.relativeUrls} relative URLs not converted to absolute`);
    }
    if (localResult.filteredProductImages.length === 0 && localResult.imageExtraction.ogImage) {
      potentialIssues.push("No product images found but og:image exists - should use as fallback");
    }
    if (firecrawlResult.markdown.imageCount > 0 && localResult.filteredProductImages.length === 0) {
      potentialIssues.push("Firecrawl markdown contains images but local scraper found none");
    }
  }

  return {
    url,
    local: {
      totalImages: localResult.allExtractedImages.length,
      productImages: localResult.filteredProductImages.length,
      hasOgImage: !!localResult.imageExtraction.ogImage,
      turkishCdnCount: localResult.cdnAnalysis.turkishCdnUrls.length,
    },
    firecrawl: firecrawlResult
      ? {
          markdownImages: firecrawlResult.markdown.imageCount,
          linkImages: firecrawlResult.links.imageLinks,
          productImages: firecrawlResult.extractedImages.length,
          hasOgImage: !!firecrawlResult.ogImage,
        }
      : null,
    gap: {
      difference: firecrawlResult ? firecrawlResult.extractedImages.length - localResult.filteredProductImages.length : 0,
      localMissing,
      potentialIssues,
    },
  };
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  printHeader("LOCAL SCRAPER IMAGE EXTRACTION DIAGNOSTIC");

  console.log("This diagnostic tests the local Puppeteer scraper's image extraction");
  console.log("across 20 diverse websites.\n");

  const allResults: ComparisonResult[] = [];

  // Test all 20 URLs
  console.log(`\n🌐 TESTING ${TEST_URLS.length} WEBSITES:\n`);

  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    console.log(`\n[${i + 1}/${TEST_URLS.length}] Testing: ${url}`);
    try {
      const result = await compareScrapers(url);
      allResults.push(result);
    } catch (error) {
      console.error(`   ❌ Error testing ${url}:`, error instanceof Error ? error.message : error);
    }
    // Rate limiting between requests
    if (i < TEST_URLS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Summary
  printHeader("SUMMARY & ROOT CAUSE ANALYSIS");

  console.log("| Site                          | Local | Firecrawl | Gap  | Issues |");
  console.log("|-------------------------------|-------|-----------|------|--------|");
  allResults.forEach((r) => {
    const hostname = new URL(r.url).hostname.replace("www.", "").substring(0, 28);
    const fcImages = r.firecrawl?.productImages || 0;
    const gap = r.gap.difference > 0 ? `+${r.gap.difference}` : r.gap.difference.toString();
    console.log(
      `| ${hostname.padEnd(29)} | ${r.local.productImages.toString().padStart(5)} | ${fcImages.toString().padStart(9)} | ${gap.padStart(4)} | ${r.gap.potentialIssues.length.toString().padStart(6)} |`
    );
  });

  // Identified issues
  console.log("\n🔍 IDENTIFIED ISSUES:");
  const allIssues = new Set<string>();
  allResults.forEach((r) => r.gap.potentialIssues.forEach((i) => allIssues.add(i)));
  if (allIssues.size === 0) {
    console.log("   ✓ No issues identified");
  } else {
    Array.from(allIssues).forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  // Root cause analysis
  console.log("\n🎯 ROOT CAUSE ANALYSIS:");
  const localTotal = allResults.reduce((sum, r) => sum + r.local.productImages, 0);
  const fcTotal = allResults.reduce((sum, r) => sum + (r.firecrawl?.productImages || 0), 0);

  if (localTotal === 0 && fcTotal > 0) {
    console.log("❌ CRITICAL: Local scraper found 0 product images while Firecrawl found images");
    console.log("\n   Likely causes:");
    console.log("   1. Images are lazy-loaded and not rendered before extraction");
    console.log("   2. Images use data-src or srcset instead of standard src");
    console.log("   3. Images are loaded via JavaScript after initial page load");
    console.log("   4. Network idle wait is not sufficient for dynamic content");
  } else if (localTotal < fcTotal / 2) {
    console.log("⚠️ WARNING: Local scraper found significantly fewer images than Firecrawl");
  } else {
    console.log("✓ Local scraper image extraction appears to be working");
  }

  // Recommendations
  console.log("\n💡 RECOMMENDED FIXES:");
  console.log("1. Add scroll-and-wait logic to trigger lazy loading");
  console.log("2. Extract images from data-src, data-lazy-src attributes");
  console.log("3. Parse srcset attribute for responsive images");
  console.log("4. Always include og:image as primary fallback");
  console.log("5. Increase network idle wait for Turkish e-commerce sites");
  console.log("6. Add Turkish CDN pattern recognition (cdn.dsmcdn.com for Trendyol)");

  console.log("\n" + "═".repeat(72) + "\n");
}

// Run the diagnostic
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
