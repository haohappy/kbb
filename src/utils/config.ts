import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

export interface FlowMindConfig {
  api_key: string;
  base_url: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFlowMindConfig(): FlowMindConfig {
  const configPath = join(homedir(), ".flowmind", "config.json");

  if (!existsSync(configPath)) {
    throw new Error(
      "FlowMind 未配置。请运行 setup.sh 或手动创建 ~/.flowmind/config.json\n" +
      '格式: { "api_key": "your_key", "base_url": "https://flowmind.life/api/v1" }'
    );
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (err) {
    throw new Error(`无法读取 FlowMind 配置文件: ${configPath}`);
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(
      `FlowMind 配置文件 JSON 格式错误: ${configPath}\n` +
      '正确格式: { "api_key": "your_key", "base_url": "https://flowmind.life/api/v1" }'
    );
  }

  if (!config.api_key || typeof config.api_key !== "string" || config.api_key.trim() === "") {
    throw new Error("FlowMind 配置缺少 api_key 字段，请检查 ~/.flowmind/config.json");
  }
  if (!config.base_url || typeof config.base_url !== "string" || config.base_url.trim() === "") {
    throw new Error("FlowMind 配置缺少 base_url 字段，请检查 ~/.flowmind/config.json");
  }

  return { api_key: config.api_key, base_url: config.base_url };
}

export function isFlowMindConfigured(): boolean {
  try {
    loadFlowMindConfig();
    return true;
  } catch {
    return false;
  }
}

let cachedPythonPath: string | null = null;

export function getPythonPath(): string {
  if (cachedPythonPath) return cachedPythonPath;

  if (process.env.MARKITDOWN_PYTHON) {
    cachedPythonPath = process.env.MARKITDOWN_PYTHON;
    return cachedPythonPath;
  }

  // Priority 1: project-local venv
  const projectRoot = join(__dirname, "..", "..");
  const venvPython = join(projectRoot, ".venv", "bin", "python");
  if (existsSync(venvPython)) {
    try {
      execFileSync(venvPython, ["-c", "import markitdown"], { stdio: "pipe", timeout: 10_000 });
      cachedPythonPath = venvPython;
      return cachedPythonPath;
    } catch { /* venv exists but markitdown not installed, try system */ }
  }

  // Priority 2: system Python candidates
  const candidates = ["python3.13", "python3.12", "python3.11", "python3.10", "python3"];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ["-c", "import markitdown"], { stdio: "pipe", timeout: 10_000 });
      cachedPythonPath = cmd;
      return cachedPythonPath;
    } catch { /* try next */ }
  }

  // Fallback
  cachedPythonPath = "python3";
  return cachedPythonPath;
}
