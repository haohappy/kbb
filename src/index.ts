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
import { exportDiagram } from "./tools/export-diagram.js";
import { uploadImage } from "./tools/upload-image.js";
import { research } from "./tools/research.js";
import { isFlowMindConfigured } from "./utils/config.js";

const server = new Server(
  { name: "kbb", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: "kbb_research",
    description:
      "Search the web for a topic, fetch relevant articles, and save them as text files. " +
      "This is the first step in building a knowledge base — gathering raw research materials. " +
      "The saved files can then be processed by kbb_ingest or kbb_pipeline.",
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "The research topic to search for",
        },
        output_directory: {
          type: "string",
          description: "Directory to save fetched articles as .txt files",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Custom search queries. If not provided, auto-generates queries from the topic.",
        },
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Specific URLs to fetch directly (skip search, just download these pages).",
        },
        num_results: {
          type: "number",
          description: "Maximum number of pages to fetch (default: 6)",
        },
      },
      required: ["topic", "output_directory"],
    },
  },
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
      "Uploads a markdown article with title and optional tags. " +
      "Set auto_share=true to generate a public share link accessible without login.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title of the knowledge article",
        },
        content: {
          type: "string",
          description: "Markdown content of the article. Use {{IMG:placeholder_id}} for image placeholders.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags/categories for the article",
        },
        auto_share: {
          type: "boolean",
          description: "When true, generates a public share URL accessible by anyone without login. Default: false.",
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
    name: "kbb_export_diagram",
    description:
      "Export a draw.io diagram to PNG. Takes draw.io XML (mxGraphModel format), " +
      "saves as .drawio file, and exports to high-resolution PNG using the drawio CLI. " +
      "Returns the PNG path and a placeholder_id for use with kbb_publish and kbb_upload_image.",
    inputSchema: {
      type: "object" as const,
      properties: {
        xml: {
          type: "string",
          description: "Draw.io XML content (mxGraphModel format)",
        },
        filename: {
          type: "string",
          description: "Base filename without extension (e.g. 'decision-flow'). Used as placeholder_id.",
        },
        output_directory: {
          type: "string",
          description: "Directory to save the .drawio and .png files. Defaults to system temp directory.",
        },
        scale: {
          type: "number",
          description: "Export scale factor (default: 2 for high-res)",
        },
      },
      required: ["xml"],
    },
  },
  {
    name: "kbb_upload_image",
    description:
      "Upload an image to a FlowMind note, replacing a {{IMG:placeholder_id}} in the content. " +
      "Use after kbb_publish to add diagrams to a published article.",
    inputSchema: {
      type: "object" as const,
      properties: {
        note_id: {
          type: "string",
          description: "The FlowMind note ID (returned by kbb_publish)",
        },
        image_path: {
          type: "string",
          description: "Path to the PNG image file (returned by kbb_export_diagram)",
        },
        placeholder_id: {
          type: "string",
          description: "The placeholder ID to replace (e.g. 'decision_flow' replaces {{IMG:decision_flow}})",
        },
        alt: {
          type: "string",
          description: "Alt text for the image",
        },
      },
      required: ["note_id", "image_path", "placeholder_id"],
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
      case "kbb_research":
        result = await research(args as unknown as Parameters<typeof research>[0]);
        break;
      case "kbb_ingest":
        result = await ingest(args as unknown as Parameters<typeof ingest>[0]);
        break;
      case "kbb_extract":
        result = await extract(args as unknown as Parameters<typeof extract>[0]);
        break;
      case "kbb_publish":
        if (!isFlowMindConfigured()) {
          return {
            content: [{ type: "text" as const, text: "FlowMind 未配置。请运行 ./setup.sh 或手动创建 ~/.flowmind/config.json" }],
            isError: true,
          };
        }
        result = await publish(args as unknown as Parameters<typeof publish>[0]);
        break;
      case "kbb_list":
        if (!isFlowMindConfigured()) {
          return {
            content: [{ type: "text" as const, text: "FlowMind 未配置。请运行 ./setup.sh 或手动创建 ~/.flowmind/config.json" }],
            isError: true,
          };
        }
        result = await list(args as unknown as Parameters<typeof list>[0]);
        break;
      case "kbb_export_diagram":
        result = await exportDiagram(args as unknown as Parameters<typeof exportDiagram>[0]);
        break;
      case "kbb_upload_image":
        if (!isFlowMindConfigured()) {
          return {
            content: [{ type: "text" as const, text: "FlowMind 未配置。请运行 ./setup.sh 或手动创建 ~/.flowmind/config.json" }],
            isError: true,
          };
        }
        result = await uploadImage(args as unknown as Parameters<typeof uploadImage>[0]);
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
