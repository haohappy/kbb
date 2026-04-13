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
/kbb <file> --auto-share                      # read a single file, summarize + diagrams + publish
/kbb <directory> <topic>                      # full pipeline on existing files: ingest → organize → diagrams → publish
/kbb <topic> --auto-share                     # research + pipeline + public share link
/kbb <directory> <topic> --auto-share         # pipeline on existing files + public share link
/kbb <directory> <topic> --no-pub             # skip publishing, just generate the article locally
/kbb <topic> --diagram=flowchart,mindmap       # specify diagram types to generate
/kbb diagram list                             # list all available diagram types
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
User: /kbb docs/architecture.md --auto-share
Assistant: [Reads the single file, summarizes with diagrams, publishes with public share link]
</example>

<example>
User: /kbb 睡眠质量改善 --diagram=mindmap,flowchart --auto-share
Assistant: [Research + generates a mind map and a flowchart specifically, then publishes]
</example>

<example>
User: /kbb diagram list
Assistant: [Shows all available diagram types with descriptions]
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
- `--diagram=type1,type2` — if present, only generate these specific diagram types (comma-separated). If omitted, Claude auto-selects the best types for the content.

**Diagram list mode:** If the arguments are `diagram list`:
Show the full diagram type catalog below and stop:

| Type | Name | Description | Best for |
|------|------|-------------|----------|
| `flowchart` | 流程图 | Step-by-step paths with decision diamonds | Processes, decision trees, troubleshooting |
| `mindmap` | 思维导图 | Central topic with branching sub-topics | Topic overview, brainstorming, concept breakdown |
| `matrix` | 二维矩阵 | 2x2 or NxN grid comparing two dimensions | Comparisons (risk vs reward, effort vs impact) |
| `architecture` | 架构图 | Components, layers, and connections | System design, tech stacks, infrastructure |
| `timeline` | 时间线 | Events ordered chronologically | History, project phases, roadmaps |
| `comparison` | 对比表 | Side-by-side comparison of items | Product comparison, pros/cons |
| `pyramid` | 金字塔 | Hierarchical layers from top to bottom | Priority ranking, evidence levels |
| `venn` | 韦恩图 | Overlapping circles showing relationships | Similarities/differences between groups |
| `sequence` | 序列图 | Interactions between entities over time | API calls, user flows, communication |
| `orgchart` | 组织图 | Hierarchical tree structure | Organization, taxonomy, classification |
| `swimlane` | 泳道图 | Process flow with responsibility lanes | Cross-team workflows, RACI |
| `cycle` | 循环图 | Steps in a repeating loop | Iterative processes, feedback loops |

Example: `/kbb 睡眠质量改善 --diagram=mindmap,flowchart --auto-share`

Done — do not continue to other steps.

**Determine mode:**
- If the first argument is a path to a **single file** (not a directory): **Single-file mode** — go to Step 1.6
- If `directory` is provided and exists as a **directory**: **File mode** — skip to Step 2
- If only `topic` is provided (no path): **Research mode** — go to Step 1.5

**Config mode:** If the first argument is `config-flowmind`:
- `/kbb config-flowmind` → call `kbb_config` with `action: "status"` and show the result. Done.
- `/kbb config-flowmind <api-key>` → call `kbb_config` with `action: "set"` and `flowmind_api_key: <api-key>`. Done.

**Help mode:** If the argument is `help`, show this formatted help and stop:

```
/kbb — 知识库构建器

用法:
  /kbb <topic>                              研究模式：Claude知识 + 网络搜索 → 文章 → 图表 → 发布
  /kbb <file>                               单文件模式：读取文档 → 总结 → 图表 → 发布
  /kbb <directory> <topic>                   目录模式：处理目录中所有文件 → 文章 → 图表 → 发布
  /kbb diagram list                          列出所有可用图表类型（12种）
  /kbb config-flowmind                       查看 FlowMind 配置状态
  /kbb config-flowmind <api-key>             设置 FlowMind API Key
  /kbb help                                  显示本帮助

参数:
  --auto-share       发布到 FlowMind + 生成公开链接（任何人无需登录可查看）
  --no-pub           不发布，只在本地生成文章
  --diagram=type     指定图表类型，逗号分隔（如 --diagram=mindmap,flowchart）
  （无参数）          默认发布到 FlowMind（私有，需登录查看）

未配置 FlowMind？
  不会报错。自动切换到 --no-pub 模式，文章在本地生成。
  随时可通过 /kbb config-flowmind <key> 启用发布功能。

示例:
  /kbb 睡眠质量改善 --auto-share
  /kbb docs/report.md --diagram=architecture --auto-share
  /kbb ~/research/sleep 睡眠质量改善
  /kbb 间歇性断食 --diagram=mindmap,flowchart --no-pub
```

Done — do not continue to other steps.

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

### Step 1.6: Single-file mode

When the user provides a path to a single file (e.g., `/kbb docs/report.md --auto-share`):

1. **Read the file** using the Read tool. If the file is not plain text/markdown (e.g., PDF, DOCX), use `kbb_ingest` to convert it first.
2. **Extract the topic** from the file's title, first heading, or filename.
3. **Use the file content as the sole source material** — skip directly to Step 3 (organize content). No web search or Claude knowledge generation needed since the user already has their source document.
4. Continue with Step 4 (diagrams), Step 5 (placeholders), and Step 6 (publish) as normal.

This mode is useful for quickly summarizing and publishing a single document with diagrams.

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

### Step 4: Create diagrams

**If `--diagram` was specified:** Generate exactly the requested diagram types, one diagram per type. Map each type to its visual style:

| Type | XML approach |
|------|-------------|
| `flowchart` | Rectangles (rounded) + diamonds (rhombus) + arrows. Use colors to distinguish actions vs decisions. |
| `mindmap` | Central node with branching sub-topics. Use `swimlane` containers or hierarchical layout. Radial or tree structure. |
| `matrix` | Two axes with items positioned by their scores. Quadrant labels. Dashed divider lines. |
| `architecture` | Layered containers (`swimlane`), component boxes, directional arrows between layers. |
| `timeline` | Horizontal or vertical sequence of events with dates/phases. Connected by arrows. |
| `comparison` | Side-by-side columns or rows comparing features/attributes. Table-like layout with color coding. |
| `pyramid` | Stacked horizontal layers, widest at bottom. Use different colors per tier. |
| `venn` | Overlapping ellipses with `opacity=50`. Labels in overlap and non-overlap regions. |
| `sequence` | Vertical lifelines with horizontal arrows between participants. Time flows downward. |
| `orgchart` | Tree structure with boxes connected top-down. Use containers for departments. |
| `swimlane` | Horizontal or vertical lanes (`swimlane` style) with process steps flowing across lanes. |
| `cycle` | Circular arrangement of steps with curved arrows connecting them in a loop. |

**If `--diagram` was NOT specified:** Auto-select 2-4 diagram types that best fit the content. Prefer variety (e.g., don't generate two flowcharts).

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
