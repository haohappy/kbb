import { readMarkdownFiles } from "../utils/filesystem.js";

export interface ExtractInput {
  directory: string;
}

export interface ExtractResult {
  documents: Array<{
    filename: string;
    content: string;
    length: number;
  }>;
  total: number;
  total_chars: number;
}

export async function extract(input: ExtractInput): Promise<ExtractResult> {
  const dir = input.directory.replace(/^~/, process.env.HOME || "");
  const docs = readMarkdownFiles(dir);

  const documents = docs.map((d) => ({
    filename: d.filename,
    content: d.content,
    length: d.content.length,
  }));

  return {
    documents,
    total: documents.length,
    total_chars: documents.reduce((sum, d) => sum + d.length, 0),
  };
}
