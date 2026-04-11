import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

export interface FileInfo {
  path: string;
  name: string;
  ext: string;
  size: number;
}

export function scanDirectory(dir: string, extensions?: string[]): FileInfo[] {
  const files: FileInfo[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (!extensions || extensions.includes(ext)) {
        const fullPath = join(dir, entry.name);
        const stat = statSync(fullPath);
        files.push({
          path: fullPath,
          name: entry.name,
          ext,
          size: stat.size,
        });
      }
    }
  }

  return files;
}

export function readMarkdownFiles(dir: string): Array<{ filename: string; content: string }> {
  const files = scanDirectory(dir, [".md"]);
  return files.map((f) => ({
    filename: f.name,
    content: readFileSync(f.path, "utf-8"),
  }));
}

export function saveMarkdown(dir: string, filename: string, content: string): string {
  mkdirSync(dir, { recursive: true });
  const outName = basename(filename, extname(filename)) + ".md";
  const outPath = join(dir, outName);
  writeFileSync(outPath, content, "utf-8");
  return outPath;
}
