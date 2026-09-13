import { legalDocumentResponse } from "@/lib/legal-document-response";
export const dynamic = "force-static";
export function GET() { return legalDocumentResponse("privacy"); }
