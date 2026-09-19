import { getPosingFrameTimestamps, POSING_RUNTIME } from "./posing-runtime.ts";
import {
  POSING_VIDEO_MAX_BYTES,
  POSING_VIDEO_MAX_SECONDS,
  POSING_VIDEO_MIME_TYPES,
  POSING_VIDEO_MIN_SECONDS,
} from "./stage-analysis.ts";

const FRAME_MAX_EDGE = 1_280;
const FRAME_QUALITY = 0.82;

export type PreparedPosingFrame = {
  index: number;
  timestampMs: number;
  width: number;
  height: number;
  blob: Blob;
};

export type PreparedPosingVideo = {
  file: File;
  durationSeconds: number;
  mimeType: (typeof POSING_VIDEO_MIME_TYPES)[number];
  frames: PreparedPosingFrame[];
};

export class PosingVideoValidationError extends Error {
  readonly code: "type" | "size" | "duration" | "decode" | "frames";

  constructor(code: "type" | "size" | "duration" | "decode" | "frames", message: string) {
    super(message);
    this.code = code;
    this.name = "PosingVideoValidationError";
  }
}

export const getCanonicalPosingFrameTimestamps = getPosingFrameTimestamps;

/** Supabase signed uploads expect Blob bodies as multipart form data. */
export function createPosingSignedUploadRequest(body: Blob, capabilityHeaders: Record<string, string>) {
  const headers = new Headers(capabilityHeaders);
  headers.delete("content-type");
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", body, body instanceof File ? body.name : "frame.jpg");
  return { headers, body: form };
}

/** Safari can serialize canvas Blobs inconsistently in multipart requests. */
export async function createPosingFrameSignedUploadRequest(body: Blob, capabilityHeaders: Record<string, string>) {
  const headers = new Headers(capabilityHeaders);
  headers.set("content-type", body.type || "image/jpeg");
  headers.set("cache-control", "max-age=3600");
  return { headers, body: await body.arrayBuffer() };
}

function getVideoMimeType(file: File): (typeof POSING_VIDEO_MIME_TYPES)[number] | null {
  if (POSING_VIDEO_MIME_TYPES.includes(file.type as (typeof POSING_VIDEO_MIME_TYPES)[number])) {
    return file.type as (typeof POSING_VIDEO_MIME_TYPES)[number];
  }
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const byExtension: Record<string, (typeof POSING_VIDEO_MIME_TYPES)[number]> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
    "3gp": "video/3gpp",
    "3gpp": "video/3gpp",
  };
  return extension ? byExtension[extension] ?? null : null;
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    const handleEvent = () => { cleanup(); resolve(); };
    const handleError = () => { cleanup(); reject(new PosingVideoValidationError("decode", "This video could not be read in your browser.")); };
    const timeout = setTimeout(() => { cleanup(); reject(new PosingVideoValidationError("decode", "Video preparation timed out.")); }, POSING_RUNTIME.frameDecodeTimeoutMs);
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function canvasBlobAttempt(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/jpeg", FRAME_QUALITY);
    } catch {
      resolve(null);
    }
  });
}

function canvasDataUrlBlob(canvas: HTMLCanvasElement) {
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", FRAME_QUALITY);
    const separator = dataUrl.indexOf(",");
    if (separator < 0) return null;
    const bytes = Uint8Array.from(atob(dataUrl.slice(separator + 1)), (character) => character.charCodeAt(0));
    return bytes.length ? new Blob([bytes], { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}

export async function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const blob = await canvasBlobAttempt(canvas);
    if (blob?.size) return blob;
    await nextAnimationFrame();
  }
  const fallback = canvasDataUrlBlob(canvas);
  if (fallback) return fallback;
  throw new PosingVideoValidationError("frames", "We could not prepare frames from this video.");
}

export async function preparePosingVideo(file: File): Promise<PreparedPosingVideo> {
  const mimeType = getVideoMimeType(file);
  if (!mimeType) {
    throw new PosingVideoValidationError("type", "Use an MP4, MOV, M4V, WebM, or 3GPP video.");
  }
  if (file.size <= 0 || file.size > POSING_VIDEO_MAX_BYTES) {
    throw new PosingVideoValidationError("size", "Choose a video smaller than 180 MiB.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;

  try {
    const metadataLoaded = waitForVideoEvent(video, "loadedmetadata");
    video.src = objectUrl;
    await metadataLoaded;
    const durationSeconds = video.duration;
    if (!Number.isFinite(durationSeconds) || durationSeconds < POSING_VIDEO_MIN_SECONDS || durationSeconds > POSING_VIDEO_MAX_SECONDS) {
      throw new PosingVideoValidationError("duration", "Choose a video between 5 and 45 seconds.");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new PosingVideoValidationError("decode", "This video does not contain a readable picture track.");
    }

    const scale = Math.min(1, FRAME_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false }) ?? canvas.getContext("2d");
    if (!context) throw new PosingVideoValidationError("frames", "Your browser could not prepare video frames.");

    const frames: PreparedPosingFrame[] = [];
    const timestamps = getCanonicalPosingFrameTimestamps(durationSeconds);
    for (const [index, timestampMs] of timestamps.entries()) {
      const seekPromise = waitForVideoEvent(video, "seeked");
      video.currentTime = Math.min(durationSeconds - 0.001, timestampMs / 1_000);
      await seekPromise;
      context.drawImage(video, 0, 0, width, height);
      frames.push({ index, timestampMs, width, height, blob: await canvasToJpegBlob(canvas) });
    }

    return { file, durationSeconds, mimeType, frames };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
