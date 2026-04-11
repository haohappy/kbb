import { scanDirectory } from "../utils/filesystem.js";
import { convertFile, isSupportedFile } from "../utils/markitdown.js";
import { saveMarkdown } from "../utils/filesystem.js";
import { join } from "path";

export interface IngestInput {
  directory: string;
  output_directory?: string;
  file_extensions?: string[];
}

export interface IngestResult {
  files: Array<{
    source: string;
    output: string;
    size: number;
    status: "success" | "error";
    error?: string;
  }>;
  total: number;
  successful: number;
}

export async function ingest(input: IngestInput): Promise<IngestResult> {
  const dir = input.directory.replace(/^~/, process.env.HOME || "");
  const outDir = (input.output_directory || join(dir, "_kbb_output")).replace(/^~/, process.env.HOME || "");

  const allFiles = scanDirectory(dir);
  const files = allFiles.filter((f) => {
    if (input.file_extensions) {
      return input.file_extensions.includes(f.ext);
    }
    return isSupportedFile(f.ext);
  });

  const results: IngestResult["files"] = [];

  for (const file of files) {
    try {
      const markdown = await convertFile(file.path);
      const outPath = saveMarkdown(outDir, file.name, markdown);
      results.push({
        source: file.path,
        output: outPath,
        size: markdown.length,
        status: "success",
      });
    } catch (err) {
      results.push({
        source: file.path,
        output: "",
        size: 0,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    files: results,
    total: results.length,
    successful: results.filter((r) => r.status === "success").length,
  };
}
