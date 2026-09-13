import { legalLocaleParams, localizedLegalResponse } from "@/lib/legal-document-response";
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = legalLocaleParams;
export function GET(_request: Request, context: { params: Promise<{ locale: string }> }) { return localizedLegalResponse("stagePrivacy", context); }
