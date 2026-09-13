import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isLocalizedIndexingEnabled, isLocalizedMarketingPath, localizePathname, LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY, LOCALE_DETECTION_KEY, type Locale } from "./i18n/config.ts";
import { LOCALIZED_LEGAL_DOCUMENTS, LOCALIZED_LEGAL_PATHS, type LocalizedLegalDocument } from "./legal-localization-routes.ts";
import { absoluteUrl, LEGACY_SITE_ORIGINS, siteConfig } from "./site.ts";

const TOKENS = /<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<[^>]+>|[^<]+/gi;
const UNCHANGED = /^(?:[.©]|&copy;|StageLab|Elevare|Elevare Fit LLC|mlitfin@elevarefit.org|www.elevarefit.com)$/;
const COPY = {
  en: { language: "Language", english: "English" },
  "es-419": { language: "Idioma", english: "en inglés" },
  "pt-BR": { language: "Idioma", english: "em inglês" },
};
function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
/** Only repository-authored HTML is accepted. Scripts/styles and markup never enter translation. */
export function transformLegalSegments(html: string, translate: (source: string, index: number) => string) {
  let index = 0;
  const rendered = html.replace(TOKENS, (token) => {
    if (token.startsWith("<")) {
      const attribute = /^<meta\b/i.test(token) && /\b(?:name="description"|property="og:(?:title|description)")/.test(token)
        ? "content" : /^<(?:nav|img)\b/i.test(token) ? "(?:aria-label|alt)" : null;
      if (!attribute) return token;
      return token.replace(new RegExp(`(${attribute})="([^"]+)"`), (_match, name: string, source: string) => `${name}="${translate(source, index++)}"`);
    }
    const source = token.replace(/\s+/g, " ").trim();
    if (!source || UNCHANGED.test(source)) return token;
    return `${token.match(/^\s*/)?.[0] ?? ""}${translate(source, index++)}${token.match(/\s*$/)?.[0] ?? ""}`;
  });
  return { html: rendered, count: index };
}
export function legalSourceHash(html: string) {
  return createHash("sha256").update(html.replace(/\r\n?/g, "\n")).digest("hex");
}
export function renderLocalizedLegalDocument(document: LocalizedLegalDocument, locale: Locale, root = process.cwd()) {
  const config = LOCALIZED_LEGAL_DOCUMENTS[document];
  const source = fs.readFileSync(path.join(root, config.source), "utf8").replace(/\r\n?/g, "\n");
  let html = source;
  if (locale !== "en") {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/legal/translations/manifest.json"), "utf8")) as Record<LocalizedLegalDocument, { sourceSha256: string; segments: number }>;
    if (legalSourceHash(source) !== manifest[document].sourceSha256) throw new Error(`Update legal translations after changing ${document}; source hash differs.`);
    const translations = JSON.parse(fs.readFileSync(path.join(root, "content/legal/translations", locale, `${document}.json`), "utf8")) as string[];
    const translated = transformLegalSegments(source, (_source, index) => {
      const value = translations[index];
      if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${locale} ${document} segment ${index}.`);
      return escapeHtml(value);
    });
    if (translated.count !== translations.length || translated.count !== manifest[document].segments) throw new Error(`Legal translation count mismatch: ${locale} ${document}.`);
    html = translated.html;
  }
  const route = localizePathname(config.route, locale);
  const canonical = absoluteUrl(route);
  html = html.replace(/<html lang="en">/, `<html lang="${locale}">`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]+/, `$1${canonical}`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]+/, `$1${canonical}`)
    .replace(/src="logo_transparent.png"/g, 'src="/logo_transparent.png"');
  const recognizedOrigins = new Set([siteConfig.url, ...LEGACY_SITE_ORIGINS]);
  html = html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi, (match, before, href, after, label) => {
    if (/^(?:mailto:|tel:|#)/.test(href)) return match;
    const target = new URL(href, siteConfig.url);
    if (!recognizedOrigins.has(target.origin)) return match;
    const pathname = target.pathname.replace(/\.html$/, "/");
    if (isLocalizedMarketingPath(pathname)) return `<a${before}href="${localizePathname(pathname, locale)}${target.search}${target.hash}"${after}>${label}</a>`;
    if (locale !== "en" && /^\/stagelab-.*\/$/.test(pathname) && !LOCALIZED_LEGAL_PATHS.includes(pathname as never)) {
      return `<a${before}href="${pathname}" hreflang="en"${after}>${label} <span class="legal-language-note">(${COPY[locale].english})</span></a>`;
    }
    return match;
  });
  const locales = ["en", "es-419", "pt-BR"] as const;
  const names = { en: "English", "es-419": "Español", "pt-BR": "Português" };
  const alternates = locales.map((language) => `<link rel="alternate" hreflang="${language}" href="${absoluteUrl(localizePathname(config.route, language))}">`).join("\n");
  const noindex = locale !== "en" && !isLocalizedIndexingEnabled() ? '<meta name="robots" content="noindex,follow">' : "";
  html = html.replace("</head>", `${alternates}\n<link rel="alternate" hreflang="x-default" href="${absoluteUrl(config.route)}">\n${noindex}\n<link rel="stylesheet" href="/legal-languages.css">\n</head>`);
  const switcher = `<nav class="legal-languages" aria-label="${COPY[locale].language}"><span>${COPY[locale].language}</span>${locales.map((language) => `<a href="${localizePathname(config.route, language)}" lang="${language}" hreflang="${language}"${locale === language ? ' aria-current="page"' : ""}>${names[language]}</a>`).join("")}</nav>`;
  html = html.replace("</header>", `</header>\n${switcher}`);
  // Navigation works without JavaScript. Preference storage is optional, like the site's selector.
  const rememberLanguage = `<script>document.querySelectorAll('.legal-languages a').forEach(function(link){link.addEventListener('click',function(){var locale=link.getAttribute('hreflang');try{localStorage.setItem('${LOCALE_STORAGE_KEY}',locale);sessionStorage.setItem('${LOCALE_DETECTION_KEY}','1');}catch(e){}try{document.cookie='${LOCALE_COOKIE_NAME}='+encodeURIComponent(locale)+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch(e){}});});</script>`;
  return html.replace("</body>", `${rememberLanguage}\n</body>`);
}
