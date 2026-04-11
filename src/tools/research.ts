import { researchTopic } from "../utils/web-search.js";

export interface ResearchInput {
  topic: string;
  output_directory: string;
  queries?: string[];
  urls?: string[];
  num_results?: number;
}

export async function research(input: ResearchInput) {
  const outDir = input.output_directory.replace(/^~/, process.env.HOME || "");

  const result = await researchTopic(input.topic, outDir, {
    queries: input.queries,
    urls: input.urls,
    numResults: input.num_results,
  });

  const successful = result.pages.filter((p) => p.status === "success");
  const failed = result.pages.filter((p) => p.status === "error");

  return {
    topic: input.topic,
    output_directory: outDir,
    search_queries: result.searchQueries,
    total: result.pages.length,
    successful: successful.length,
    failed: failed.length,
    pages: result.pages.map((p) => ({
      url: p.url,
      title: p.title,
      filename: p.filename,
      size: p.size,
      status: p.status,
      error: p.error,
    })),
  };
}
