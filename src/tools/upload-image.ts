import { uploadNoteImage } from "../utils/flowmind.js";

export interface UploadImageInput {
  note_id: string;
  image_path: string;
  placeholder_id: string;
  alt?: string;
}

export async function uploadImage(input: UploadImageInput) {
  const imgPath = input.image_path.replace(/^~/, process.env.HOME || "");
  return uploadNoteImage(input.note_id, imgPath, input.placeholder_id, input.alt);
}
