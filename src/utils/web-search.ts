import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface FetchedPage {
  url: string;
  title: string;
  filename: string;
  path: string;
  size: number;
  status: "success" | "error";
  error?: string;
}

/**
 * Search DuckDuckGo HTML and extract result URLs.
 * No API key required.
 */
export async function searchWeb(query: string, numResults = 8): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const url = `https://html.duckduckgo.com/html/?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const html = await res.text();
  const results: SearchResult[] = [];

  // Parse DuckDuckGo HTML results
  // Each result has class="result" with a link and snippet
  const resultBlocks = html.split(/class="result__a"/g).slice(1);

  for (const block of resultBlocks) {
    if (results.length >= numResults) break;

    // Extract href
    const hrefMatch = block.match(/href="([^"]+)"/);
    if (!hrefMatch) continue;

    let resultUrl = hrefMatch[1];
    // DDG wraps URLs in a redirect - extract the actual URL
    const uddgMatch = resultUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      resultUrl = decodeURIComponent(uddgMatch[1]);
    }

    // Skip non-http URLs
    if (!resultUrl.startsWith("http")) continue;

    // Extract title (text before the closing </a>)
    const titleMatch = block.match(/>([\s\S]*?)<\/a>/);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : "Untitled";

    // Extract snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    results.push({ title, url: resultUrl, snippet });
  }

  return results;
}

/**
 * Fetch a web page and extract text content.
 * Returns simplified HTML that MarkItDown can convert.
 */
async function fetchPage(url: string, timeoutMs = 15_000): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Untitled";

    // Extract main content: strip scripts, styles, nav, etc.
    let content = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "");

    // Convert to plain text
    content = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    // Truncate very long pages (keep first ~15000 chars)
    if (content.length > 15000) {
      content = content.slice(0, 15000) + "\n\n[Content truncated...]";
    }

    return { title, content };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sanitize a string for use as a filename.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60)
    .replace(/_+$/, "");
}

/**
 * Search, fetch, and save web pages as text files.
 */
export async function researchTopic(
  topic: string,
  outputDir: string,
  options: {
    queries?: string[];
    urls?: string[];
    numResults?: number;
  } = {},
): Promise<{ pages: FetchedPage[]; searchQueries: string[] }> {
  mkdirSync(outputDir, { recursive: true });

  const numResults = options.numResults || 6;
  const pages: FetchedPage[] = [];
  const urlsToFetch: Array<{ url: string; source: string }> = [];

  // If explicit URLs provided, use them directly
  if (options.urls && options.urls.length > 0) {
    for (const url of options.urls) {
      urlsToFetch.push({ url, source: "direct" });
    }
  }

  // Generate search queries
  const searchQueries = options.queries || [
    topic,
    `${topic} research evidence`,
    `${topic} practical guide`,
  ];

  // Search and collect URLs
  if (!options.urls || options.urls.length === 0) {
    const seenUrls = new Set<string>();

    for (const query of searchQueries) {
      try {
        const results = await searchWeb(query, numResults);
        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            urlsToFetch.push({ url: result.url, source: query });
          }
        }
      } catch (err) {
        // Search failed, continue with other queries
      }

      // Rate limit between searches
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Limit total fetches
  const toFetch = urlsToFetch.slice(0, numResults);

  // Fetch each page
  for (let i = 0; i < toFetch.length; i++) {
    const { url } = toFetch[i];

    try {
      const { title, content } = await fetchPage(url);

      if (content.length < 200) {
        pages.push({
          url,
          title,
          filename: "",
          path: "",
          size: 0,
          status: "error",
          error: "Content too short (likely blocked or paywall)",
        });
        continue;
      }

      const filename = `${String(i + 1).padStart(2, "0")}_${sanitizeFilename(title)}.txt`;
      const filePath = join(outputDir, filename);

      const fileContent = `Source: ${url}\nTitle: ${title}\n\n${content}`;
      writeFileSync(filePath, fileContent, "utf-8");

      pages.push({
        url,
        title,
        filename,
        path: filePath,
        size: fileContent.length,
        status: "success",
      });
    } catch (err) {
      pages.push({
        url,
        title: "",
        filename: "",
        path: "",
        size: 0,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Rate limit between fetches
    if (i < toFetch.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { pages, searchQueries };
}
