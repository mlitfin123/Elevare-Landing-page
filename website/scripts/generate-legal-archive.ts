import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { LEGAL_DOCUMENTS } from "../lib/legal.ts";
import { archiveFileToProductionRoute } from "../lib/legal-routes.ts";

const projectRoot = process.cwd();
const isInitialize = process.argv.includes("--initialize");

type LegalDocumentRecord = {
  documentKey: string;
  version: string;
  effectiveDate: string;
  archiveFilePath: string;
  archivePath: string;
  sha256: string;
};

function hashContent(content: Buffer) {
  // Git may check text files out with CRLF on Windows and LF in Linux builds.
  const normalizedContent = content.toString("utf8").replace(/\r\n?/g, "\n");
  return createHash("sha256").update(normalizedContent, "utf8").digest("hex");
}

async function buildRecord(document: (typeof LEGAL_DOCUMENTS)[keyof typeof LEGAL_DOCUMENTS]) {
  const sourceFilename = document.key === "terms_of_service" ? "terms-of-service.html" : "privacy-policy.html";
  const sourcePath = path.join(projectRoot, "content", "legal", sourceFilename);
  const archiveFilePath = path.join(projectRoot, "public", document.archiveFilePath.replace(/^\//, ""));
  const activeRouteFilePath = path.join(
    projectRoot,
    "public",
    document.activePath.replace(/^\//, ""),
    "index.html",
  );
  const sourceContent = await fs.readFile(sourcePath);

  if (isInitialize) {
    await fs.mkdir(path.dirname(archiveFilePath), { recursive: true });
    try {
      const archivedContent = await fs.readFile(archiveFilePath);
      if (!archivedContent.equals(sourceContent)) {
        throw new Error(`Archived ${document.key} content differs from the active document for version ${document.version}. Bump the legal version instead of overwriting history.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.writeFile(archiveFilePath, sourceContent);
    }

    await fs.mkdir(path.dirname(activeRouteFilePath), { recursive: true });
    await fs.writeFile(activeRouteFilePath, sourceContent);
  }

  const archivedContent = await fs.readFile(archiveFilePath);
  if (!archivedContent.equals(sourceContent)) {
    throw new Error(`Active ${document.key} content changed without a legal version bump.`);
  }

  const activeRouteContent = await fs.readFile(activeRouteFilePath);
  if (!activeRouteContent.equals(sourceContent)) {
    throw new Error(`Generated clean route for ${document.key} is stale. Run npm run legal:archive.`);
  }

  const derivedArchiveRoute = archiveFileToProductionRoute(document.archiveFilePath);
  if (derivedArchiveRoute !== document.archivePath || document.archivePath.endsWith(".html")) {
    throw new Error(`Archive route for ${document.key} does not match its production-equivalent static route.`);
  }

  return {
    documentKey: document.key,
    version: document.version,
    effectiveDate: document.effectiveDate,
    archiveFilePath: document.archiveFilePath,
    archivePath: document.archivePath,
    sha256: hashContent(archivedContent),
  } satisfies LegalDocumentRecord;
}

const records = await Promise.all(Object.values(LEGAL_DOCUMENTS).map(buildRecord));
const manifestPath = path.join(projectRoot, "public", "legal", "legal-document-versions.json");
const manifest = `${JSON.stringify({ generatedFrom: "immutable legal archive", documents: records }, null, 2)}\n`;

if (isInitialize) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, manifest);
} else {
  const existingManifest = await fs.readFile(manifestPath, "utf8");
  if (existingManifest !== manifest) {
    throw new Error("Legal archive manifest is stale. Run npm run legal:archive after intentionally versioning the documents.");
  }
}

console.log(`${isInitialize ? "Generated" : "Verified"} ${records.length} immutable legal document records.`);
