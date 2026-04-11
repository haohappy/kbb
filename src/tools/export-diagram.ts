import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface ExportDiagramInput {
  xml: string;
  filename?: string;
  output_directory?: string;
  scale?: number;
}

export interface ExportDiagramResult {
  png_path: string;
  drawio_path: string;
  placeholder_id: string;
}

export async function exportDiagram(input: ExportDiagramInput): Promise<ExportDiagramResult> {
  const name = input.filename || `diagram-${Date.now()}`;
  const baseName = name.replace(/\.(drawio|png)$/, "");
  const outDir = (input.output_directory || tmpdir()).replace(/^~/, process.env.HOME || "");
  const scale = input.scale || 2;

  const drawioPath = join(outDir, `${baseName}.drawio`);
  const pngPath = join(outDir, `${baseName}.png`);

  // Wrap XML in mxfile/diagram tags if not already wrapped
  let fullXml = input.xml.trim();
  if (!fullXml.startsWith("<mxfile")) {
    fullXml = `<mxfile><diagram name="${baseName}" id="d1">${fullXml}</diagram></mxfile>`;
  }

  writeFileSync(drawioPath, fullXml, "utf-8");

  // Export to PNG using drawio CLI
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("drawio", [
      "--export",
      "--format", "png",
      "--scale", String(scale),
      "--output", pngPath,
      drawioPath,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });

    let stderr = "";
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`drawio export failed: ${stderr}`));
      } else {
        resolve();
      }
    });

    proc.on("error", (err) => {
      if (err.message.includes("ENOENT")) {
        reject(new Error(
          "drawio CLI 未找到。请安装 draw.io desktop: https://github.com/jgraph/drawio-desktop/releases"
        ));
      } else {
        reject(new Error(`drawio export error: ${err.message}`));
      }
    });
  });

  // Use baseName as placeholder_id (sanitized)
  const placeholderId = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");

  return {
    png_path: pngPath,
    drawio_path: drawioPath,
    placeholder_id: placeholderId,
  };
}
