# KBB - Knowledge Base Builder

MCP server for building knowledge bases from raw files.

## Architecture

TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport.

## Tools

| Tool | Description |
|------|-------------|
| `kbb_ingest` | Convert files → Markdown via MarkItDown (Python) |
| `kbb_extract` | Read converted markdown files |
| `kbb_publish` | Upload article to FlowMind |
| `kbb_list` | List published articles |
| `kbb_pipeline` | Full pipeline: ingest → extract → return for Claude to organize |

## Typical Workflow

```
kbb_pipeline(directory, topic)
  → Claude organizes content into article
  → Claude calls mcp__drawio__create_diagram for visualizations
  → Claude calls kbb_publish to upload to FlowMind
```

## Build & Run

```bash
npm run build   # tsc
npm start       # node dist/index.js
```

## Dependencies

- Python 3.11 with `markitdown` package (Microsoft MarkItDown)
- FlowMind config at `~/.flowmind/config.json`
- Draw.io MCP (separate server) for diagrams
