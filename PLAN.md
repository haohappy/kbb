# KBB 开源化计划

## Context

KBB (Knowledge Base Builder) 是一个 TypeScript MCP 服务器，已在本地开发完成。现在需要将其开源到 GitHub (haohappy/kbb)，让其他用户也能轻松安装和使用。核心挑战：KBB 依赖三个外部工具（MarkItDown、Draw.io MCP、FlowMind），需要自动化安装流程。

## 需要修改/创建的文件

### 1. 代码可移植性修复

**`src/utils/config.ts`** — 自动检测 Python 路径 + FlowMind 配置缺失时给出友好错误
- `getPythonPath()`: 从硬编码 `python3.11` 改为按优先级自动探测 (python3.13 → python3.12 → python3.11 → python3.10 → python3)
- `loadFlowMindConfig()`: 文件不存在时抛出友好错误提示，而非原始 ENOENT

**`package.json`** — 添加开源所需字段
- `bin`: `{ "kbb": "dist/index.js" }` — 支持 npx
- `repository`: GitHub URL
- `engines`: `{ "node": ">=18.0.0" }` — 因为使用了 native fetch
- `prepare`: `npm run build` — clone 后自动编译
- `license`: `MIT`

### 2. 创建新文件

**`setup.sh`** — 一键安装脚本 (Bash)
```
步骤：
1. 检查 Node.js >= 18
2. 检测 Python >= 3.10，找到合适版本
3. pip install markitdown（检测是否已安装，跳过已装的）
4. npm install && npm run build
5. 配置 FlowMind（交互式输入 API key，或跳过）
6. claude mcp add drawio（注册 Draw.io MCP）
7. claude mcp add kbb（注册 KBB 自身为 MCP 服务器）
```
- 每步幂等（已完成则跳过）
- FlowMind 和 Draw.io 标记为可选
- 失败时给出手动修复提示，不中断整个流程

**`README.md`** — 中文文档
- 项目介绍与功能特性
- 快速开始：`git clone` + `./setup.sh`
- 手动安装步骤（给不想用脚本的用户）
- 5 个工具的详细说明
- 使用示例（以降胆固醇药研究为例）
- 配置说明（FlowMind、Draw.io、Python 路径）
- 常见问题

**`.gitignore`**
```
node_modules/
dist/
output/
examples/*/_kbb_output/
.claude/settings.local.json
.mcp.json
*.tgz
```

**`LICENSE`** — MIT

### 3. 清理

- `.mcp.json` — 加入 .gitignore，不提交（由 setup.sh 生成）
- `.claude/settings.local.json` — 加入 .gitignore
- `output/` — 删除空目录
- `examples/cholesterol/_kbb_output/` — 删除生成的文件（不提交）

### 4. Git 初始化与推送

```bash
git init
git add .
git commit -m "Initial commit: KBB - Knowledge Base Builder MCP server"
git remote add origin https://github.com/haohappy/kbb.git
git branch -M main
git push -u origin main
```

## 实现顺序

1. 修改 `src/utils/config.ts`（Python 自动检测 + FlowMind 错误处理）
2. 更新 `package.json`（添加 bin、repository、engines 等）
3. 重新编译确认无误：`npm run build`
4. 创建 `.gitignore`
5. 创建 `LICENSE`
6. 创建 `setup.sh`（chmod +x）
7. 创建 `README.md`
8. 清理临时文件
9. 初始化 git 并推送

## 验证方式

1. 在新目录 clone 项目，运行 `./setup.sh`，确认所有依赖安装成功
2. 启动新的 Claude Code session，确认 `kbb_*` 工具可用
3. 用 `examples/cholesterol/` 测试 `kbb_pipeline`
