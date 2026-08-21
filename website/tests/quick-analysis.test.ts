import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MIN_PHOTOS,
  calculateStageReadinessScore,
  type QuickAnalysisContext,
  type QuickAnalysisResult,
} from "../lib/quick-analysis.ts";
import { normalizeQuickAnalysisImages } from "../lib/quick-analysis-images.ts";
import {
  QUICK_ANALYSIS_SYSTEM_PROMPT,
  QuickAnalysisProviderError,
  requestQuickAnalysisFromOpenAI,
} from "../lib/quick-analysis-openai.ts";
import { parseQuickAnalysisContext, parseQuickAnalysisResult } from "../lib/quick-analysis-schema.ts";
import { deriveQuickAnalysisToken, hashQuickAnalysisToken } from "../lib/quick-analysis-server.ts";
import {
  validatePaidQuickAnalysisSession,
  verifyConfiguredQuickAnalysisPrice,
} from "../lib/quick-analysis-stripe.ts";

const projectRoot = process.cwd();
const context: QuickAnalysisContext = {
  analysisMode: "competition_prep",
  division: "Men's Physique",
  competitionStatus: "preparing",
  weeksOut: 10,
  optionalContext: "Current posing snapshot.",
  ageConfirmed: true,
  aiConsentConfirmed: true,
};
const result: QuickAnalysisResult = {
  analysis_mode: "competition_prep",
  stage_readiness_score: null,
  stage_readiness_category: null,
  stage_condition_distance: null,
  conditioning_score: null,
  muscularity_score: null,
  symmetry_score: null,
  presentation_score: null,
  estimated_body_fat_min: 10,
  estimated_body_fat_max: 12,
  confidence: "moderate",
  prep_status: "A useful current snapshot with additional conditioning still visible.",
  division_alignment_score: 72,
  conditioning_assessment: "Visible separation is present through the upper body.",
  visible_conditioning_markers: ["Shoulder separation is visible."],
  muscularity_assessment: "Upper-body muscularity is clearly visible.",
  symmetry_assessment: "The visible structure appears generally balanced.",
  presentation_assessment: "Consistent posing would make the assessment clearer.",
  visible_strengths: ["Shoulder width", "Upper-body shape"],
  areas_to_improve: ["Midsection conditioning", "Pose consistency"],
  judges_perspective: "The current presentation shows a clear base with room for sharper conditioning.",
  summary: "A balanced current snapshot with visible upper-body strengths.",
  explanation: "The assessment uses only the photos in this request.",
  limitations: ["Lighting and camera angle can affect visible detail."],
  caution_flags: [],
};

const physiqueContext: QuickAnalysisContext = {
  analysisMode: "physique_check",
  division: "Classic Physique",
  competitionStatus: "assessing",
  weeksOut: null,
  optionalContext: "Current relaxed and posed views.",
  ageConfirmed: true,
  aiConsentConfirmed: true,
};

const physiqueScores = {
  conditioning: 70,
  muscularity: 65,
  symmetry: 68,
  presentation: 60,
};

const physiqueResult: QuickAnalysisResult = {
  ...result,
  analysis_mode: "physique_check",
  stage_readiness_score: calculateStageReadinessScore(physiqueScores),
  stage_readiness_category: "Moderately close",
  stage_condition_distance: "close",
  conditioning_score: physiqueScores.conditioning,
  muscularity_score: physiqueScores.muscularity,
  symmetry_score: physiqueScores.symmetry,
  presentation_score: physiqueScores.presentation,
  prep_status: "The visible structure aligns moderately with the selected Classic Physique standard.",
  summary: "Visible muscularity and balance are present, while conditioning remains softer than typical stage presentation.",
};

function openAIResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": "req_test" },
  });
}

function normalizedImages(count: number) {
  return Array.from({ length: count }, () => ({
    bytes: Buffer.from([1, 2, 3, 4]),
    mimeType: "image/jpeg" as const,
    width: 800,
    height: 1200,
    sourceFormat: "jpeg",
  }));
}

test("Stripe accepts only the configured paid one-time $0.99 product", async () => {
  const priceId = "price_quick_analysis";
  process.env.STRIPE_QUICK_ANALYSIS_PRICE_ID = priceId;
  const retrieved = await verifyConfiguredQuickAnalysisPrice({
    prices: { retrieve: async () => ({ id: priceId, active: true, type: "one_time", unit_amount: 99, currency: "usd" }) },
  } as never);
  assert.equal(retrieved, priceId);
  await assert.rejects(
    verifyConfiguredQuickAnalysisPrice({
      prices: { retrieve: async () => ({ id: priceId, active: true, type: "recurring", unit_amount: 99, currency: "usd" }) },
    } as never),
    /temporarily unavailable/,
  );

  const verified = validatePaidQuickAnalysisSession({
    id: "cs_test_valid",
    mode: "payment",
    payment_status: "paid",
    amount_total: 99,
    currency: "usd",
    payment_intent: "pi_test_valid",
    metadata: { product: "stagelab_quick_analysis", quick_analysis_id: "00000000-0000-0000-0000-000000000001" },
    line_items: { data: [{ quantity: 1, price: { id: priceId } }] },
  } as never, priceId);
  assert.equal(verified.amountPaid, 99);

  assert.throws(() => validatePaidQuickAnalysisSession({
    id: "cs_test_unpaid",
    mode: "payment",
    payment_status: "unpaid",
    amount_total: 99,
    currency: "usd",
    payment_intent: "pi_test_unpaid",
    metadata: { product: "stagelab_quick_analysis", quick_analysis_id: "analysis" },
    line_items: { data: [{ quantity: 1, price: { id: priceId } }] },
  } as never, priceId), /Payment could not be verified/);
  assert.throws(() => validatePaidQuickAnalysisSession({
    id: "cs_test_wrong_price",
    mode: "payment",
    payment_status: "paid",
    amount_total: 99,
    currency: "usd",
    payment_intent: "pi_test_wrong_price",
    metadata: { product: "stagelab_quick_analysis", quick_analysis_id: "analysis" },
    line_items: { data: [{ quantity: 1, price: { id: "price_other" } }] },
  } as never, priceId), /Payment could not be verified/);
});

test("checkout replay derives the same unguessable token without storing the raw value", () => {
  process.env.QUICK_ANALYSIS_TOKEN_PEPPER = "test-pepper-with-at-least-thirty-two-characters";
  const first = deriveQuickAnalysisToken("cs_test_replayed_success");
  const second = deriveQuickAnalysisToken("cs_test_replayed_success");
  assert.equal(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{40,80}$/);
  assert.match(hashQuickAnalysisToken(first), /^[a-f0-9]{64}$/);
});

test("server normalization accepts 3-5 photos, strips metadata, resizes, and clears buffers", async () => {
  const source = await sharp({ create: { width: 2200, height: 1800, channels: 3, background: "#8a6d58" } })
    .withMetadata({ orientation: 6, exif: { IFD0: { Artist: "must-not-survive" } } })
    .jpeg({ quality: 90 })
    .toBuffer();
  const files = Array.from({ length: QUICK_ANALYSIS_MIN_PHOTOS }, (_, index) =>
    new File([Uint8Array.from(source)], `source-${index}.jpg`, { type: "image/jpeg" }),
  );
  const upload = await normalizeQuickAnalysisImages(files);
  assert.equal(upload.images.length, 3);
  const retainedReferences = upload.images.map((image) => image.bytes);
  for (const image of upload.images) {
    assert.ok(Math.max(image.width, image.height) <= QUICK_ANALYSIS_MAX_IMAGE_DIMENSION);
    const metadata = await sharp(image.bytes).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
  }
  upload.clear();
  assert.equal(upload.images.length, 0);
  assert.ok(retainedReferences.every((buffer) => buffer.every((byte) => byte === 0)));

  await assert.rejects(
    normalizeQuickAnalysisImages(Array.from({ length: QUICK_ANALYSIS_MAX_PHOTOS + 1 }, (_, index) =>
      new File([Uint8Array.from(source)], `source-${index}.jpg`, { type: "image/jpeg" }),
    )),
    /Choose 3-5/,
  );
  await assert.rejects(
    normalizeQuickAnalysisImages(Array.from({ length: QUICK_ANALYSIS_MIN_PHOTOS }, (_, index) =>
      new File([Uint8Array.from([1, 2, 3, 4])], `invalid-${index}.jpg`, { type: "image/jpeg" }),
    )),
    /could not be prepared/,
  );
});

test("OpenAI request sends only current context and 3-5 images and validates structured output", async () => {
  for (const count of [3, 5]) {
    let requestBody = "";
    const response = await requestQuickAnalysisFromOpenAI({
      context,
      images: normalizedImages(count),
      apiKey: "test-key",
      model: "test-multimodal-model",
      fetchImpl: async (_input, init) => {
        requestBody = String(init?.body ?? "");
        return openAIResponse({ output_text: JSON.stringify(result), usage: { input_tokens: 100, output_tokens: 200 } });
      },
    });
    assert.deepEqual(response.result, result);
    const parsedBody = JSON.parse(requestBody) as { input: Array<{ content: Array<{ type: string }> }> };
    assert.equal(parsedBody.input[1]?.content.filter((item) => item.type === "input_image").length, count);
    assert.doesNotMatch(requestBody, /stripe|card|google analytics/i);
  }
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /Analyze only the current photos/i);
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /Never claim that the athlete has improved/i);
});

test("Competition Prep keeps its existing timeline context and does not require Stage Readiness scores", () => {
  assert.deepEqual(parseQuickAnalysisContext(context), context);
  assert.deepEqual(parseQuickAnalysisResult(result, "competition_prep"), result);
  assert.equal(result.stage_readiness_score, null);
});

test("Physique Check requires no weeks-out input and returns deterministic Stage Readiness", async () => {
  assert.deepEqual(parseQuickAnalysisContext(physiqueContext), physiqueContext);
  assert.throws(() => parseQuickAnalysisContext({ ...physiqueContext, weeksOut: 10 }), /does not use a weeks-out estimate/);
  assert.throws(() => parseQuickAnalysisContext({ ...physiqueContext, competitionStatus: "preparing" }), /not competition-prep timing guidance/);
  assert.deepEqual(parseQuickAnalysisResult(physiqueResult, "physique_check"), physiqueResult);
  assert.equal(physiqueResult.stage_readiness_score, 67);

  let requestBody = "";
  const response = await requestQuickAnalysisFromOpenAI({
    context: physiqueContext,
    images: normalizedImages(3),
    apiKey: "test-key",
    model: "test-multimodal-model",
    fetchImpl: async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return openAIResponse({ output_text: JSON.stringify(physiqueResult) });
    },
  });
  assert.equal(response.result.analysis_mode, "physique_check");
  const parsedRequest = JSON.parse(requestBody) as { input: Array<{ content: Array<{ type: string; text?: string }> }> };
  const userPrompt = parsedRequest.input[1]?.content.find((item) => item.type === "input_text")?.text ?? "";
  assert.match(userPrompt, /"analysis_mode":"physique_check"/);
  assert.match(userPrompt, /Do not estimate weeks out/i);
  assert.match(userPrompt, /conditioning 40%, muscularity 25%, symmetry 20%, and presentation 15%/i);
});

test("Physique Check schema rejects unsupported timelines, official scores, outcome guarantees, and historical claims", () => {
  const prohibited = [
    "This physique appears 8 weeks out.",
    "This is an official judging result.",
    "You will place in this division.",
    "This score guarantees contest placement.",
    "You have improved since the previous check-in.",
  ];
  for (const summary of prohibited) {
    assert.throws(() => parseQuickAnalysisResult({ ...physiqueResult, summary }, "physique_check"));
  }
  assert.throws(() => parseQuickAnalysisResult({ ...physiqueResult, stage_readiness_score: 80 }, "physique_check"), /40\/25\/20\/15 weighting/);
  assert.throws(() => parseQuickAnalysisResult({ ...physiqueResult, analysis_mode: "competition_prep" }, "physique_check"));
});

test("OpenAI failures are sanitized and malformed output gets one controlled repair", async () => {
  await assert.rejects(
    requestQuickAnalysisFromOpenAI({ context, images: normalizedImages(3), apiKey: "test", model: "test", fetchImpl: async () => openAIResponse({}, 429) }),
    (error: unknown) => error instanceof QuickAnalysisProviderError && error.code === "OPENAI_RATE_LIMIT",
  );
  await assert.rejects(
    requestQuickAnalysisFromOpenAI({ context, images: normalizedImages(3), apiKey: "test", model: "test", fetchImpl: async () => openAIResponse({ output: [{ content: [{ type: "refusal", refusal: "no" }] }] }) }),
    (error: unknown) => error instanceof QuickAnalysisProviderError && error.code === "OPENAI_REFUSAL",
  );
  await assert.rejects(
    requestQuickAnalysisFromOpenAI({
      context,
      images: normalizedImages(3),
      apiKey: "test",
      model: "test",
      fetchImpl: async () => { const error = new Error("timeout"); error.name = "AbortError"; throw error; },
    }),
    (error: unknown) => error instanceof QuickAnalysisProviderError && error.code === "OPENAI_TIMEOUT",
  );

  let calls = 0;
  const repaired = await requestQuickAnalysisFromOpenAI({
    context,
    images: normalizedImages(3),
    apiKey: "test",
    model: "test",
    fetchImpl: async () => {
      calls += 1;
      return openAIResponse({ output_text: calls === 1 ? "not json" : JSON.stringify(result) });
    },
  });
  assert.equal(calls, 2);
  assert.equal(repaired.result.summary, result.summary);
});

test("structured results reject image URLs or base64 payloads", () => {
  assert.throws(() => parseQuickAnalysisResult({ ...result, summary: "data:image/jpeg;base64,abc" }));
  assert.throws(() => parseQuickAnalysisResult({ ...result, visible_strengths: ["https://example.com/photo.jpg"] }));
});

test("Quick Analysis persistence contains no photo fields, buckets, files, or image logging", () => {
  const migration = fs.readFileSync(path.join(projectRoot, "..", "supabase", "migrations", "20260821120000_stage_lab_quick_analysis.sql"), "utf8");
  const modeMigration = fs.readFileSync(path.join(projectRoot, "..", "supabase", "migrations", "20260821130000_stage_lab_quick_analysis_modes.sql"), "utf8");
  const tableBody = migration.match(/create table if not exists public\.quick_analyses\s*\(([\s\S]*?)\n\);/i)?.[1] ?? "";
  const columns = tableBody
    .split("\n")
    .map((line) => line.trim().match(/^([a-z][a-z0-9_]*)\s+/i)?.[1]?.toLowerCase())
    .filter((name): name is string => Boolean(name) && name !== "constraint");
  assert.equal(columns.some((name) => /photo|image|blob|base64|thumbnail|exif|storage/.test(name)), false);
  assert.doesNotMatch(migration, /create\s+(?:storage\s+)?bucket/i);
  assert.doesNotMatch(modeMigration, /photo|image|blob|base64|thumbnail|exif|storage/i);
  assert.match(modeMigration, /analysis_mode text/);
  assert.match(modeMigration, /'competition_prep'/);

  const repository = fs.readFileSync(path.join(projectRoot, "lib", "quick-analysis-repository.ts"), "utf8");
  const analyzeRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "analyze", "route.ts"), "utf8");
  const checkoutRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "checkout", "route.ts"), "utf8");
  const returnRoute = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "return", "route.ts"), "utf8");
  assert.doesNotMatch(repository, /image_url|base64|photo_path|photo_hash|thumbnail/i);
  assert.doesNotMatch(analyzeRoute, /console\.(?:log|info|warn|error)\([^)]*(?:bytes|base64|image_url)/i);
  assert.match(analyzeRoute, /finally\s*{[\s\S]*upload\?\.clear\(\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(projectRoot, "lib", "quick-analysis-images.ts"), "utf8"), /writeFile|mkdtemp|tmpdir|createWriteStream/);
  assert.match(migration, /stripe_checkout_session_id text unique/);
  assert.match(migration, /stripe_payment_intent_id text unique/);
  assert.match(migration, /checkout_nonce_hash text/);
  assert.match(checkoutRoute, /httpOnly:\s*true/);
  assert.match(returnRoute, /getQuickAnalysisCheckoutNonce/);
  assert.match(repository, /hashQuickAnalysisToken\(checkoutNonce\)\s*!==\s*row\.checkout_nonce_hash/);
});

test("the public landing is indexed while the result is noindex and excluded from sitemaps", () => {
  const landingPage = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "page.tsx"), "utf8");
  const resultExperience = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const resultPage = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "result", "page.tsx"), "utf8");
  const sitemapGenerator = fs.readFileSync(path.join(projectRoot, "scripts", "generate-sitemaps.ts"), "utf8");
  assert.match(landingPage, /available for 72 hours on the same browser and device used for checkout/);
  assert.match(resultExperience, /Use this same browser and device/);
  assert.match(resultPage, /index:\s*false/);
  assert.match(resultPage, /follow:\s*false/);
  assert.match(sitemapGenerator, /"\/stagelab\/quick-analysis"/);
  assert.doesNotMatch(sitemapGenerator, /"\/stagelab\/quick-analysis\/result"/);
});

test("both modes share the same $0.99 entitlement and the UI branches without storing sensitive analytics", () => {
  const checkout = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisCheckout.tsx"), "utf8");
  const report = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisReport.tsx"), "utf8");
  const checkoutRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "checkout", "route.ts"), "utf8");
  assert.match(checkout, /What do you want to assess\?/);
  assert.match(checkout, /analysisMode === "competition_prep" && competitionStatus === "preparing"/);
  assert.match(checkout, /analysisMode === "physique_check" \? "assessing"/);
  assert.match(checkoutRoute, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
  assert.match(checkoutRoute, /analysis_mode: context\.analysisMode/);
  assert.match(report, /Stage Readiness reflects how closely the visible physique aligns/);
  assert.match(report, /Download|StageLab/);
  assert.doesNotMatch(checkout, /stage_readiness_score|body_fat|optional_context/);
});
