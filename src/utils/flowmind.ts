import { loadFlowMindConfig, type FlowMindConfig } from "./config.js";

let cachedConfig: FlowMindConfig | null = null;

function getConfig(): FlowMindConfig {
  if (!cachedConfig) {
    cachedConfig = loadFlowMindConfig();
  }
  return cachedConfig;
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const config = getConfig();
  const url = `${config.base_url}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FlowMind API error ${res.status}: ${body}`);
  }

  return res.json();
}

export interface PublishResult {
  success: boolean;
  note_id: string;
  url: string;
}

export async function publishNote(title: string, content: string, tags?: string[]): Promise<PublishResult> {
  const body: Record<string, unknown> = { title, content };
  if (tags && tags.length > 0) {
    body.tags = tags;
  }

  const result = await apiRequest("/notes", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Record<string, unknown>;

  return {
    success: true,
    note_id: String(result.id || result.note_id || ""),
    url: String(result.url || `https://flowmind.life/notes/${result.id || result.note_id}`),
  };
}

export interface NoteListResult {
  notes: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
}

export async function listNotes(page = 1, limit = 20, tag?: string): Promise<NoteListResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (tag) params.set("tag", tag);

  const result = await apiRequest(`/notes?${params}`) as Record<string, unknown>;

  return {
    notes: (result.notes || result.data || []) as NoteListResult["notes"],
    total: Number(result.total || 0),
  };
}
