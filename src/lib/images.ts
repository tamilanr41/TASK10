import { randomBytes } from "node:crypto";
import path from "node:path";
import fsp from "node:fs/promises";
import fs from "node:fs";
import Jimp from "jimp";
import { UPLOAD_ROOT } from "./paths";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
export const MIN_IMAGE_DIMENSION = 64;
export const SUGGESTED_IMAGE_DIMENSION = 400;

export class ImageValidationError extends Error {
  code: string;
  constructor(message: string, code = "INVALID_IMAGE") {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

export type ImageInfo = {
  width: number;
  height: number;
  extension: string;
  size_bytes: number;
  original_name: string;
  quality_ok: boolean;
};

export async function validateImageBuffer(
  buffer: Buffer,
  originalName: string
): Promise<ImageInfo> {
  if (!buffer || buffer.length === 0) {
    throw new ImageValidationError("The uploaded file is empty.", "EMPTY_FILE");
  }

  const ext = originalName.includes(".")
    ? originalName.split(".").pop()!.toLowerCase()
    : "";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new ImageValidationError(
      `Unsupported file type '${ext}'. Please upload a JPG, JPEG or PNG image.`,
      "UNSUPPORTED_TYPE"
    );
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      `Image is too large (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). ` +
        `Maximum allowed size is ${MAX_IMAGE_SIZE_MB} MB.`,
      "FILE_TOO_LARGE"
    );
  }

  let image: Jimp;
  try {
    image = await Jimp.read(buffer);
  } catch {
    throw new ImageValidationError(
      "The file appears to be corrupted or is not a valid image.",
      "CORRUPTED_FILE"
    );
  }

  const width = image.getWidth();
  const height = image.getHeight();
  if (!width || !height) {
    throw new ImageValidationError(
      "The image could not be read. Please try another image.",
      "UNREADABLE"
    );
  }
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    throw new ImageValidationError(
      `Image resolution too low (${width}x${height}). ` +
        `Please upload an image of at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels.`,
      "LOW_RESOLUTION"
    );
  }

  return {
    width,
    height,
    extension: ext,
    size_bytes: buffer.length,
    original_name: originalName,
    quality_ok:
      width >= SUGGESTED_IMAGE_DIMENSION && height >= SUGGESTED_IMAGE_DIMENSION,
  };
}

export async function saveImageBuffer(
  buffer: Buffer,
  subfolder: string
): Promise<string> {
  const targetDir = path.join(UPLOAD_ROOT, subfolder);
  await fsp.mkdir(targetDir, { recursive: true });

  const filename = `upload_${randomBytes(8).toString("hex")}.jpg`;
  const relative = path.join(subfolder, filename).replace(/\\/g, "/");

  const image = await Jimp.read(buffer);
  image.quality(90);
  await image.getBufferAsync(Jimp.MIME_JPEG).then((out) =>
    fsp.writeFile(path.join(UPLOAD_ROOT, relative), out)
  );

  return relative;
}

export async function imageToBytes(relativePath: string, maxSide = 600): Promise<Buffer | null> {
  const abs = path.join(UPLOAD_ROOT, relativePath);
  try {
    if (!fs.existsSync(abs)) return null;
    const image = await Jimp.read(abs);
    if (image.getWidth() > maxSide || image.getHeight() > maxSide) {
      image.scaleToFit(maxSide, maxSide);
    }
    image.quality(80);
    return await image.getBufferAsync(Jimp.MIME_JPEG);
  } catch {
    return null;
  }
}

export { UPLOAD_ROOT };