import { ingest } from "./ingest.js";
import { extract } from "./extract.js";
import { isFlowMindConfigured } from "../utils/config.js";
import { join } from "path";

export interface PipelineInput {
  directory: string;
  topic: string;
  output_directory?: string;
}

export interface PipelineResult {
  ingest_result: {
    total: number;
    successful: number;
    output_directory: string;
  };
  documents: Array<{
    filename: string;
    content: string;
    length: number;
  }>;
  topic: string;
  instructions: string;
}

export async function pipeline(input: PipelineInput): Promise<PipelineResult> {
  const dir = input.directory.replace(/^~/, process.env.HOME || "");
  const outDir = input.output_directory || join(dir, "_kbb_output");

  const ingestResult = await ingest({
    directory: dir,
    output_directory: outDir,
  });

  const extractResult = await extract({ directory: outDir });

  const steps = [
    `Topic: "${input.topic}"`,
    "",
    "You now have all the raw markdown from the source documents.",
    "Please:",
    "1. Read through all documents and extract key insights",
    "2. Organize them into a coherent, well-structured knowledge article",
    "3. Identify concepts that would benefit from diagrams (flowcharts, architecture diagrams, 2x2 matrices)",
    "4. If Draw.io MCP is available, use mcp__drawio__create_diagram to create visualizations",
  ];

  if (isFlowMindConfigured()) {
    steps.push("5. Use kbb_publish to upload the final article to FlowMind");
  } else {
    steps.push("Note: FlowMind is not configured. To enable publishing, run ./setup.sh or create ~/.flowmind/config.json");
  }

  return {
    ingest_result: {
      total: ingestResult.total,
      successful: ingestResult.successful,
      output_directory: outDir,
    },
    documents: extractResult.documents,
    topic: input.topic,
    instructions: steps.join("\n"),
  };
}
