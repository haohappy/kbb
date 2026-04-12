import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface ConfigInput {
  action: "get" | "set" | "status";
  flowmind_api_key?: string;
  flowmind_base_url?: string;
}

export interface ConfigResult {
  action: string;
  flowmind: {
    configured: boolean;
    config_path: string;
    base_url?: string;
    api_key_preview?: string;
  };
  message: string;
}

const CONFIG_DIR = join(homedir(), ".flowmind");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export async function config(input: ConfigInput): Promise<ConfigResult> {
  if (input.action === "set") {
    if (!input.flowmind_api_key) {
      return {
        action: "set",
        flowmind: { configured: false, config_path: CONFIG_PATH },
        message: "Error: flowmind_api_key is required for 'set' action",
      };
    }

    const baseUrl = input.flowmind_base_url || "https://flowmind.life/api/v1";

    mkdirSync(CONFIG_DIR, { recursive: true });
    chmodSync(CONFIG_DIR, 0o700);

    const configData = JSON.stringify({
      api_key: input.flowmind_api_key,
      base_url: baseUrl,
    });

    writeFileSync(CONFIG_PATH, configData, { mode: 0o600 });

    return {
      action: "set",
      flowmind: {
        configured: true,
        config_path: CONFIG_PATH,
        base_url: baseUrl,
        api_key_preview: input.flowmind_api_key.slice(0, 8) + "..." + input.flowmind_api_key.slice(-4),
      },
      message: "FlowMind API key configured successfully. You can now use kbb_publish and kbb_upload_image.",
    };
  }

  // action === "get" or "status"
  if (!existsSync(CONFIG_PATH)) {
    return {
      action: input.action,
      flowmind: { configured: false, config_path: CONFIG_PATH },
      message: "FlowMind is not configured. Use kbb_config with action='set' and flowmind_api_key to configure.",
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const data = JSON.parse(raw) as Record<string, string>;

    return {
      action: input.action,
      flowmind: {
        configured: Boolean(data.api_key),
        config_path: CONFIG_PATH,
        base_url: data.base_url,
        api_key_preview: data.api_key
          ? data.api_key.slice(0, 8) + "..." + data.api_key.slice(-4)
          : undefined,
      },
      message: data.api_key
        ? "FlowMind is configured and ready."
        : "FlowMind config file exists but api_key is missing.",
    };
  } catch {
    return {
      action: input.action,
      flowmind: { configured: false, config_path: CONFIG_PATH },
      message: "FlowMind config file exists but is malformed. Use kbb_config with action='set' to reconfigure.",
    };
  }
}
