export const TRUST_EVIDENCE_MAX_BYTES = 8 * 1024 * 1024;

export const TRUST_EVIDENCE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateTrustEvidenceFile(file: File) {
  const extension = TRUST_EVIDENCE_EXTENSIONS[file.type];
  if (!extension) {
    return { valid: false as const, error: "Choose a PDF, JPG, PNG, or WebP file." };
  }
  if (file.size <= 0 || file.size > TRUST_EVIDENCE_MAX_BYTES) {
    return { valid: false as const, error: "Choose a file smaller than 8 MB." };
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureMatches = file.type === "application/pdf"
    ? startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
    : file.type === "image/jpeg"
      ? startsWith(bytes, [0xff, 0xd8, 0xff])
      : file.type === "image/png"
        ? startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
          && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (!signatureMatches) {
    return { valid: false as const, error: "The file contents do not match the selected file type." };
  }

  return { valid: true as const, extension };
}
