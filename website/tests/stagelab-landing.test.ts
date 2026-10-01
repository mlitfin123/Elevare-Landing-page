import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { stageLabLandingMessages, STAGELAB_LANDING_FEATURES } from "../lib/stagelab-landing.ts";
import { STAGELAB_LANDING_MEDIA } from "../lib/stagelab-landing-media.ts";

const projectRoot = process.cwd();
const read = (...segments: string[]) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  if (Array.isArray(value)) return value.flatMap((entry, index) => leafKeys(entry, `${prefix}[${index}]`));
  return Object.entries(value).flatMap(([key, entry]) => leafKeys(entry, prefix ? `${prefix}.${key}` : key));
}

test("StageLab positioning is localized with matching message structures", () => {
  const englishKeys = leafKeys(stageLabLandingMessages.en).sort();
  for (const locale of ["es-419", "pt-BR"] as const) {
    assert.deepEqual(leafKeys(stageLabLandingMessages[locale]).sort(), englishKeys);
  }

  assert.equal(stageLabLandingMessages.en.hero.title, "Your competition prep, physique progress, and posing—in one place.");
  assert.equal(stageLabLandingMessages.en.hero.support, "Built for competitive physique athletes and prep coaches.");
  assert.deepEqual(STAGELAB_LANDING_FEATURES, ["progress", "posing", "recommendations", "daily", "roadmap", "coaches"]);
  for (const messages of Object.values(stageLabLandingMessages)) {
    assert.equal(leafKeys(messages).some((key) => {
      const parts = key.replace(/\[(\d+)\]/g, ".$1").split(".");
      let current: unknown = messages;
      for (const part of parts) current = (current as Record<string, unknown>)[part];
      return typeof current === "string" && current.trim().length === 0;
    }), false);
  }
});

test("enabled StageLab media is genuine local media", () => {
  const imageKeys = ["hero", "physiqueReview", "posingReview", "weeklyRecommendation", "coachDashboard", "showDayPlan", "progressComparison", "athleteDashboard"] as const;
  for (const key of imageKeys) {
    const media = STAGELAB_LANDING_MEDIA[key];
    assert.equal(media.enabled, true);
    assert.equal(fs.existsSync(path.join(projectRoot, "public", media.src.slice(1))), true, media.src);
    assert.ok(media.width > 0 && media.height > 0);
  }
  assert.equal(fs.existsSync(path.join(projectRoot, "public", STAGELAB_LANDING_MEDIA.demoVideo.poster.slice(1))), true);
});

test("StageLab page keeps store analytics, standalone reports, real demo, and coach routing", () => {
  const page = read("components", "stagelab", "StageLabLandingPage.tsx");
  const localizedPage = read("components", "localization", "LocalizedProductPage.tsx");
  const englishRoute = read("app", "stagelab", "page.tsx");

  assert.match(page, /ProductCtaButtons product="StageLab" context="stagelab_hero"/);
  assert.match(page, /ProductCtaButtons product="StageLab" context="stagelab_final"/);
  assert.match(page, /StageAnalysisProducts locale=\{locale\} source="stagelab" presentation="standalone-reports"/);
  assert.match(page, /localizePathname\("\/stagelab\/coaches\/start\/", locale\)/);
  assert.match(page, /StageLabLandingVideo/);
  assert.match(page, /StageLabMethodology locale=\{locale\} collapsed/);
  assert.match(localizedPage, /product === "stagelab"\) return <StageLabLandingPage locale=\{locale\}/);
  assert.match(englishRoute, /StageLabLandingPage locale="en"/);
});
