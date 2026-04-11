#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ingest } from "./tools/ingest.js";
import { extract } from "./tools/extract.js";
import { publish } from "./tools/publish.js";
import { list } from "./tools/list.js";
import { pipeline } from "./tools/pipeline.js";

const server = new Server(
  { name: "kbb", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: "kbb_ingest",
    description:
      "Convert files in a directory to Markdown using Microsoft MarkItDown. " +
      "Supports PDF, DOCX, PPTX, XLSX, HTML, images, audio, and more. " +
      "Outputs markdown files to a subdirectory.",
    inputSchema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description: "Path to the directory containing source files to convert",
        },
        output_directory: {
          type: "string",
          description: "Path to save converted markdown files. Defaults to <directory>/_kbb_output",
        },
        file_extensions: {
          type: "array",
          items: { type: "string" },
          description: "Filter by file extensions (e.g. [\".pdf\", \".docx\"]). Defaults to all supported types.",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "kbb_extract",
    description:
      "Read all markdown files from a directory and return their contents. " +
      "Use this after kbb_ingest to get the converted content for analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description: "Path to directory containing markdown files to read",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "kbb_publish",
    description:
      "Publish a knowledge article to FlowMind. " +
      "Uploads a markdown article with title and optional tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title of the knowledge article",
        },
        content: {
          type: "string",
          description: "Markdown content of the article",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags/categories for the article",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "kbb_list",
    description: "List published knowledge articles from FlowMind.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tag: {
          type: "string",
          description: "Filter by tag",
        },
        page: {
          type: "number",
          description: "Page number (default: 1)",
        },
        limit: {
          type: "number",
          description: "Items per page (default: 20)",
        },
      },
    },
  },
  {
    name: "kbb_pipeline",
    description:
      "Run the full knowledge base pipeline: ingest files → convert to markdown → return content for analysis. " +
      "After this, Claude should organize the content into a knowledge article, create diagrams with Draw.io, " +
      "and publish to FlowMind.",
    inputSchema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description: "Path to directory containing source files",
        },
        topic: {
          type: "string",
          description: "The topic/subject of the knowledge base article",
        },
        output_directory: {
          type: "string",
          description: "Path to save intermediate markdown files",
        },
      },
      required: ["directory", "topic"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "kbb_ingest":
        result = await ingest(args as unknown as Parameters<typeof ingest>[0]);
        break;
      case "kbb_extract":
        result = await extract(args as unknown as Parameters<typeof extract>[0]);
        break;
      case "kbb_publish":
        result = await publish(args as unknown as Parameters<typeof publish>[0]);
        break;
      case "kbb_list":
        result = await list(args as unknown as Parameters<typeof list>[0]);
        break;
      case "kbb_pipeline":
        result = await pipeline(args as unknown as Parameters<typeof pipeline>[0]);
        break;
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KBB MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
