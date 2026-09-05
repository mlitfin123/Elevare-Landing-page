import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type FlatValues = Map<string, string>;

function loadDictionary(filePath: string): unknown {
  const source = fs.readFileSync(filePath, "utf8").replace(/^import .*;\r?\n/gm, "");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filePath,
  }).outputText;
  const exportsObject: Record<string, unknown> = {};
  const moduleObject = { exports: exportsObject };
  const evaluate = new Function("exports", "module", "QUICK_ANALYSIS_PRICE_DISPLAY", javascript);
  evaluate(exportsObject, moduleObject, "$0.99 USD");
  return exportsObject.default;
}

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

function reviewDetails(key: string, englishValue: string) {
  const searchable = `${key} ${englishValue}`.toLowerCase();
  const flags: string[] = [];
  if (/consent|privacy|terms|disclaimer|medical|stored|discard|retain|72 hour|charged|purchase/.test(searchable)) {
    flags.push("LEGAL_OR_CONSENT_REVIEW");
  }
  if (/conditioning|muscularity|symmetry|body-fat|body fat|stage|division|judge|posing|prep|physique/.test(searchable)) {
    flags.push("PHYSIQUE_TERMINOLOGY_REVIEW");
  }
  if (/stripe|payment|checkout|app store|google play|entitlement|subscription/.test(searchable)) {
    flags.push("COMMERCE_OR_PROVIDER_REVIEW");
  }
  if (/seo|title|description/.test(key.toLowerCase())) flags.push("SEO_REVIEW");
  return flags.length > 0 ? flags.join("|") : "STANDARD_LANGUAGE_REVIEW";
}

function sectionForKey(key: string) {
  const [area, section] = key.replaceAll(/\[\d+\]/g, "").split(".");
  return [area, section].filter(Boolean).join(" / ");
}

const root = process.cwd();
const english = flatten(loadDictionary(path.join(root, "locales", "en", "quick-analysis.ts")));
const spanish = flatten(loadDictionary(path.join(root, "locales", "es-419", "quick-analysis.ts")));
const portuguese = flatten(loadDictionary(path.join(root, "locales", "pt-BR", "quick-analysis.ts")));

const englishKeys = [...english.keys()];
if (englishKeys.length === 0 || englishKeys.some((key) => !spanish.has(key) || !portuguese.has(key))) {
  throw new Error("Quick Analysis translation dictionaries do not have matching keys.");
}

const rows = [[
  "key",
  "page_or_section",
  "english",
  "es-419",
  "pt-BR",
  "review_flag",
  "human_review_status",
].map(csv).join(",")];

for (const key of englishKeys) {
  const englishValue = english.get(key) ?? "";
  rows.push([
    key,
    sectionForKey(key),
    englishValue,
    spanish.get(key) ?? "",
    portuguese.get(key) ?? "",
    reviewDetails(key, englishValue),
    "PENDING",
  ].map(csv).join(","));
}

const output = path.join(root, "reports", "quick-analysis-translation-review.csv");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${rows.join("\n")}\n`);
console.log(`Wrote ${englishKeys.length} Quick Analysis review rows to ${output}.`);
