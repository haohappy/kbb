import { publishNote } from "../utils/flowmind.js";

export interface PublishInput {
  title: string;
  content: string;
  tags?: string[];
}

export async function publish(input: PublishInput) {
  return publishNote(input.title, input.content, input.tags);
}
