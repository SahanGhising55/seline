import { loadSettings } from "@/lib/settings/settings-manager";

export type WebScraperProvider = "firecrawl" | "local";

export function getWebScraperProvider(): WebScraperProvider {
  const settings = loadSettings();
  return settings.webScraperProvider === "local" ? "local" : "firecrawl";
}

export function isWebScraperConfigured(): boolean {
  const provider = getWebScraperProvider();
  if (provider === "local") {
    return true;
  }
  return !!process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY.trim().length > 0;
}
