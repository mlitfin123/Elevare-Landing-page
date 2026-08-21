import "server-only";

import sharp from "sharp";
import {
  QUICK_ANALYSIS_MAX_IMAGE_BYTES,
  QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MAX_TOTAL_BYTES,
  QUICK_ANALYSIS_MIN_PHOTOS,
} from "./quick-analysis.ts";
import { QuickAnalysisServerError } from "./quick-analysis-server.ts";

const SUPPORTED_INPUT_FORMATS = new Set(["jpeg", "png", "webp"]);
const MIN_IMAGE_DIMENSION = 280;

export type NormalizedQuickAnalysisImage = {
  bytes: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  sourceFormat: string;
};

export type NormalizedQuickAnalysisUpload = {
  images: NormalizedQuickAnalysisImage[];
  clear: () => void;
};

function clearBuffers(buffers: Buffer[]) {
  for (const buffer of buffers) buffer.fill(0);
  buffers.length = 0;
}

export async function normalizeQuickAnalysisImages(files: File[]): Promise<NormalizedQuickAnalysisUpload> {
  if (files.length < QUICK_ANALYSIS_MIN_PHOTOS || files.length > QUICK_ANALYSIS_MAX_PHOTOS) {
    throw new QuickAnalysisServerError(
      "INVALID_PHOTO_COUNT",
      `Choose ${QUICK_ANALYSIS_MIN_PHOTOS}-${QUICK_ANALYSIS_MAX_PHOTOS} current physique photos.`,
    );
  }

  const originalBuffers: Buffer[] = [];
  const normalizedBuffers: Buffer[] = [];
  const images: NormalizedQuickAnalysisImage[] = [];

  try {
    let totalInputBytes = 0;
    let totalOutputBytes = 0;

    for (const file of files) {
      if (!(file instanceof File) || file.size <= 0 || file.size > QUICK_ANALYSIS_MAX_IMAGE_BYTES) {
        throw new QuickAnalysisServerError(
          "INVALID_IMAGE_SIZE",
          "Each photo must be a valid image no larger than 1.5 MB after preparation.",
        );
      }

      totalInputBytes += file.size;
      if (totalInputBytes > QUICK_ANALYSIS_MAX_TOTAL_BYTES) {
        throw new QuickAnalysisServerError(
          "UPLOAD_TOO_LARGE",
          "The prepared photos are too large. Choose fewer or smaller photos and try again.",
          413,
        );
      }

      const original = Buffer.from(await file.arrayBuffer());
      originalBuffers.push(original);
      const pipeline = sharp(original, {
        failOn: "warning",
        limitInputPixels: 50_000_000,
        sequentialRead: true,
      });
      const metadata = await pipeline.metadata();
      const sourceFormat = metadata.format ?? "unknown";

      if (!SUPPORTED_INPUT_FORMATS.has(sourceFormat) || !metadata.width || !metadata.height) {
        throw new QuickAnalysisServerError(
          "UNSUPPORTED_IMAGE",
          "Use a valid JPEG, PNG, or WebP photo.",
        );
      }
      if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
        throw new QuickAnalysisServerError(
          "IMAGE_TOO_SMALL",
          "Each photo needs enough detail for a visual assessment. Choose a clearer, larger image.",
        );
      }

      const normalized = await sharp(original, {
        failOn: "warning",
        limitInputPixels: 50_000_000,
        sequentialRead: true,
      })
        .rotate()
        .resize({
          width: QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
          height: QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#11131a" })
        .jpeg({ quality: 82, chromaSubsampling: "4:2:0", mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      normalizedBuffers.push(normalized.data);
      totalOutputBytes += normalized.data.byteLength;
      if (totalOutputBytes > QUICK_ANALYSIS_MAX_TOTAL_BYTES) {
        throw new QuickAnalysisServerError(
          "NORMALIZED_UPLOAD_TOO_LARGE",
          "The prepared photos are still too large. Choose fewer photos and try again.",
          413,
        );
      }

      images.push({
        bytes: normalized.data,
        mimeType: "image/jpeg",
        width: normalized.info.width,
        height: normalized.info.height,
        sourceFormat,
      });
    }

    return {
      images,
      clear: () => {
        clearBuffers(originalBuffers);
        clearBuffers(normalizedBuffers);
        images.length = 0;
      },
    };
  } catch (error) {
    clearBuffers(originalBuffers);
    clearBuffers(normalizedBuffers);
    images.length = 0;
    if (error instanceof QuickAnalysisServerError) throw error;
    throw new QuickAnalysisServerError(
      "INVALID_IMAGE",
      "One or more photos could not be prepared. Use clear JPEG, PNG, or WebP photos.",
    );
  }
}
