# KBB - Knowledge Base Builder

MCP server for building knowledge bases from raw files.

## Architecture

TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport.

## Tools (8 total)

| Tool | Description |
|------|-------------|
| `kbb_research` | Search web (DuckDuckGo) + fetch articles → save as .txt files |
| `kbb_ingest` | Convert files → Markdown via MarkItDown (Python) |
| `kbb_extract` | Read converted markdown files |
| `kbb_export_diagram` | Export draw.io XML → PNG (via drawio CLI) |
| `kbb_publish` | Create article on FlowMind (supports `{{IMG:id}}` placeholders, `auto_share`) |
| `kbb_upload_image` | Upload PNG to FlowMind note, replacing `{{IMG:id}}` placeholder |
| `kbb_list` | List published articles |
| `kbb_pipeline` | Full pipeline: ingest → extract → return with workflow instructions |

## Complete Workflow

```
/kbb <topic> --auto-share

Phase A: Claude generates 2-4 expert research files from own knowledge (00_claude_*.txt)
Phase B: kbb_research searches web, fetches articles as supplementary sources
  ↓
kbb_pipeline(directory, topic) → MarkItDown converts all files to Markdown
  ↓
Claude reads all content, organizes into structured article
  ↓
Claude creates diagrams:
  1. mcp__drawio__create_diagram(xml)  — preview in terminal
  2. kbb_export_diagram(xml, filename) — export to PNG
  ↓
Claude writes article with {{IMG:placeholder_id}} markers
  ↓
kbb_publish(title, content, tags, auto_share=true) — returns note_id + share_url
  ↓
kbb_upload_image(note_id, png_path, placeholder_id) — for each diagram
  ↓
Published article with embedded images + public share link
```

## Three Modes

```
# Research mode (no pre-existing files)
/kbb 睡眠质量改善
/kbb 间歇性断食 --auto-share

# Single-file mode (read one document, summarize + publish)
/kbb docs/report.md --auto-share
/kbb ~/Downloads/paper.pdf

# Directory mode (process all files in a folder)
/kbb ~/research/sleep 睡眠质量改善
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
