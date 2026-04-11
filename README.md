# KBB - 知识库构建器 (Knowledge Base Builder)

一个 Claude Code MCP 服务器，用于从各种文件格式构建结构化知识库。

An MCP server for Claude Code that builds structured knowledge bases from various file formats.

## 功能特性 / Features

- **文件采集** — 支持 PDF、DOCX、PPTX、XLSX、HTML、图片、音频等格式，使用 [MarkItDown](https://github.com/microsoft/markitdown) 转换为 Markdown
- **内容提取** — 读取转换后的 Markdown，交由 Claude 整理和组织
- **知识可视化** — 集成 [Draw.io MCP](https://github.com/jgraph/drawio-mcp) 生成架构图、流程图、二乘二图等
- **知识发布** — 通过 [FlowMind](https://flowmind.life) API 发布到知识管理平台

## 支持平台 / Supported Platforms

- macOS
- Linux
- Windows (通过 WSL)

## 前置要求 / Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Python](https://www.python.org/) >= 3.10
- [Claude Code](https://claude.ai/download) CLI

## 快速开始 / Quick Start

```bash
git clone https://github.com/haohappy/kbb.git
cd kbb
./setup.sh
```

`setup.sh` 会自动完成以下步骤：
1. 检查 Node.js 和 Python 版本
2. 创建 Python 虚拟环境并安装 MarkItDown
3. 安装 Node.js 依赖并编译
4. 注册 KBB 为 Claude Code MCP 服务器
5. （可选）注册 Draw.io MCP
6. （可选）配置 FlowMind API

安装完成后，重启 Claude Code，输入：

```
/kbb ~/your/research/folder 你的研究主题
```

## 手动安装 / Manual Installation

如果不想使用自动安装脚本：

```bash
# 1. 克隆并构建
git clone https://github.com/haohappy/kbb.git
cd kbb
npm install
npm run build

# 2. 创建 Python 虚拟环境并安装 MarkItDown
python3 -m venv .venv
.venv/bin/pip install markitdown==0.1.5

# 3. 注册 KBB MCP 服务器
claude mcp add kbb -- node "$(pwd)/dist/index.js"

# 4. （可选）注册 Draw.io MCP
claude mcp add drawio --transport sse https://mcp.draw.io/mcp

# 5. （可选）配置 FlowMind
mkdir -p ~/.flowmind && chmod 700 ~/.flowmind
cat > ~/.flowmind/config.json << 'EOF'
{"api_key": "your_api_key_here", "base_url": "https://flowmind.life/api/v1"}
EOF
chmod 600 ~/.flowmind/config.json
```

## MCP 工具 / Tools

| 工具 | 说明 |
|------|------|
| `kbb_ingest` | 将目录中的文件转换为 Markdown（使用 MarkItDown） |
| `kbb_extract` | 读取目录中所有 Markdown 文件的内容 |
| `kbb_export_diagram` | 将 draw.io XML 导出为高清 PNG 图片 |
| `kbb_publish` | 将知识文章发布到 FlowMind，支持 `{{IMG:id}}` 图片占位符 |
| `kbb_upload_image` | 上传图片到 FlowMind 笔记，替换占位符 |
| `kbb_list` | 列出已发布的知识文章（需配置） |
| `kbb_pipeline` | 完整流水线：采集 → 提取 → 返回给 Claude 整理（含图文发布指引） |

## 使用示例 / Usage Example

假设你在研究睡眠质量改善，已经收集了一些资料到 `~/research/sleep/` 目录：

```
你: "把 ~/research/sleep/ 目录下的文件处理成知识库文章，主题是睡眠质量改善"
```

Claude 会自动：
1. 调用 `kbb_pipeline` 将所有文件转换为 Markdown
2. 阅读所有内容，提取关键知识点
3. 组织成结构化的知识文章
4. 生成图表（决策流程图、对比矩阵等）并导出为 PNG
5. 发布到 FlowMind，图片自动嵌入文章

### 图文发布流程

KBB 支持在文章中嵌入高清图表，完整流程如下：

```
Step 1: mcp__drawio__create_diagram(xml)     → 预览图表
Step 2: kbb_export_diagram(xml, filename)     → 导出为 PNG，返回 placeholder_id
Step 3: kbb_publish(title, content)           → 发布文章，内容中用 {{IMG:placeholder_id}} 标记图片位置
Step 4: kbb_upload_image(note_id, png, id)    → 上传 PNG，FlowMind 自动替换占位符为图片
```

**前置要求**：图表导出需要安装 [draw.io desktop](https://github.com/jgraph/drawio-desktop/releases)（提供 `drawio` CLI 命令）。

## 配置 / Configuration

### FlowMind（可选）

FlowMind 配置存储在 `~/.flowmind/config.json`：

```json
{
  "api_key": "your_api_key_here",
  "base_url": "https://flowmind.life/api/v1"
}
```

获取 API Key：访问 [FlowMind](https://flowmind.life) 注册账号。

也可以安装 FlowMind 的 Claude Code 技能：[cc-skill-flowmind](https://github.com/haohappy/cc-skill-flowmind)

### Draw.io MCP（可选）

Draw.io MCP 用于生成知识图谱和各种图表。注册方式：

```bash
claude mcp add drawio --transport sse https://mcp.draw.io/mcp
```

详情见：[drawio-mcp](https://github.com/jgraph/drawio-mcp)

### Python 路径

KBB 默认使用项目目录下的 `.venv/bin/python`。如果需要指定其他 Python 路径：

```bash
export MARKITDOWN_PYTHON=/path/to/python3
```

## 常见问题 / FAQ

**Q: 移动了项目目录后工具不可用了？**
A: 重新运行 `./setup.sh`，MCP 注册使用绝对路径，移动目录后需要重新注册。

**Q: kbb_publish 报错"FlowMind 未配置"？**
A: FlowMind 是可选功能。运行 `./setup.sh` 配置，或手动创建 `~/.flowmind/config.json`。

**Q: MarkItDown 转换失败？**
A: 确认 `.venv` 目录存在且 markitdown 已安装。可重新运行 `./setup.sh`。

**Q: Windows 支持？**
A: 建议使用 WSL (Windows Subsystem for Linux)。

## License

MIT
