import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  appendProfessionalAcquisitionParams,
  getProfessionalAcquisitionCopy,
  getProfessionalSignupHref,
  professionalAcquisitionAnalytics,
  readProfessionalAcquisitionAttribution,
  readProfessionalAcquisitionMetadata,
} from "../lib/professional-acquisition.ts";

const projectRoot = process.cwd();
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("professional recruitment attribution is allowlisted, bounded, and safe to carry forward", () => {
  const attribution = readProfessionalAcquisitionAttribution(new URLSearchParams(
    "utm_source=instagram&utm_medium=paid_social&utm_campaign=founding-professionals&utm_content=reel-a&email=person%40example.com&redirect=https%3A%2F%2Fevil.example",
  ));

  assert.deepEqual(attribution, {
    utm_source: "instagram",
    utm_medium: "paid_social",
    utm_campaign: "founding-professionals",
    utm_content: "reel-a",
  });
  assert.equal(
    getProfessionalSignupHref("es-419", attribution),
    "/sign-in/?intent=professional&locale=es-419&utm_source=instagram&utm_medium=paid_social&utm_campaign=founding-professionals&utm_content=reel-a",
  );
  assert.equal(
    appendProfessionalAcquisitionParams("/account/?intent=professional", attribution),
    "/account/?intent=professional&utm_source=instagram&utm_medium=paid_social&utm_campaign=founding-professionals&utm_content=reel-a",
  );
  assert.deepEqual(readProfessionalAcquisitionAttribution(new URLSearchParams("utm_source=<script>&utm_medium=")), {});
  assert.deepEqual(readProfessionalAcquisitionMetadata({ utm_source: "facebook", email: "person@example.com" }), { utm_source: "facebook" });
  assert.deepEqual(professionalAcquisitionAnalytics(attribution), {
    acquisition_source: "instagram",
    acquisition_medium: "paid_social",
    acquisition_campaign: "founding-professionals",
    acquisition_content: "reel-a",
  });
});

test("recruitment copy is complete for every public locale and distinguishes current features from the roadmap", () => {
  const english = getProfessionalAcquisitionCopy("en");
  const spanish = getProfessionalAcquisitionCopy("es-419");
  const portuguese = getProfessionalAcquisitionCopy("pt-BR");

  assert.equal(english.hero.title, "Join Elevare as a Founding Professional");
  assert.equal(english.signup.note, "Creating your account is free. Build your profile at your own pace and submit it for review when you’re ready.");
  assert.notEqual(spanish.hero.title, english.hero.title);
  assert.notEqual(portuguese.hero.title, english.hero.title);
  for (const copy of [english, spanish, portuguese]) {
    assert.equal(copy.vision.cards.length, 4);
    assert.equal(copy.roadmap.stages.length, 3);
    assert.equal(copy.steps.items.length, 4);
    assert.match(copy.app.status, /not available|aún no está disponible|ainda não está disponível/i);
    assert.match(copy.founding.note, /does not|No cambia|não altera/i);
    assert.match(copy.faq.items.at(-1)?.answer ?? "", /cannot guarantee|no puede garantizar|não pode garantir/i);
    assert.match(copy.vision.cards.map((card) => card.label).join(" "), /AVAILABLE NOW|DISPONIBLE AHORA|DISPONÍVEL AGORA/i);
    assert.match(copy.roadmap.stages.map((stage) => stage.label).join(" "), /IN DEVELOPMENT|EN DESARROLLO|EM DESENVOLVIMENTO/i);
    assert.match(copy.roadmap.stages.at(-1)?.title ?? "", /automated|automatizadas|automatizada/i);
  }
  assert.match(english.roadmap.stages.at(-1)?.body ?? "", /being developed/i);
  assert.doesNotMatch(english.vision.cards.map((card) => card.body).join(" "), /guaranteed|AI-powered/i);
});

test("the landing route, localized route, navigation, and sitemap preserve the marketplace directory", () => {
  const landingPage = readProjectFile("app/professionals/join/page.tsx");
  const localizedRoute = readProjectFile("app/[locale]/[[...slug]]/page.tsx");
  const header = readProjectFile("components/Header.tsx");
  const sitemap = readProjectFile("scripts/generate-sitemaps.ts");
  const directory = readProjectFile("app/professionals/page.tsx");

  assert.match(landingPage, /<ProfessionalRecruitmentLanding locale="en"/);
  assert.match(localizedRoute, /slug\[0\] === "professionals" && slug\[1\] === "join"/);
  assert.match(localizedRoute, /page: "professionals-join"/);
  assert.match(localizedRoute, /<ProfessionalRecruitmentLanding locale=\{resolved\.locale\}/);
  assert.match(header, /href\("\/professionals\/join\/"\)/);
  assert.match(sitemap, /"\/professionals\/join\/"/);
  assert.match(directory, /MarketplaceDirectory/);
});

test("landing CTAs use the shared signup or existing professional workspace and track safe conversion events", () => {
  const actions = readProjectFile("components/marketplace/ProfessionalRecruitmentActions.tsx");
  const landing = readProjectFile("components/marketplace/ProfessionalRecruitmentLanding.tsx");

  assert.match(actions, /getProfessionalSignupHref\(locale, attribution\)/);
  assert.match(actions, /getProfessionalProfilePath\(locale\)/);
  assert.match(actions, /ProfessionalRecruitmentActionsProvider/);
  assert.match(actions, /existing_account/);
  assert.match(actions, /professional_landing_view/);
  assert.match(actions, /professional_landing_cta_click/);
  assert.match(actions, /useRef\(false\)/);
  assert.match(landing, /<Suspense fallback=\{null\}><ProfessionalRecruitmentTracker \/><\/Suspense>/);
  assert.match(landing, /function ProfessionalRecruitmentCtaBoundary/);
  assert.match(landing, /getProfessionalSignupHref\(locale\)/);
  for (const placement of ["hero", "founding_section", "final_cta"]) {
    assert.match(landing, new RegExp(`placement="${placement}"`));
  }
  assert.match(landing, /copy\.vision\.cards/);
  assert.match(landing, /copy\.roadmap\.stages/);
});

test("shared signup and professional onboarding retain consent, validation, acquisition context, and analytics", () => {
  const auth = readProjectFile("components/marketplace/AuthPanel.tsx");
  const editor = readProjectFile("components/marketplace/ProfessionalProfileEditor.tsx");

  assert.match(auth, /password !== confirmPassword/);
  assert.match(auth, /hasAcceptedLegalTerms/);
  assert.match(auth, /hasConfirmedAge/);
  assert.match(auth, /className="password-toggle"/);
  assert.match(auth, /professional_acquisition: isProfessionalSignup \? acquisitionAttribution/);
  assert.match(auth, /appendProfessionalAcquisitionParams\(confirmationPath, acquisitionAttribution\)/);
  for (const event of ["professional_signup_view", "professional_signup_started", "professional_signup_completed", "professional_account_created"]) {
    assert.match(auth, new RegExp(event));
  }
  for (const event of ["professional_onboarding_started", "professional_profile_draft_saved", "professional_profile_submitted", "professional_profile_approved"]) {
    assert.match(editor, new RegExp(event));
  }
});

test("mobile recruitment layout uses single-column fallbacks and maintains touch-sized controls", () => {
  const styles = readProjectFile("app/globals.css");

  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /\.professional-acquisition-vision-grid, \.professional-acquisition-roadmap-grid \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\.professional-acquisition-vision-grid, \.professional-acquisition-steps, \.professional-acquisition-category-list \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\.professional-acquisition-roadmap-grid \{ grid-template-columns: 1fr;/);
  assert.match(styles, /\.professional-acquisition-closing \.button, \.professional-acquisition-hero \.button \{ width: 100%;/);
  assert.match(styles, /\.password-toggle \{ position: absolute;/);
});
