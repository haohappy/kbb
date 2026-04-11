import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface FlowMindConfig {
  api_key: string;
  base_url: string;
}

export function loadFlowMindConfig(): FlowMindConfig {
  const configPath = join(homedir(), ".flowmind", "config.json");
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as FlowMindConfig;
}

export function getPythonPath(): string {
  return process.env.MARKITDOWN_PYTHON || "python3.11";
}
