---
name: kbb
description: Build knowledge base articles from raw files. Ingests documents (PDF, DOCX, PPTX, etc.), organizes content, generates diagrams, and publishes with images to FlowMind. Use when user wants to create a knowledge article from a folder of research materials.
trigger: /kbb
---

# /kbb — Knowledge Base Builder

Turn a folder of raw files into a polished, illustrated knowledge base article.

## Usage

```
/kbb <directory> <topic>           # full pipeline: ingest → organize → diagrams → publish
/kbb <directory> <topic> --no-pub  # skip publishing, just generate the article locally
/kbb help                          # show this help
```

## Examples

<example>
User: /kbb ~/research/sleep 睡眠质量改善
Assistant: [Runs full pipeline: ingest files, organize content, generate diagrams, publish to FlowMind with images]
</example>

<example>
User: /kbb ./data/cholesterol 降胆固醇药物研究
Assistant: [Same pipeline on a different topic]
</example>

<example>
User: /kbb ~/papers/ai-safety AI Safety --no-pub
Assistant: [Generates article and diagrams locally without publishing to FlowMind]
</example>

## Instructions

When the user invokes `/kbb`, follow this exact workflow:

### Step 1: Parse arguments

Extract from the user's input:
- `directory` — path to the folder of source files (required)
- `topic` — the subject/topic for the knowledge article (required)
- `--no-pub` — if present, skip FlowMind publishing steps

If either `directory` or `topic` is missing, ask the user to provide them.

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

Record the returned `note_id`.

**6b. Upload images:**
For each diagram, call `kbb_upload_image` with:
- `note_id`: from step 6a
- `image_path`: the `png_path` from step 4b
- `placeholder_id`: the `placeholder_id` from step 4b
- `alt`: descriptive alt text for the image

**6c. Report completion:**
Show the user:
- The article URL on FlowMind
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
