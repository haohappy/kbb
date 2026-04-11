import { ingest } from "./ingest.js";
import { extract } from "./extract.js";
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

  // Step 1: Ingest all files
  const ingestResult = await ingest({
    directory: dir,
    output_directory: outDir,
  });

  // Step 2: Extract markdown content
  const extractResult = await extract({ directory: outDir });

  return {
    ingest_result: {
      total: ingestResult.total,
      successful: ingestResult.successful,
      output_directory: outDir,
    },
    documents: extractResult.documents,
    topic: input.topic,
    instructions: [
      `Topic: "${input.topic}"`,
      "",
      "You now have all the raw markdown from the source documents.",
      "Please:",
      "1. Read through all documents and extract key insights",
      "2. Organize them into a coherent, well-structured knowledge article",
      "3. Identify concepts that would benefit from diagrams (flowcharts, architecture diagrams, 2x2 matrices)",
      "4. Use mcp__drawio__create_diagram to create visualizations",
      "5. Use kbb_publish to upload the final article to FlowMind",
    ].join("\n"),
  };
}
