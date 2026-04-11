# KBB - Knowledge Base Builder

MCP server for building knowledge bases from raw files.

## Architecture

TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport.

## Tools

| Tool | Description |
|------|-------------|
| `kbb_ingest` | Convert files → Markdown via MarkItDown (Python) |
| `kbb_extract` | Read converted markdown files |
| `kbb_export_diagram` | Export draw.io XML → PNG (via drawio CLI) |
| `kbb_publish` | Create article on FlowMind (supports `{{IMG:id}}` placeholders) |
| `kbb_upload_image` | Upload PNG to FlowMind note, replacing `{{IMG:id}}` placeholder |
| `kbb_list` | List published articles |
| `kbb_pipeline` | Full pipeline: ingest → extract → return with workflow instructions |

## Complete Workflow

```
kbb_pipeline(directory, topic)
  → Claude reads content, organizes into article
  → Claude creates diagrams:
      1. mcp__drawio__create_diagram(xml)  — preview
      2. kbb_export_diagram(xml, filename) — export PNG
  → Claude writes article with {{IMG:placeholder_id}} markers
  → kbb_publish(title, content_with_placeholders, tags)  — returns note_id
  → kbb_upload_image(note_id, png_path, placeholder_id)  — for each diagram
  → Article on FlowMind with embedded images
```

## Build & Run

```bash
npm run build   # tsc
npm start       # node dist/index.js
```

## Dependencies

- Python >= 3.10 with `markitdown` (in project .venv)
- draw.io desktop app (for `drawio` CLI export)
- FlowMind config at `~/.flowmind/config.json` (optional)
- Draw.io MCP (separate server, optional) for diagram preview
