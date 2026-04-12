---
name: kbb
description: Build knowledge base articles from raw files. Ingests documents (PDF, DOCX, PPTX, etc.), organizes content, generates diagrams, and publishes with images to FlowMind. Use when user wants to create a knowledge article from a folder of research materials.
trigger: /kbb
---

# /kbb — Knowledge Base Builder

Turn a folder of raw files into a polished, illustrated knowledge base article.

## Usage

```
/kbb <topic>                                  # research + full pipeline (auto-search, no pre-existing files needed)
/kbb <directory> <topic>                      # full pipeline on existing files: ingest → organize → diagrams → publish
/kbb <topic> --auto-share                     # research + pipeline + public share link
/kbb <directory> <topic> --auto-share         # pipeline on existing files + public share link
/kbb <directory> <topic> --no-pub             # skip publishing, just generate the article locally
/kbb config-flowmind                          # check FlowMind configuration status
/kbb config-flowmind <api-key>                # set FlowMind API key
/kbb help                                     # show this help
```

## Examples

<example>
User: /kbb 40岁男性如何科学增肌
Assistant: [Searches the web for research, downloads articles, then runs full pipeline: organize → diagrams → publish]
</example>

<example>
User: /kbb ~/research/sleep 睡眠质量改善
Assistant: [Uses existing files in the directory, runs full pipeline: ingest → organize → diagrams → publish]
</example>

<example>
User: /kbb 间歇性断食的科学依据 --auto-share
Assistant: [Searches web, builds article, publishes with a public share link anyone can view without login]
</example>

<example>
User: /kbb ~/papers/ai-safety AI Safety --no-pub
Assistant: [Uses existing files, generates article and diagrams locally without publishing]
</example>

## Instructions

When the user invokes `/kbb`, follow this exact workflow:

### Step 1: Parse arguments

Extract from the user's input:
- `directory` — path to the folder of source files (optional — if omitted, research mode is activated)
- `topic` — the subject/topic for the knowledge article (required)
- `--no-pub` — if present, skip FlowMind publishing steps
- `--auto-share` — if present, generate a public share link (anyone can view without login)

**Determine mode:**
- If `directory` is provided and exists: **File mode** — skip to Step 2
- If only `topic` is provided (no directory): **Research mode** — go to Step 1.5

**Config mode:** If the first argument is `config-flowmind`:
- `/kbb config-flowmind` → call `kbb_config` with `action: "status"` and show the result. Done.
- `/kbb config-flowmind <api-key>` → call `kbb_config` with `action: "set"` and `flowmind_api_key: <api-key>`. Done.

If `topic` is missing, ask the user to provide it.

### Step 1.5: Research (when no directory provided)

Research has two phases: Claude's own knowledge + web search.

**Phase A: Generate knowledge base from Claude's expertise**

Before searching the web, use your own training knowledge to create 2-4 comprehensive research files covering the topic. Use the Write tool to save them to the output directory (e.g., `/tmp/kbb-research-<topic-slug>/`).

Guidelines:
- Write as detailed research notes, not as a finished article (the article is assembled later in Step 3)
- Include specific data points, study references, mechanisms, and practical recommendations
- Organize by sub-topics (e.g., for skincare: "science of aging skin", "evidence-based ingredients", "daily routine", "lifestyle factors")
- Name files with `00_` prefix so they sort before web results (e.g., `00_claude_skin_aging_science.txt`, `00_claude_ingredients_evidence.txt`)
- Each file should be 1500-3000 words covering one sub-topic in depth
- Include caveats and nuance — this is research, not marketing

**Phase B: Search the web for supplementary sources**

Call `kbb_research` with:
- `topic`: the research topic
- `output_directory`: the same directory from Phase A
- `num_results`: 6 (default)

This adds web search results alongside Claude's knowledge files. The web sources provide:
- Latest product recommendations and pricing
- Region-specific information
- Real-world user experiences
- Data that post-dates Claude's training cutoff

Report progress:
```
Research complete:
- Claude knowledge: X files generated
- Web search: Y articles found, Z successfully downloaded
- Total sources: N files in <directory>
```

Show a brief list of all sources (both Claude-generated and web-fetched).

Set `directory` to the output directory, then continue to Step 2.

### Step 2: Ingest and extract

Call `kbb_pipeline` with the directory and topic. This will:
- Convert all supported files (PDF, DOCX, PPTX, XLSX, HTML, images, etc.) to Markdown using MarkItDown
- Return all extracted content and workflow instructions

Report progress: "Ingested X files (Y successful). Reading content..."

### Step 3: Organize content

Read through all returned documents and create a well-structured knowledge article in Markdown:
- Use clear section headings (## / ###)
- Include comparison tables where appropriate
- Add key data points and statistics from the source material
- Write in the same language as the topic (Chinese topic → Chinese article)
- Aim for completeness while staying concise

### Step 4: Identify and create diagrams

Review the article and identify 2-4 concepts that benefit from visualization:
- **Decision flowcharts** — step-by-step paths (use rhombus for decisions, rounded rectangles for actions)
- **2x2 matrices** — two-axis comparisons (e.g., evidence vs safety)
- **Architecture diagrams** — system overviews with components and connections
- **Process flows** — sequential steps with arrows

For each diagram:

**4a. Preview the diagram:**
Call `mcp__drawio__create_diagram` with the draw.io XML to render a preview.

**4b. Export to PNG:**
Call `kbb_export_diagram` with:
- `xml`: the same draw.io XML
- `filename`: a descriptive name (e.g., "decision-flow", "supplements-comparison")
- `output_directory`: the pipeline's output directory

Record the returned `placeholder_id` and `png_path` for each diagram.

### Step 5: Prepare article with image placeholders

Insert `{{IMG:<placeholder_id>}}` markers in the article content where each diagram should appear. Add a brief description before each image placeholder to provide context.

Example:
```markdown
## Decision Path

Follow this flowchart to find the right approach:

{{IMG:decision-flow}}

## Comparison Matrix

The chart below shows evidence strength vs safety:

{{IMG:supplements-comparison}}
```

### Step 6: Publish (unless --no-pub)

**If `--no-pub` is set:** Save the article to a local .md file in the output directory and report the file path. Show the user the article content. Done.

**If publishing:**

**6a. Create the note:**
Call `kbb_publish` with:
- `title`: a descriptive article title
- `content`: the full article with `{{IMG:...}}` placeholders
- `tags`: relevant tags based on the topic
- `auto_share`: set to `true` if `--auto-share` flag was provided

Record the returned `note_id`. If `auto_share` was true, also record the `share_url` from the response.

**6b. Upload images:**
For each diagram, call `kbb_upload_image` with:
- `note_id`: from step 6a
- `image_path`: the `png_path` from step 4b
- `placeholder_id`: the `placeholder_id` from step 4b
- `alt`: descriptive alt text for the image

**6c. Report completion:**
Show the user:
- The article URL on FlowMind
- If `--auto-share` was used: the **public share URL** (from `share_url` in the response) — emphasize this is the link to share with anyone
- Number of diagrams embedded
- A brief summary of the article structure

### Error handling

- If `kbb_pipeline` fails on some files, continue with the successfully converted ones
- If `mcp__drawio__create_diagram` is not available, skip the preview step but still export via `kbb_export_diagram`
- If `kbb_export_diagram` fails (drawio CLI not installed), create the article without diagrams and tell the user to install draw.io desktop
- If FlowMind is not configured, automatically switch to `--no-pub` mode and inform the user
- If `kbb_upload_image` fails for one image, continue with the rest and report which images failed

## Requirements

- KBB MCP server must be registered (`setup.sh` handles this)
- draw.io desktop app for diagram export (optional but recommended)
- FlowMind configuration for publishing (optional)
- Draw.io MCP for diagram preview (optional)
