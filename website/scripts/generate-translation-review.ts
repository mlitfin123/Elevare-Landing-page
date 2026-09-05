import fs from "node:fs";
import path from "node:path";
import english from "../locales/en/marketing.ts";
import spanish from "../locales/es-419/marketing.ts";
import portuguese from "../locales/pt-BR/marketing.ts";

type FlatValues = Map<string, string>;

function flatten(value: unknown, prefix = "", result: FlatValues = new Map()): FlatValues {
  if (typeof value === "string") {
    result.set(prefix, value);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key, result));
  }
  return result;
}

function csv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function reviewFlag(key: string, englishValue: string) {
  const value = `${key} ${englishValue}`.toLowerCase();
  const flags = [];
  if (/medical|dietetic|guarantee|judging|health outcome|competition placement/.test(value)) flags.push("LEGAL_HEALTH_REVIEW");
  if (/ai-assisted|visual analysis|recommendation/.test(value)) flags.push("AI_CLAIM_REVIEW");
  if (/app store|google play/.test(value)) flags.push("PLATFORM_COPY_REVIEW");
  if (key.includes("marketplace")) flags.push("MARKETPLACE_COPY_REVIEW");
  if (key.includes("seo")) flags.push("SEO_REVIEW");
  return flags.join("|") || "STANDARD_REVIEW";
}

const englishValues = flatten(english);
const spanishValues = flatten(spanish);
const portugueseValues = flatten(portuguese);
const rows = [["key", "english", "es-419", "pt-BR", "review_flag"].map(csv).join(",")];

for (const [key, englishValue] of englishValues) {
  rows.push([
    key,
    englishValue,
    spanishValues.get(key) ?? "",
    portugueseValues.get(key) ?? "",
    reviewFlag(key, englishValue),
  ].map(csv).join(","));
}

const output = path.join(process.cwd(), "reports", "translation-review.csv");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${rows.join("\n")}\n`);
console.log(`Wrote ${englishValues.size} translation review rows to ${output}.`);
