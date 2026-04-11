import { loadFlowMindConfig, type FlowMindConfig } from "./config.js";
import { readFileSync } from "fs";
import { basename } from "path";

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

  // FlowMind API returns { data: { id, ... } }
  const data = (result.data || result) as Record<string, unknown>;
  const noteId = String(data.id || data.note_id || "");

  return {
    success: true,
    note_id: noteId,
    url: `https://flowmind.life/notes/${noteId}`,
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

export interface UploadImageResult {
  success: boolean;
  image_id: string;
  placeholder_id: string;
  url: string;
  replaced: boolean;
}

export async function uploadNoteImage(
  noteId: string,
  imagePath: string,
  placeholderId: string,
  alt?: string,
): Promise<UploadImageResult> {
  const config = getConfig();
  const url = `${config.base_url}/notes/${noteId}/images`;

  const fileData = readFileSync(imagePath);
  const fileName = basename(imagePath);

  // Build multipart form data manually (Node 18+ fetch supports FormData)
  const formData = new FormData();
  formData.append("file", new Blob([fileData], { type: "image/png" }), fileName);
  formData.append("placeholder_id", placeholderId);
  if (alt) {
    formData.append("alt", alt);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.api_key}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FlowMind image upload error ${res.status}: ${body}`);
  }

  const result = await res.json() as Record<string, unknown>;
  const data = (result.data || result) as Record<string, unknown>;

  return {
    success: true,
    image_id: String(data.id || ""),
    placeholder_id: placeholderId,
    url: String(data.url || ""),
    replaced: Boolean(data.replaced),
  };
}
