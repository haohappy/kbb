import { publishNote } from "../utils/flowmind.js";

export interface PublishInput {
  title: string;
  content: string;
  tags?: string[];
  auto_share?: boolean;
}

export async function publish(input: PublishInput) {
  return publishNote(input.title, input.content, input.tags, input.auto_share);
}
