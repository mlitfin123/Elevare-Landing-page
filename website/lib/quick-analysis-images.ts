import "server-only";

import sharp from "sharp";
import {
  QUICK_ANALYSIS_MAX_IMAGE_BYTES,
  QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MAX_TOTAL_BYTES,
  QUICK_ANALYSIS_MIN_PHOTOS,
  QUICK_ANALYSIS_PHOTO_VIEWS,
  QUICK_ANALYSIS_PHOTO_VIEW_LABELS,
  validateQuickAnalysisPhotoViews,
  type QuickAnalysisPhotoView,
} from "./quick-analysis.ts";
import { QuickAnalysisServerError } from "./quick-analysis-server.ts";

const SUPPORTED_INPUT_FORMATS = new Set(["jpeg", "png", "webp"]);
const MIN_IMAGE_DIMENSION = 280;

export type NormalizedQuickAnalysisImage = {
  view: QuickAnalysisPhotoView;
  bytes: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  sourceFormat: string;
};

export type QuickAnalysisPhotoInput = {
  view: QuickAnalysisPhotoView;
  file: File;
};

export type NormalizedQuickAnalysisUpload = {
  images: NormalizedQuickAnalysisImage[];
  clear: () => void;
};

function clearBuffers(buffers: Buffer[]) {
  for (const buffer of buffers) buffer.fill(0);
  buffers.length = 0;
}

export function parseQuickAnalysisPhotoFormData(form: FormData): QuickAnalysisPhotoInput[] {
  const photoEntries = Array.from(form.entries()).filter(([key]) => key.startsWith("photo_"));
  const inputs = photoEntries
    .map(([key, value]) => ({
      view: key.slice("photo_".length),
      file: value,
    }))
    .filter((entry): entry is { view: string; file: File } => entry.file instanceof File);
  const validation = validateQuickAnalysisPhotoViews(inputs.map((input) => input.view));

  if (validation.missing.length > 0) {
    const view = validation.missing[0];
    throw new QuickAnalysisServerError(
      `MISSING_${view.toUpperCase()}_PHOTO`,
      `Add a ${QUICK_ANALYSIS_PHOTO_VIEW_LABELS[view].toLowerCase()} photo before starting your analysis. Your payment is still valid.`,
    );
  }
  if (validation.exceedsMaximum || photoEntries.length > QUICK_ANALYSIS_MAX_PHOTOS) {
    throw new QuickAnalysisServerError("TOO_MANY_PHOTOS", `Choose no more than ${QUICK_ANALYSIS_MAX_PHOTOS} photos.`);
  }
  if (validation.hasUnknownView || inputs.length !== photoEntries.length) {
    throw new QuickAnalysisServerError("INVALID_PHOTO_VIEW", "Use the labeled front, side, back, and optional photo slots.");
  }
  if (validation.duplicates.length > 0) {
    throw new QuickAnalysisServerError("DUPLICATE_PHOTO_VIEW", "Choose only one photo for each labeled view.");
  }

  return QUICK_ANALYSIS_PHOTO_VIEWS.flatMap((view) => {
    const input = inputs.find((candidate) => candidate.view === view);
    return input ? [{ view, file: input.file }] : [];
  });
}

export async function normalizeQuickAnalysisImages(inputs: QuickAnalysisPhotoInput[]): Promise<NormalizedQuickAnalysisUpload> {
  const viewValidation = validateQuickAnalysisPhotoViews(inputs.map((input) => input.view));
  if (!viewValidation.valid || inputs.length < QUICK_ANALYSIS_MIN_PHOTOS || inputs.length > QUICK_ANALYSIS_MAX_PHOTOS) {
    throw new QuickAnalysisServerError(
      "INVALID_PHOTO_COUNT",
      "Add one front, side, and back photo, with up to two optional additional views.",
    );
  }

  const originalBuffers: Buffer[] = [];
  const normalizedBuffers: Buffer[] = [];
  const images: NormalizedQuickAnalysisImage[] = [];
  let currentView: QuickAnalysisPhotoView | null = null;

  try {
    let totalInputBytes = 0;
    let totalOutputBytes = 0;

    for (const { view, file } of inputs) {
      currentView = view;
      const viewLabel = QUICK_ANALYSIS_PHOTO_VIEW_LABELS[view];
      if (!(file instanceof File) || file.size <= 0 || file.size > QUICK_ANALYSIS_MAX_IMAGE_BYTES) {
        throw new QuickAnalysisServerError(
          "INVALID_IMAGE_SIZE",
          `We couldn't prepare your ${viewLabel.toLowerCase()} photo. Replace it with a valid prepared image and try again. Your payment is still valid.`,
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
          `We couldn't read your ${viewLabel.toLowerCase()} photo. Replace it with a JPEG, PNG, or WebP image and try again. Your payment is still valid.`,
        );
      }
      if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
        throw new QuickAnalysisServerError(
          "IMAGE_TOO_SMALL",
          `Your ${viewLabel.toLowerCase()} photo needs more detail. Replace it with a clearer, larger image and try again. Your payment is still valid.`,
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
        view,
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
    const viewName = currentView ? QUICK_ANALYSIS_PHOTO_VIEW_LABELS[currentView].toLowerCase() : "selected";
    throw new QuickAnalysisServerError(
      "INVALID_IMAGE",
      `We couldn't prepare your ${viewName} photo. Please replace it and try again. Your payment is still valid.`,
    );
  }
}
