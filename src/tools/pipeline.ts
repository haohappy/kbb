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
    "",
    "## Step 1: Organize content",
    "Read through all documents, extract key insights, and organize them into a coherent, well-structured knowledge article in Markdown.",
    "",
    "## Step 2: Create diagrams",
    "Identify concepts that benefit from visualization (flowcharts, architecture diagrams, 2x2 matrices).",
    "For each diagram:",
    "  a. Use mcp__drawio__create_diagram to preview the diagram (pass draw.io XML)",
    "  b. Use kbb_export_diagram to export it as a PNG file (pass the same XML, a filename, and output_directory)",
    "  c. Note the returned placeholder_id for each diagram",
    "",
    "## Step 3: Write article with image placeholders",
    "In your article content, insert {{IMG:<placeholder_id>}} where each diagram should appear.",
    "Example: {{IMG:decision_flow}}",
  ];

  if (isFlowMindConfigured()) {
    steps.push(
      "",
      "## Step 4: Publish to FlowMind",
      "  a. Use kbb_publish to create the note (content should include {{IMG:...}} placeholders)",
      "  b. For each diagram, use kbb_upload_image with the note_id, image_path (PNG), placeholder_id, and alt text",
      "  c. FlowMind will automatically replace placeholders with actual images",
    );
  } else {
    steps.push(
      "",
      "Note: FlowMind is not configured. To enable publishing, run ./setup.sh or create ~/.flowmind/config.json",
    );
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
