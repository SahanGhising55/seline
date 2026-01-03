import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 1000 * 60 * 10;
const DEFAULT_INSTANCES = [
  "https://yewtu.be",
  "https://invidious.flokinet.to",
  "https://vid.puffyan.us",
];

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const getCacheStore = (): Map<string, CacheEntry> => {
  const globalStore = globalThis as typeof globalThis & {
    __youtubeApiCache?: Map<string, CacheEntry>;
  };
  if (!globalStore.__youtubeApiCache) {
    globalStore.__youtubeApiCache = new Map<string, CacheEntry>();
  }
  return globalStore.__youtubeApiCache;
};

const getCached = (key: string) => {
  const store = getCacheStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
};

const setCached = (key: string, data: unknown) => {
  const store = getCacheStore();
  store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

const getInstances = () => {
  const custom = process.env.INVIDIOUS_INSTANCE?.trim();
  if (custom) return [custom, ...DEFAULT_INSTANCES.filter((i) => i !== custom)];
  return DEFAULT_INSTANCES;
};

const buildThumbnailUrl = (videoId: string, thumbnails?: any[]) => {
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0]?.url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};

const normalizeViewCount = (value: unknown) => {
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") {
    const trimmed = value.replace(/views?/i, "").trim();
    return trimmed || "0";
  }
  return "0";
};

const buildVideoPayload = (items: any[]) => {
  return items
    .map((item) => {
      const id = item.videoId || item.id;
      if (!id) return null;
      return {
        id,
        title: item.title ?? "",
        channelTitle: item.author ?? item.channelTitle ?? "",
        duration: item.lengthSeconds?.toString() ?? item.duration ?? "",
        viewCount: normalizeViewCount(item.viewCount ?? item.viewCountText),
        thumbnailUrl: buildThumbnailUrl(id, item.videoThumbnails),
      };
    })
    .filter(Boolean);
};

const fetchJson = async (url: string) => {
  const cached = getCached(url);
  if (cached) return cached as any;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { error: `Upstream error (${response.status})`, status: response.status };
    }
    const data = await response.json();
    setCached(url, data);
    return data;
  } catch (error) {
    return { error: "Upstream request failed." };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchFromInvidious = async (path: string) => {
  for (const instance of getInstances()) {
    const url = `${instance}${path}`;
    const data = await fetchJson(url);
    if (data?.error) continue;
    return data;
  }
  return { error: "No Invidious instances responded." };
};

const fetchOEmbed = async (videoId: string) => {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;
  return fetchJson(url);
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const query = searchParams.get("q");

  if (!idParam && !query) {
    return NextResponse.json(
      { error: "Provide either id or q query parameter." },
      { status: 400 }
    );
  }

  try {
    if (idParam) {
      const ids = idParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 20);

      const results: any[] = [];
      for (const id of ids) {
        const data = await fetchFromInvidious(`/api/v1/videos/${id}`);
        if (!data?.error) {
          results.push(data);
          continue;
        }
        const oembed = await fetchOEmbed(id);
        if (!oembed?.error) {
          results.push({
            id,
            title: oembed.title,
            author: oembed.author_name,
            videoThumbnails: [{ url: oembed.thumbnail_url, width: 480 }],
          });
        }
      }

      return NextResponse.json({ videos: buildVideoPayload(results) });
    }

    const searchData = await fetchFromInvidious(
      `/api/v1/search?type=video&sort=relevance&q=${encodeURIComponent(
        query as string
      )}`
    );
    if (searchData?.error) {
      return NextResponse.json(
        { error: searchData.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      videos: buildVideoPayload((searchData || []).slice(0, 3)),
      query,
    });
  } catch (error) {
    console.error("[YouTube Lookup] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube data." },
      { status: 500 }
    );
  }
}
