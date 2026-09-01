import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  QUICK_ANALYSIS_MAX_IMAGE_DIMENSION,
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MIN_PHOTOS,
  QUICK_ANALYSIS_PHOTO_VIEWS,
  calculateStageReadinessScore,
  getStageConditionDistance,
  getStageReadinessCategory,
  validateQuickAnalysisPhotoViews,
  type QuickAnalysisContext,
  type QuickAnalysisPhotoView,
  type QuickAnalysisResult,
} from "../lib/quick-analysis.ts";
import {
  normalizeQuickAnalysisImages,
  parseQuickAnalysisPhotoFormData,
} from "../lib/quick-analysis-images.ts";
import {
  QUICK_ANALYSIS_SYSTEM_PROMPT,
  QuickAnalysisProviderError,
  requestQuickAnalysisFromOpenAI,
} from "../lib/quick-analysis-openai.ts";
import {
  getQuickAnalysisConsistencyIssues,
  parseQuickAnalysisContext,
  parseQuickAnalysisResult,
} from "../lib/quick-analysis-schema.ts";
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
  photo_coverage: "sufficient",
  missing_or_limited_views: [],
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

function physiqueResultForScores(scores: {
  conditioning: number;
  muscularity: number;
  symmetry: number;
  presentation: number;
}, overrides: Partial<QuickAnalysisResult> = {}): QuickAnalysisResult {
  const stageReadinessScore = calculateStageReadinessScore(scores);
  return {
    ...physiqueResult,
    conditioning_score: scores.conditioning,
    muscularity_score: scores.muscularity,
    symmetry_score: scores.symmetry,
    presentation_score: scores.presentation,
    stage_readiness_score: stageReadinessScore,
    stage_readiness_category: getStageReadinessCategory(stageReadinessScore),
    stage_condition_distance: getStageConditionDistance(scores.conditioning),
    ...overrides,
  };
}

function openAIResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": "req_test" },
  });
}

function normalizedImages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    view: QUICK_ANALYSIS_PHOTO_VIEWS[index]!,
    bytes: Buffer.from([1, 2, 3, 4]),
    mimeType: "image/jpeg" as const,
    width: 800,
    height: 1200,
    sourceFormat: "jpeg",
  }));
}

function labeledPhotoInputs(files: File[]) {
  return files.map((file, index) => ({
    view: QUICK_ANALYSIS_PHOTO_VIEWS[index]!,
    file,
  }));
}

function quickAnalysisPhotoForm(views: QuickAnalysisPhotoView[]) {
  const form = new FormData();
  for (const view of views) {
    form.append(`photo_${view}`, new File([Uint8Array.from([1])], `${view}.jpg`, { type: "image/jpeg" }));
  }
  return form;
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
  const upload = await normalizeQuickAnalysisImages(labeledPhotoInputs(files));
  assert.equal(upload.images.length, 3);
  assert.deepEqual(upload.images.map((image) => image.view), ["front", "side", "back"]);
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
    normalizeQuickAnalysisImages(Array.from({ length: QUICK_ANALYSIS_MAX_PHOTOS + 1 }, (_, index) => ({
      view: (QUICK_ANALYSIS_PHOTO_VIEWS[index] ?? "front") as QuickAnalysisPhotoView,
      file: new File([Uint8Array.from(source)], `source-${index}.jpg`, { type: "image/jpeg" }),
    }))),
    /front, side, and back/i,
  );
  await assert.rejects(
    normalizeQuickAnalysisImages(labeledPhotoInputs(Array.from({ length: QUICK_ANALYSIS_MIN_PHOTOS }, (_, index) =>
      new File([Uint8Array.from([1, 2, 3, 4])], `invalid-${index}.jpg`, { type: "image/jpeg" }),
    ))),
    /front photo/i,
  );
  await assert.rejects(
    normalizeQuickAnalysisImages([
      { view: "front", file: files[0]! },
      { view: "side", file: new File([Uint8Array.from([1, 2, 3, 4])], "invalid-side.jpg", { type: "image/jpeg" }) },
      { view: "back", file: files[2]! },
    ]),
    /side photo/i,
  );
});

test("required photo views are enforced by shared and server-side validation", () => {
  for (const missing of ["front", "side", "back"] as const) {
    const views = (["front", "side", "back"] as QuickAnalysisPhotoView[]).filter((view) => view !== missing);
    assert.equal(validateQuickAnalysisPhotoViews(views).valid, false);
    assert.throws(() => parseQuickAnalysisPhotoFormData(quickAnalysisPhotoForm(views)), new RegExp(missing, "i"));
  }

  const required = ["front", "side", "back"] as QuickAnalysisPhotoView[];
  const allFive = [...QUICK_ANALYSIS_PHOTO_VIEWS];
  assert.equal(validateQuickAnalysisPhotoViews(required).valid, true);
  assert.deepEqual(parseQuickAnalysisPhotoFormData(quickAnalysisPhotoForm(required)).map((input) => input.view), required);
  assert.equal(validateQuickAnalysisPhotoViews(allFive).valid, true);
  assert.deepEqual(parseQuickAnalysisPhotoFormData(quickAnalysisPhotoForm(allFive)).map((input) => input.view), allFive);

  const tooMany = quickAnalysisPhotoForm(allFive);
  tooMany.append("photo_front", new File([Uint8Array.from([1])], "extra.jpg", { type: "image/jpeg" }));
  assert.equal(validateQuickAnalysisPhotoViews([...allFive, "front"]).valid, false);
  assert.throws(() => parseQuickAnalysisPhotoFormData(tooMany), /no more than 5/i);
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
    const parsedBody = JSON.parse(requestBody) as { input: Array<{ content: Array<{ type: string; text?: string }> }> };
    assert.equal(parsedBody.input[1]?.content.filter((item) => item.type === "input_image").length, count);
    const photoLabels = parsedBody.input[1]?.content
      .filter((item) => item.type === "input_text" && item.text?.startsWith("Photo "))
      .map((item) => item.text);
    assert.deepEqual(photoLabels, ["Photo 1: Front", "Photo 2: Side", "Photo 3: Back", "Photo 4: Additional View 1", "Photo 5: Additional View 2"].slice(0, count));
    assert.doesNotMatch(requestBody, /stripe|card|google analytics/i);
  }
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /Analyze only the current photos/i);
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /Never claim that the athlete has improved/i);
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /lower confidence as appropriate/i);
  assert.match(QUICK_ANALYSIS_SYSTEM_PROMPT, /do not fabricate observations/i);
});

test("Competition Prep keeps its existing timeline context and does not require Stage Readiness scores", () => {
  assert.deepEqual(parseQuickAnalysisContext(context), context);
  assert.deepEqual(parseQuickAnalysisResult(result, "competition_prep"), result);
  assert.equal(result.stage_readiness_score, null);
  assert.throws(() => parseQuickAnalysisContext({ ...context, ageConfirmed: false }));
  assert.throws(() => parseQuickAnalysisContext({ ...context, aiConsentConfirmed: false }));

  const legacyResult = { ...result } as Record<string, unknown>;
  delete legacyResult.photo_coverage;
  delete legacyResult.missing_or_limited_views;
  const parsedLegacyResult = parseQuickAnalysisResult(legacyResult, "competition_prep");
  assert.equal(parsedLegacyResult.photo_coverage, "sufficient");
  assert.deepEqual(parsedLegacyResult.missing_or_limited_views, []);
});

test("limited photo coverage lowers confidence and prevents unsupported observations", () => {
  const limited = parseQuickAnalysisResult({
    ...result,
    photo_coverage: "limited",
    missing_or_limited_views: ["back"],
    confidence: "moderate",
    limitations: ["The back view is obstructed, so back detail and symmetry cannot be assessed confidently."],
  }, "competition_prep");
  assert.equal(limited.photo_coverage, "limited");
  assert.deepEqual(limited.missing_or_limited_views, ["back"]);
  assert.throws(() => parseQuickAnalysisResult({ ...limited, confidence: "high" }, "competition_prep"), /cannot produce high confidence/i);
  assert.throws(() => parseQuickAnalysisResult({ ...limited, missing_or_limited_views: [] }, "competition_prep"), /identify the affected view/i);
  assert.throws(() => parseQuickAnalysisResult({ ...result, missing_or_limited_views: ["back"] }, "competition_prep"), /cannot be sufficient/i);
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
  assert.match(userPrompt, /conditioning also limits the highest possible readiness band/i);
  assert.match(userPrompt, /stage_condition_distance from conditioning_score/i);
});

test("Stage Readiness stays mathematically transparent while conditioning prevents optimistic labels", () => {
  const suppliedCase = physiqueResultForScores(
    { conditioning: 38, muscularity: 61, symmetry: 59, presentation: 42 },
    {
      estimated_body_fat_min: 20,
      estimated_body_fat_max: 24,
      summary: "The current snapshot shows visible muscularity, but conditioning is not aligned with typical stage presentation.",
    },
  );
  assert.equal(suppliedCase.stage_readiness_score, 49);
  assert.equal(suppliedCase.stage_readiness_category, "Developing");
  assert.equal(suppliedCase.stage_condition_distance, "significant");
  assert.deepEqual(getQuickAnalysisConsistencyIssues(suppliedCase), []);

  const cases = {
    muscularButSoft: physiqueResultForScores({ conditioning: 25, muscularity: 95, symmetry: 90, presentation: 75 }),
    conditionedButUndersized: physiqueResultForScores({ conditioning: 92, muscularity: 30, symmetry: 45, presentation: 50 }),
    strongPhysiqueCasualPhotos: physiqueResultForScores({ conditioning: 85, muscularity: 85, symmetry: 85, presentation: 25 }),
    strongAcrossDimensions: physiqueResultForScores({ conditioning: 92, muscularity: 90, symmetry: 88, presentation: 90 }),
    weakAcrossDimensions: physiqueResultForScores({ conditioning: 25, muscularity: 30, symmetry: 35, presentation: 30 }),
  };

  assert.equal(cases.muscularButSoft.stage_readiness_score, 59);
  assert.equal(cases.muscularButSoft.stage_readiness_category, "Developing");
  assert.equal(cases.muscularButSoft.stage_condition_distance, "significant");
  assert.ok((cases.conditionedButUndersized.stage_readiness_score ?? 100) <= 74);
  assert.equal(cases.conditionedButUndersized.stage_condition_distance, "very_close");
  assert.notEqual(cases.strongPhysiqueCasualPhotos.stage_readiness_category, "Very close visually");
  assert.equal(cases.strongAcrossDimensions.stage_readiness_category, "Very close visually");
  assert.equal(cases.weakAcrossDimensions.stage_readiness_category, "Far from stage condition");
});

test("Physique Check normalizes model-derived fields locally and rejects contradictory prose", async () => {
  const inconsistentDerivedFields = {
    ...physiqueResult,
    conditioning_score: 38,
    muscularity_score: 61,
    symmetry_score: 59,
    presentation_score: 42,
    stage_readiness_score: 90,
    stage_readiness_category: "Very close visually",
    stage_condition_distance: "very_close",
    summary: "Visible muscularity is present, while conditioning is not aligned with typical stage presentation.",
  };
  const normalized = parseQuickAnalysisResult(inconsistentDerivedFields, "physique_check");
  assert.equal(normalized.stage_readiness_score, 49);
  assert.equal(normalized.stage_readiness_category, "Developing");
  assert.equal(normalized.stage_condition_distance, "significant");

  let calls = 0;
  const response = await requestQuickAnalysisFromOpenAI({
    context: physiqueContext,
    images: normalizedImages(3),
    apiKey: "test-key",
    model: "test-multimodal-model",
    fetchImpl: async () => {
      calls += 1;
      return openAIResponse({ output_text: JSON.stringify(inconsistentDerivedFields) });
    },
  });
  assert.equal(calls, 1);
  assert.equal(response.result.stage_condition_distance, "significant");

  assert.throws(
    () => parseQuickAnalysisResult({ ...normalized, summary: "This physique is stage-ready." }, "physique_check"),
    /cannot be described as stage-ready/i,
  );
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
  assert.equal(
    parseQuickAnalysisResult({ ...physiqueResult, stage_readiness_score: 80 }, "physique_check").stage_readiness_score,
    physiqueResult.stage_readiness_score,
  );
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
  const resultExperience = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const checkoutRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "checkout", "route.ts"), "utf8");
  const returnRoute = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "return", "route.ts"), "utf8");
  assert.doesNotMatch(repository, /image_url|base64|photo_path|photo_hash|thumbnail/i);
  assert.doesNotMatch(analyzeRoute, /console\.(?:log|info|warn|error)\([^)]*(?:bytes|base64|image_url)/i);
  assert.match(analyzeRoute, /parseQuickAnalysisPhotoFormData\(form\)[\s\S]*normalizeQuickAnalysisImages\(photoInputs\)[\s\S]*claimQuickAnalysisAttempt/);
  assert.match(analyzeRoute, /Your payment is still valid|will not be charged again/i);
  assert.match(analyzeRoute, /finally\s*{[\s\S]*upload\?\.clear\(\)/);
  assert.doesNotMatch(resultExperience, /form\.set\([^\n]*(?:previewUrl|base64|data:image)/i);
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
  const returnLink = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisReturnLink.tsx"), "utf8");
  const resultExperience = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const resultPage = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "result", "page.tsx"), "utf8");
  const sitemapGenerator = fs.readFileSync(path.join(projectRoot, "scripts", "generate-sitemaps.ts"), "utf8");
  assert.match(landingPage, /available for 72 hours on the same browser and device used for checkout/);
  assert.match(landingPage, /QuickAnalysisReturnLink/);
  assert.match(returnLink, /\/api\/quick-analysis\/status\//);
  assert.match(returnLink, /View my recent analysis/);
  assert.match(returnLink, /Continue my analysis/);
  assert.match(returnLink, /Check analysis status/);
  assert.match(returnLink, /\/stagelab\/quick-analysis\/result\//);
  assert.match(returnLink, /quick_analysis_return_clicked/);
  assert.doesNotMatch(returnLink, /stage_readiness|body_fat|photo|optional_context/);
  assert.match(resultExperience, /Use this same browser and device/);
  assert.match(resultPage, /index:\s*false/);
  assert.match(resultPage, /follow:\s*false/);
  assert.match(sitemapGenerator, /"\/stagelab\/quick-analysis"/);
  assert.doesNotMatch(sitemapGenerator, /"\/stagelab\/quick-analysis\/result"/);
});

test("Quick Analysis landing keeps the focused offer, accessible FAQs, and low-friction checkout", () => {
  const landingPage = fs.readFileSync(path.join(projectRoot, "app", "stagelab", "quick-analysis", "page.tsx"), "utf8");
  const checkout = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisCheckout.tsx"), "utf8");
  const resultExperience = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(projectRoot, "app", "globals.css"), "utf8");
  const productionPriceSources = [
    landingPage,
    checkout,
    resultExperience,
    fs.readFileSync(path.join(projectRoot, "app", "page.tsx"), "utf8"),
    fs.readFileSync(path.join(projectRoot, "app", "stagelab", "page.tsx"), "utf8"),
  ].join("\n");

  assert.match(landingPage, /See how your physique measures up\./);
  assert.match(landingPage, /QUICK_ANALYSIS_PRICE_DISPLAY/);
  assert.match(landingPage, /No subscription/);
  assert.match(landingPage, /No account required/);
  assert.match(landingPage, /Photos never stored by ElevareFit/);
  assert.match(landingPage, /<details className="quick-analysis-faq panel"/);
  assert.match(landingPage, /<summary>{faq\.question}<\/summary>/);
  assert.doesNotMatch(landingPage, /tool-faq-grid/);

  const orderedFaqs = [
    "What does StageLab Quick Analysis assess?",
    "Are my photos or analysis details saved?",
    "What photos work best?",
    "Do I need a StageLab account?",
    "How do I reopen my result without an account?",
    "What does the Stage Readiness score mean?",
    "Is this medical or official judging advice?",
  ];
  orderedFaqs.forEach((question, index) => {
    assert.ok(landingPage.indexOf(question) >= 0);
    if (index > 0) assert.ok(landingPage.indexOf(orderedFaqs[index - 1]!) < landingPage.indexOf(question));
  });

  assert.match(checkout, /Get My Quick Analysis — \$\{formatQuickAnalysisPrice\(\)}/);
  assert.match(checkout, /Review the highlighted fields below/);
  assert.match(checkout, /Choose Competition Prep or Physique Check/);
  assert.match(checkout, /Select a division or comparison standard/);
  assert.match(checkout, /Confirm that you are at least 18 years old/);
  assert.match(checkout, /Confirm AI processing before continuing/);
  assert.match(checkout, /useState\(false\)/);
  assert.match(checkout, /Privacy Policy/);
  assert.match(checkout, /Terms of Service/);
  assert.match(checkout, /EmbeddedCheckoutProvider/);
  assert.match(checkout, /EmbeddedCheckout className="quick-analysis-embedded-checkout"/);
  assert.match(checkout, /window\.location\.assign\(`\/stagelab\/quick-analysis\/return\/\?session_id=/);
  assert.match(resultExperience, /Upload your check-in/);
  assert.match(resultExperience, /Upload your physique photos/);
  assert.match(styles, /\.quick-analysis-faq summary:focus-visible/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.quick-analysis-faq summary/);
  assert.doesNotMatch(productionPriceSources, /\$0\.99|value:\s*0\.99/);
});

test("optional recent-analysis checks stay quiet when no access cookie exists", () => {
  const returnLink = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisReturnLink.tsx"), "utf8");
  const statusRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "status", "route.ts"), "utf8");

  assert.match(returnLink, /status\/\?optional=1/);
  assert.match(statusRoute, /optionalAccessCheck/);
  assert.match(statusRoute, /error\.code === "MISSING_ACCESS_TOKEN"/);
  assert.match(statusRoute, /\{ state: null \}/);
});

test("both modes share the same $0.99 entitlement and the UI branches without storing sensitive analytics", () => {
  const checkout = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisCheckout.tsx"), "utf8");
  const report = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisReport.tsx"), "utf8");
  const checkoutRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "checkout", "route.ts"), "utf8");
  assert.match(checkout, /What do you want to assess\?/);
  assert.match(checkout, /analysisMode === "competition_prep" && competitionStatus === "preparing"/);
  assert.match(checkout, /analysisMode === "physique_check" \? "assessing"/);
  assert.match(checkoutRoute, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
  assert.match(checkoutRoute, /ui_mode: "embedded"/);
  assert.match(checkoutRoute, /redirect_on_completion: "if_required"/);
  assert.match(checkoutRoute, /return_url:/);
  assert.doesNotMatch(checkoutRoute, /success_url:|cancel_url:/);
  assert.match(checkoutRoute, /clientSecret: session\.client_secret/);
  assert.match(checkoutRoute, /payment_method_types: \["card"\]/);
  assert.match(checkoutRoute, /analysis_mode: context\.analysisMode/);
  const ctaTracker = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisCtaViewTracker.tsx"), "utf8");
  const resultExperience = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const photoUploader = fs.readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisPhotoUploader.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(projectRoot, "app", "globals.css"), "utf8");
  assert.match(report, /Stage Readiness is a composite visual profile/);
  assert.match(report, /Presentation in submitted photos/);
  assert.match(report, /What still separates you from stage condition/i);
  assert.match(report, /Judge&apos;s Perspective/);
  assert.match(report, /What can affect this read/);
  assert.match(report, /aria-label={`\$\{score\} out of 100`}/);
  assert.match(report, /Download|StageLab/);
  assert.match(report, /quick_analysis_stagelab_ios_clicked/);
  assert.match(report, /quick_analysis_stagelab_android_clicked/);
  assert.match(ctaTracker, /quick_analysis_stagelab_cta_viewed/);
  assert.match(ctaTracker, /analysis_mode: mode/);
  assert.doesNotMatch(ctaTracker, /stage_readiness|body_fat|photo|context/);
  assert.match(resultExperience, /quick_analysis_completed/);
  assert.match(resultExperience, /quick_analysis_photo_set_started/);
  assert.match(resultExperience, /quick_analysis_photo_set_completed/);
  assert.doesNotMatch(resultExperience, /quick_analysis_completed[^\n]*(?:stage_readiness|body_fat|photo|optional_context)/);
  assert.match(photoUploader, /Competition Prep:/);
  assert.match(photoUploader, /Use your normal check-in or division poses when possible/);
  assert.match(photoUploader, /No posing experience needed/);
  assert.match(photoUploader, /Full physique visible/);
  assert.match(photoUploader, /aria-required={content\.required}/);
  assert.match(photoUploader, /aria-describedby=/);
  assert.match(photoUploader, /type="button"/);
  assert.match(photoUploader, /alt={`\$\{content\.label\} photo preview`}/);
  assert.match(photoUploader, /previewUrl/);
  assert.match(resultExperience, /URL\.createObjectURL/);
  assert.match(resultExperience, /URL\.revokeObjectURL/);
  assert.doesNotMatch(resultExperience.match(/catch \(analysisError\)[\s\S]*?finally/)?.[0] ?? "", /resetPhotos\(\)/);
  assert.doesNotMatch(photoUploader, /trackEvent|filename|file\.name/);
  assert.match(fs.readFileSync(path.join(projectRoot, "lib", "quick-analysis-client-images.ts"), "utf8"), /imageOrientation: "from-image"/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.quick-analysis-report-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.quick-analysis-photo-slots[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(checkout, /stage_readiness_score|body_fat|optional_context/);
});
