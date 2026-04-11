import { listNotes } from "../utils/flowmind.js";

export interface ListInput {
  tag?: string;
  page?: number;
  limit?: number;
}

export async function list(input: ListInput) {
  return listNotes(input.page || 1, input.limit || 20, input.tag);
}
