export interface YouTubeTimestamp {
  label: string;
  seconds: number;
  sourceText: string;
}

export interface YouTubeUrlReference {
  source: "url";
  videoId: string;
  url: string;
  startSeconds?: number;
}

export interface YouTubeQueryReference {
  source: "query";
  query: string;
}

export interface YouTubeReferenceExtraction {
  urls: YouTubeUrlReference[];
  queries: YouTubeQueryReference[];
  timestamps: YouTubeTimestamp[];
}

const YOUTUBE_URL_REGEX =
  /\bhttps?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)[^\s)]+/gi;

const TIMESTAMP_REGEX = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
const KEYWORD_REGEX =
  /\b(youtube|video|timestamp|guide|quest|walkthrough|tutorial|playthrough)\b/i;

const STRIP_QUERY_TOKENS_REGEX = /\b(youtube|timestamp|video)\b/gi;

const MAX_QUERY_RESULTS = 2;

const parseTimeToSeconds = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return null;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  if (/[hms]/i.test(trimmed)) {
    const match = trimmed.match(
      /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i
    );
    if (!match) return null;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const asNumber = Number(trimmed);
  if (Number.isNaN(asNumber)) return null;
  return asNumber;
};

export const extractTimestamps = (text: string): YouTubeTimestamp[] => {
  const matches = text.matchAll(TIMESTAMP_REGEX);
  const timestamps: YouTubeTimestamp[] = [];
  for (const match of matches) {
    const label = match[1];
    const seconds = parseTimeToSeconds(label);
    if (seconds === null) continue;
    timestamps.push({ label, seconds, sourceText: match[0] });
  }
  return timestamps;
};

const parseYouTubeUrl = (rawUrl: string): YouTubeUrlReference | null => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace("www.", "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.replace("/", "").split("/")[0] || null;
    } else if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname.startsWith("/watch")) {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || null;
      }
    }

    if (!videoId) return null;

    const timeParam =
      url.searchParams.get("t") ||
      url.searchParams.get("start") ||
      new URLSearchParams(url.hash.replace("#", "")).get("t");
    const startSeconds = parseTimeToSeconds(timeParam || undefined) ?? undefined;

    return {
      source: "url",
      videoId,
      url: rawUrl,
      startSeconds,
    };
  } catch {
    return null;
  }
};

const sanitizeQuery = (query: string): string => {
  return query
    .replace(STRIP_QUERY_TOKENS_REGEX, "")
    .replace(TIMESTAMP_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[()]+/g, (match) => match)
    .trim();
};

const extractQueryCandidates = (text: string): string[] => {
  const candidates: string[] = [];
  const cleanedText = text.replace(YOUTUBE_URL_REGEX, " ");

  const quotedMatches = cleanedText.match(/"([^"]{6,120})"/g) || [];
  for (const match of quotedMatches) {
    const unquoted = match.replace(/(^")|("$)/g, "");
    if (unquoted) candidates.push(unquoted);
  }

  const lines = cleanedText.split(/\n+/).map((line) => line.trim());
  for (const line of lines) {
    if (!line || line.length < 6 || line.length > 140) continue;
    if (KEYWORD_REGEX.test(line)) {
      candidates.push(line);
    }
  }

  const sentences = cleanedText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  for (const sentence of sentences) {
    if (KEYWORD_REGEX.test(sentence) && sentence.length < 140) {
      candidates.push(sentence);
    }
  }

  return candidates;
};

const buildFallbackQuery = (text: string): string | null => {
  const words = text
    .replace(YOUTUBE_URL_REGEX, " ")
    .replace(TIMESTAMP_REGEX, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 3) return null;
  return words.slice(0, 12).join(" ");
};

export const extractYouTubeReferences = (
  text: string
): YouTubeReferenceExtraction => {
  const urls = Array.from(text.matchAll(YOUTUBE_URL_REGEX))
    .map((match) => parseYouTubeUrl(match[0]))
    .filter((ref): ref is YouTubeUrlReference => Boolean(ref));

  const timestamps = extractTimestamps(text);
  const hasContextHints = KEYWORD_REGEX.test(text) || timestamps.length > 0;

  const candidateQueries = extractQueryCandidates(text);
  const sanitizedQueries = candidateQueries
    .map((candidate) => sanitizeQuery(candidate))
    .filter((candidate) => candidate.length >= 6);

  const fallbackQuery = hasContextHints ? buildFallbackQuery(text) : null;
  if (fallbackQuery) sanitizedQueries.push(fallbackQuery);

  const uniqueQueries = Array.from(
    new Set(sanitizedQueries.map((query) => query.toLowerCase()))
  )
    .map(
      (normalized) =>
        sanitizedQueries.find((query) => query.toLowerCase() === normalized) ||
        normalized
    )
    .slice(0, MAX_QUERY_RESULTS)
    .filter(Boolean);

  const queries = uniqueQueries.map((query) => ({
    source: "query" as const,
    query,
  }));

  return { urls, queries, timestamps };
};

export const parseTimestampToSeconds = (value: string): number | null => {
  return parseTimeToSeconds(value);
};
