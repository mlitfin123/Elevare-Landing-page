import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { localizePathname } from "../lib/i18n/config.ts";
import { productConfig } from "../lib/site.ts";
import {
  detectStageLabPlatform,
  safeStageLabCampaignFields,
  stageLabStartMessages,
  stageLabStartSwitchSearch,
} from "../lib/stagelab-start.ts";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (...segments: string[]) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

test("one start page contains both separate offers and ignores legacy offer parameters", () => {
  assert.equal(stageLabStartMessages.en.title, "Your physique. Your posing. Your prep.");
  assert.equal(stageLabStartMessages.en.freeTitle, "First physique analysis free");
  assert.equal(stageLabStartMessages.en.trialTitle, "Explore more with a 7-day trial");
  assert.match(stageLabStartMessages.en.separateOffers, /does not require a trial/);
  assert.equal(stageLabStartMessages.en.download, "Download StageLab");
  const englishRoute = read("app", "stagelab", "start", "page.tsx");
  const localizedRoute = read("app", "[locale]", "[[...slug]]", "page.tsx");
  assert.doesNotMatch(englishRoute, /searchParams|parseStageLabStartOffer/);
  assert.match(englishRoute, /StageLabStartPage locale="en"/);
  assert.match(localizedRoute, /StageLabStartPage locale=\{resolved\.locale\}/);
  assert.doesNotMatch(localizedRoute, /parseStageLabStartOffer/);
});

test("start page is indexable and discoverable in the site sitemap", () => {
  const englishRoute = read("app", "stagelab", "start", "page.tsx");
  const localizedRoute = read("app", "[locale]", "[[...slug]]", "page.tsx");
  const generator = read("scripts", "generate-sitemaps.ts");
  const sitemap = read("public", "sitemaps", "site.xml");

  assert.match(englishRoute, /localizedAlternates: true,[\s\S]*?robots: \{ index: true, follow: true \}/);
  assert.match(localizedRoute, /resolved\.page === "stagelab-start"[\s\S]*?robots: indexingEnabled[\s\S]*?\? \{ index: true, follow: true \}/);
  assert.match(generator, /"\/stagelab\/start"/);
  assert.match(generator, /"\/stagelab\/start\/"/);
  for (const prefix of ["", "es/", "pt-br/"]) {
    const url = `https://www.elevarefit.com/${prefix}stagelab/start/`;
    assert.equal(sitemap.split(`<loc>${url}</loc>`).length - 1, 1, url);
  }
});

test("both stores use the configured StageLab destinations, never website checkout", () => {
  const links = productConfig.StageLab.storeLinks ?? [];
  assert.deepEqual(links.map((link) => link.store), ["ios", "android"]);
  assert.equal(links[0].href, "https://apps.apple.com/app/stagelab-competition-prep/id6764351799");
  assert.equal(links[1].href, "https://play.google.com/store/apps/details?id=com.stagelab.app");
  const page = read("components", "stagelab", "StageLabStartPage.tsx");
  assert.match(page, /productConfig\.StageLab\.storeLinks/);
  assert.doesNotMatch(page, /quick-analysis|checkout|stripe/i);
  assert.match(page, /physiqueImage/);
  assert.match(page, /weeklyImage/);
  assert.match(page, /<StageLabStartVideo/);
});

test("campaign data only accepts constrained fields and locale switching drops obsolete offer", () => {
  const fields = safeStageLabCampaignFields(new URLSearchParams(
    "utm_source=instagram&utm_medium=paid-social&utm_campaign=prep-trial&utm_content=creative_a&email=private@example.com&utm_term=physique",
  ));
  assert.deepEqual(fields, {
    utm_source: "instagram", utm_medium: "paid-social", utm_campaign: "prep-trial", utm_content: "creative_a",
  });
  assert.deepEqual(safeStageLabCampaignFields(new URLSearchParams(
    "utm_source=https%3A%2F%2Fevil.test&utm_medium=email%40example.com&utm_campaign=phone_1234567890&utm_content=one&utm_content=two",
  )), {});
  assert.deepEqual(safeStageLabCampaignFields(new URLSearchParams("utm_campaign=personal-name&utm_content=private-id")), {});
  assert.equal(stageLabStartSwitchSearch("?offer=trial&utm_source=instagram&redirect=https://evil.test"), "?utm_source=instagram");
  assert.equal(stageLabStartSwitchSearch("?offer=trial&offer=paid&utm_source=unsafe"), "");
  assert.equal(localizePathname("/stagelab/start/?utm_source=instagram", "es-419"), "/es/stagelab/start/?utm_source=instagram");
  assert.equal(localizePathname("/stagelab/start/?utm_source=instagram", "pt-BR"), "/pt-br/stagelab/start/?utm_source=instagram");
});

test("platform detection only prioritizes an obvious mobile platform", () => {
  assert.equal(detectStageLabPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "ios");
  assert.equal(detectStageLabPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "android");
  assert.equal(detectStageLabPlatform("Mozilla/5.0 (Windows NT 10.0)"), "other");
});

test("all supported locales have the combined offer, translated examples, and disclosure", () => {
  for (const locale of ["en", "es-419", "pt-BR"] as const) {
    const messages = stageLabStartMessages[locale];
    assert.ok(messages.title && messages.description && messages.freeTitle && messages.freeBody);
    assert.ok(messages.trialTitle && messages.trialBody && messages.trialTerms && messages.separateOffers);
    assert.ok(messages.physiqueCaption && messages.posingCaption && messages.weeklyCaption);
    assert.ok(messages.physiqueAlt && messages.posingAlt && messages.weeklyAlt);
    assert.ok(messages.physiqueLabel && messages.posingLabel && messages.weeklyLabel);
    assert.ok(messages.videoHeading && messages.videoDescription && messages.videoNote);
    assert.ok(messages.playVideo && messages.videoTitle && messages.watchOnYouTube);
    assert.ok(messages.disclaimer && messages.closingTerms);
  }
  assert.match(stageLabStartMessages["es-419"].physiqueLabel, /inglés/);
  assert.match(stageLabStartMessages["pt-BR"].physiqueLabel, /inglês/);
  assert.equal(stageLabStartMessages.en.disclaimer, "AI feedback can be inaccurate. No one-to-one coaching included.");
});

test("real screenshots and the weekly check-in video are used", () => {
  const page = read("components", "stagelab", "StageLabStartPage.tsx");
  for (const image of [
    "mens-physique-classic-physique-prep-4-weeks-out/recommendation-visual.png",
    "mens-physique-classic-physique-prep-10-weeks-out/recommendation.png",
  ]) {
    assert.ok(fs.existsSync(path.join(projectRoot, "public", "blog-posts", image)));
  }
  assert.ok(fs.existsSync(path.join(projectRoot, "public", "stagelab", "posing-analysis-example.jpg")));
  assert.ok(fs.existsSync(path.join(projectRoot, "public", "stagelab", "weekly-check-in-video-poster.webp")));
  assert.equal((page.match(/<StageLabStartImage/g) ?? []).length, 3);
  const video = read("components", "stagelab", "StageLabStartVideo.tsx");
  assert.match(video, /videoId = "uSHrNGqia-M"/);
  assert.match(video, /youtube-nocookie\.com\/embed/);
  assert.match(video, /playing \? \(/);
  assert.match(video, /stagelab_start_video_play_clicked/);
  assert.match(stageLabStartMessages.en.weeklyAlt, /sessions changing from three to four/);
});

test("analytics tracks a single view and both store placements without offer variants", () => {
  const actions = read("components", "stagelab", "StageLabStartActions.tsx");
  assert.match(actions, /stagelab_start_viewed/);
  assert.match(actions, /stagelab_start_store_clicked/);
  assert.match(actions, /stagelab_start_image_failed/);
  assert.match(actions, /placement === "hero"/);
  assert.match(actions, /placement,/);
  assert.match(actions, /page_id: "stagelab_start"/);
  assert.doesNotMatch(actions, /stagelab_start_offer_shown|install_completed|trial_activated|analysis_completed/);
});
