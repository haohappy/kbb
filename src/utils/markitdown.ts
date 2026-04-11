import { spawn } from "child_process";
import { getPythonPath } from "./config.js";

export function convertFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const script = `
import sys, json
from markitdown import MarkItDown
md = MarkItDown()
try:
    result = md.convert(sys.argv[1])
    print(result.text_content)
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    const proc = spawn(pythonPath, ["-c", script, filePath], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        if (stderr.includes("ModuleNotFoundError") || stderr.includes("No module named")) {
          reject(new Error(
            "MarkItDown 未安装。请运行 ./setup.sh 或手动执行: pip install markitdown"
          ));
        } else {
          reject(new Error(`MarkItDown conversion failed for ${filePath}: ${stderr}`));
        }
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => {
      if (err.message.includes("ENOENT")) {
        reject(new Error(
          "Python 解释器未找到。请运行 ./setup.sh 或设置 MARKITDOWN_PYTHON 环境变量"
        ));
      } else {
        reject(new Error(`Failed to spawn python: ${err.message}`));
      }
    });
  });
}

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".pptx", ".xlsx", ".xls",
  ".html", ".htm", ".txt", ".csv", ".json",
  ".xml", ".rtf", ".md", ".epub",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff",
  ".mp3", ".wav", ".m4a",
  ".mp4", ".mov", ".avi",
  ".zip",
]);

export function isSupportedFile(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.has(ext.toLowerCase());
}
