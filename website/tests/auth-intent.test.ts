import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthConfirmationPath,
  getAuthIntent,
  getAuthReturnPath,
  getPostAuthDestination,
  getSignupIntro,
} from "../lib/auth-redirect.ts";
import { marketplaceText } from "../lib/i18n/marketplace-content.ts";

test("professional intent is exact and unknown values use the general signup copy", () => {
  assert.equal(getAuthIntent("professional"), "professional");
  for (const value of [null, "", "client", "Professional", "professional-extra", "https://example.com"]) {
    assert.equal(getAuthIntent(value), null);
    assert.deepEqual(getSignupIntro(value), {
      headline: "Join Elevare Fit",
      description: "Find a professional or create your own professional listing.",
    });
  }
  assert.deepEqual(getSignupIntro("professional"), {
    headline: "Create your professional profile",
    description: "Start by creating an account. Next, add your services, specialties, and professional details to build your listing.",
  });
});

test("sign-in and email confirmation carry only safe intent and return destinations", () => {
  assert.equal(getAuthReturnPath(null, "professional", "en"), "/account/?intent=professional");
  assert.equal(getAuthConfirmationPath(null, "professional", "en"), "/account/?intent=professional");
  assert.equal(getAuthReturnPath(null, "other", "en"), "/account/");
  assert.equal(getAuthConfirmationPath(null, "other", "en"), "/account/");
  assert.equal(getAuthReturnPath("/account/saved/?tab=recent", "professional", "en"), "/account/saved/?tab=recent");
  assert.equal(
    getAuthConfirmationPath("/account/saved/?tab=recent", "professional", "en"),
    "/account/?redirect=%2Faccount%2Fsaved%2F%3Ftab%3Drecent&intent=professional",
  );
  assert.equal(getAuthReturnPath("//evil.example/path", "professional", "en"), "/account/?intent=professional");
  assert.equal(getAuthConfirmationPath("https://evil.example/path", null, "en"), "/account/");
});

test("professional routing resumes new or draft setup without restarting submitted profiles", () => {
  const route = (status: string | null, loaded = true) => getPostAuthDestination({
    redirect: null,
    intent: "professional",
    locale: "en",
    professionalStatus: status,
    professionalStateLoaded: loaded,
  });
  assert.equal(route(null), "/account/professional-profile/");
  assert.equal(route("draft"), "/account/professional-profile/");
  for (const status of ["pending_review", "approved", "verified", "rejected", "suspended"]) {
    assert.equal(route(status), "/account/");
  }
  assert.equal(route(null, false), "/account/");
  assert.equal(getPostAuthDestination({ redirect: "/account/matches/", intent: "professional", locale: "en", professionalStatus: null, professionalStateLoaded: true }), "/account/matches/");
  assert.equal(getPostAuthDestination({ redirect: "//evil.example/path", intent: "client", locale: "en", professionalStatus: null, professionalStateLoaded: true }), "/account/");
});

test("supported locale copy and professional destinations stay aligned", () => {
  const previous = process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES;
  process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES = "true";
  try {
    for (const [locale, prefix] of [["es-419", "/es"], ["pt-BR", "/pt-br"]] as const) {
      const intro = getSignupIntro("professional");
      assert.notEqual(marketplaceText(locale, intro.headline), intro.headline);
      assert.notEqual(marketplaceText(locale, intro.description), intro.description);
      assert.notEqual(marketplaceText(locale, "Create account"), "Create account");
      assert.notEqual(marketplaceText(locale, getSignupIntro(null).description), getSignupIntro(null).description);
      assert.equal(getAuthReturnPath(null, "professional", locale), `${prefix}/account/?intent=professional`);
      assert.equal(getAuthConfirmationPath(null, "professional", locale), `${prefix}/account/?intent=professional`);
      assert.equal(getPostAuthDestination({ redirect: null, intent: "professional", locale, professionalStatus: null, professionalStateLoaded: true }), `${prefix}/account/professional-profile/`);
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES;
    else process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES = previous;
  }
});
