import {
  QUICK_ANALYSIS_MAX_IMAGE_BYTES,
  QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MAX_TOTAL_BYTES,
  QUICK_ANALYSIS_MIN_PHOTOS,
  QUICK_ANALYSIS_PHOTO_VIEW_LABELS,
  validateQuickAnalysisPhotoViews,
  type QuickAnalysisPhotoView,
} from "@/lib/quick-analysis";

const SUPPORTED_BROWSER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 25_000_000;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This photo could not be prepared."))),
      "image/jpeg",
      quality,
    );
  });
}

async function decodePhotoWithOrientation(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older implementations use EXIF orientation by default but may reject the options object.
    return createImageBitmap(file);
  }
}

export type QuickAnalysisClientPhoto = {
  view: QuickAnalysisPhotoView;
  file: File;
};

export async function prepareQuickAnalysisPhotos(photos: QuickAnalysisClientPhoto[]) {
  const viewValidation = validateQuickAnalysisPhotoViews(photos.map((photo) => photo.view));
  if (!viewValidation.valid || photos.length < QUICK_ANALYSIS_MIN_PHOTOS || photos.length > QUICK_ANALYSIS_MAX_PHOTOS) {
    throw new Error("Add one front, side, and back photo, with up to two optional additional views.");
  }

  const prepared: QuickAnalysisClientPhoto[] = [];
  let totalBytes = 0;

  for (const { view, file } of photos) {
    const viewLabel = QUICK_ANALYSIS_PHOTO_VIEW_LABELS[view];
    if (!SUPPORTED_BROWSER_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
      throw new Error(`Replace your ${viewLabel.toLowerCase()} photo with a valid JPEG, PNG, or WebP image no larger than 25 MB.`);
    }

    let bitmap: ImageBitmap | null = null;
    const canvas = document.createElement("canvas");
    try {
      bitmap = await decodePhotoWithOrientation(file);
      if (bitmap.width < 280 || bitmap.height < 280) {
        throw new Error(`Your ${viewLabel.toLowerCase()} photo needs more visual detail. Replace it with a clearer, larger image.`);
      }

      const scale = Math.min(1, QUICK_ANALYSIS_MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("This browser could not prepare the selected photos.");
      context.fillStyle = "#11131a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let quality = 0.84;
      let blob = await canvasToJpeg(canvas, quality);
      while (blob.size > QUICK_ANALYSIS_MAX_IMAGE_BYTES && quality > 0.56) {
        quality -= 0.08;
        blob = await canvasToJpeg(canvas, quality);
      }
      if (blob.size > QUICK_ANALYSIS_MAX_IMAGE_BYTES) {
        throw new Error("One photo could not be reduced enough. Choose a smaller image.");
      }

      totalBytes += blob.size;
      if (totalBytes > QUICK_ANALYSIS_MAX_TOTAL_BYTES) {
        throw new Error("The prepared photos are too large together. Choose fewer or smaller photos.");
      }
      prepared.push({
        view,
        file: new File([blob], `${view}.jpg`, { type: "image/jpeg" }),
      });
    } finally {
      bitmap?.close();
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  return prepared;
}
