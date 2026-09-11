import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildLocalizedCategoryFaqs,
  formatLocalizedProfessionalPrice,
  formatLocalizedServicePrice,
  hasMarketplaceSpecialtyTranslation,
  localizeGeneratedCategoryService,
  localizeMarketplaceAvailability,
  localizeMarketplaceCategory,
  localizeMarketplaceLocation,
  localizeMarketplaceSpecialty,
  localizeProfessionalPath,
  marketplaceText,
} from "../lib/i18n/marketplace-content.ts";
import type { ProfessionalCategoryRecord } from "../lib/marketplace-types.ts";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "../lib/marketplace-taxonomy.ts";

const projectRoot = process.cwd();
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const category: ProfessionalCategoryRecord = {
  id: "category-id",
  stableId: "personal-training",
  slug: "personal-training",
  publicSlug: "personal-training",
  label: "Personal Training",
  headline: "Personal Training",
  shortDescription: "English category description.",
  sortOrder: 1,
  isActive: true,
  isPrimary: true,
};

test("professional locale routes preserve the canonical profile slug", () => {
  const canonicalPath = "/professionals/jordan-smith/";
  assert.equal(localizeProfessionalPath(canonicalPath, "en"), canonicalPath);
  assert.equal(localizeProfessionalPath(canonicalPath, "es-419"), "/es/professionals/jordan-smith/");
  assert.equal(localizeProfessionalPath(canonicalPath, "pt-BR"), "/pt-br/professionals/jordan-smith/");

  const localizedRouteSource = readProjectFile("app/[locale]/[[...slug]]/page.tsx");
  // Slugs now resolve from published data at request time, including profiles
  // approved after the build. Localized URLs still use the canonical slug.
  assert.match(localizedRouteSource, /dynamicParams = true/);
  assert.match(localizedRouteSource, /LocalizedProfessionalRoutePage slug=\{resolved\.catalogSlug\}/);
  assert.match(localizedRouteSource, /getMarketplaceProfessionals\(\)/);
  assert.doesNotMatch(localizedRouteSource, /insert\s+into\s+.*trainer_profiles/i);
});

test("marketplace-owned profile presentation is localized without changing canonical values", () => {
  assert.equal(marketplaceText("es-419", "Request consultation"), "Solicitar consulta");
  assert.equal(marketplaceText("pt-BR", "Request consultation"), "Solicitar consulta");
  assert.equal(localizeMarketplaceLocation("Location flexible", "es-419"), "Ubicación flexible");
  assert.equal(localizeMarketplaceSpecialty("Muscle Building", "pt-BR"), "Ganho de massa muscular");

  const spanishCategory = localizeMarketplaceCategory(category, "es-419");
  const portugueseCategory = localizeMarketplaceCategory(category, "pt-BR");
  assert.equal(spanishCategory.id, category.id);
  assert.equal(portugueseCategory.stableId, category.stableId);
  assert.equal(spanishCategory.label, "Entrenamiento personal");
  assert.equal(portugueseCategory.label, "Treinamento pessoal");
});

test("every supported marketplace specialty has deterministic Spanish and Portuguese copy", () => {
  const specialties = [...new Set(MARKETPLACE_TAXONOMY_CATEGORIES.flatMap((entry) => entry.specialties))];

  for (const specialty of specialties) {
    assert.equal(hasMarketplaceSpecialtyTranslation(specialty, "es-419"), true, `Missing es-419 specialty: ${specialty}`);
    assert.equal(hasMarketplaceSpecialtyTranslation(specialty, "pt-BR"), true, `Missing pt-BR specialty: ${specialty}`);
  }
});

test("structured profile availability is localized", () => {
  assert.equal(localizeMarketplaceAvailability(["afternoons", "evenings"], "Afternoons, Evenings", "es-419"), "Tardes, Noches");
  assert.equal(localizeMarketplaceAvailability(["afternoons", "evenings"], "Afternoons, Evenings", "pt-BR"), "Tardes, Noites");
  assert.equal(localizeMarketplaceAvailability([], "Custom availability", "es-419"), "Custom availability");
});

test("professional languages flow through the approved public profile and remain locale-aware", () => {
  const migration = readProjectFile("../supabase/migrations/20260909120000_public_professional_languages.sql");
  const generator = readProjectFile("lib/marketplace-public-mapper.ts");
  const profileSource = readProjectFile("app/professionals/[slug]/page.tsx");
  const helpers = readProjectFile("lib/marketplace-helpers.ts");

  assert.match(migration, /profile\.languages/);
  assert.match(generator, /languages: parseStringArray\(row\.languages\)/);
  assert.match(profileSource, /languages\.map/);
  assert.equal(marketplaceText("es-419", "English"), "Inglés");
  assert.equal(marketplaceText("pt-BR", "Spanish"), "Espanhol");
  assert.equal(marketplaceText("es-419", "American Sign Language"), "American Sign Language");
  assert.match(helpers, /knowsLanguage: professional\.languages/);
});

test("generated category services are localized while professional-authored services remain verbatim", () => {
  const sourceCategory = { ...category, stableId: "personal_training" };
  const generatedService = {
    id: "professional-id-personal_training",
    professionalProfileId: "professional-id",
    name: "Personal Training",
    description: "English category description.",
    intendedFor: null,
    includedItems: [],
    deliveryCadence: null,
    minimumCommitment: null,
    consultationType: "unspecified",
    additionalCostsNote: null,
    serviceMode: null,
    durationMinutes: null,
    price: null,
    priceTo: null,
    pricingBasis: null,
    contactForPricing: false,
    sortOrder: 0,
    isActive: true,
    currencyCode: "USD",
  };
  const customService = { ...generatedService, id: "custom-service-id", name: "My custom service" };

  assert.equal(localizeGeneratedCategoryService(generatedService, [sourceCategory], "es-419").name, "Entrenamiento personal");
  assert.equal(localizeGeneratedCategoryService(generatedService, [sourceCategory], "pt-BR").name, "Treinamento pessoal");
  assert.equal(localizeGeneratedCategoryService(customService, [sourceCategory], "es-419").name, "My custom service");
});

test("category FAQs use localized human provider nouns", () => {
  const spanishFaqs = buildLocalizedCategoryFaqs(category, "es-419");
  const portugueseFaqs = buildLocalizedCategoryFaqs(category, "pt-BR");
  assert.match(spanishFaqs?.[0]?.question ?? "", /entrenador personal/i);
  assert.match(spanishFaqs?.[2]?.question ?? "", /entrenadores personales/i);
  assert.match(portugueseFaqs?.[0]?.question ?? "", /personal trainer/i);
  assert.equal(portugueseFaqs?.length, 4);
});

test("localized pricing keeps canonical amounts and currencies", () => {
  const professionalPrice = formatLocalizedProfessionalPrice({
    priceFrom: 80,
    priceTo: 120,
    pricingBasis: "session",
    pricingCurrency: "USD",
    contactForPricing: false,
  }, "es-419");
  const servicePrice = formatLocalizedServicePrice({
    price: 50,
    priceTo: null,
    pricingBasis: "hour",
    currencyCode: "BRL",
    contactForPricing: false,
  }, "pt-BR");

  assert.match(professionalPrice ?? "", /80/);
  assert.match(professionalPrice ?? "", /120/);
  assert.match(professionalPrice ?? "", /Por sesión/);
  assert.match(servicePrice ?? "", /50/);
  assert.match(servicePrice ?? "", /Por hora/);
});

test("professional-authored profile content remains verbatim", () => {
  const profileSource = readProjectFile("app/professionals/[slug]/page.tsx");
  const editorSource = readProjectFile("components/marketplace/ProfessionalProfileEditor.tsx");

  assert.match(profileSource, /<p>\{professional\.bio\}<\/p>/);
  assert.match(profileSource, /<h3>\{service\.name\}<\/h3>/);
  assert.match(profileSource, /service\.description \|\| t\(/);
  assert.match(profileSource, /<h3>\{credential\.credentialName\}<\/h3>/);
  assert.doesNotMatch(profileSource, /t\(professional\.bio\)/);
  assert.doesNotMatch(profileSource, /t\(service\.description\)/);
  assert.match(editorSource, /form\.bio \|\| t\("Your bio will appear here\."\)/);
  assert.match(editorSource, /service\.description \|\| t\("Service details"\)/);
});

test("localized professional SEO has alternates and private account routes remain noindex", () => {
  const profileSource = readProjectFile("app/professionals/[slug]/page.tsx");
  const localizedRouteSource = readProjectFile("app/[locale]/[[...slug]]/page.tsx");
  const sitemapSource = readProjectFile("scripts/generate-sitemaps.ts");

  assert.match(profileSource, /localizedAlternates: locale !== "en"/);
  assert.match(profileSource, /localizeProfessionalPath\(`\/professionals\/\$\{professional\.profileSlug\}`/);
  assert.match(localizedRouteSource, /page: "account"/);
  assert.match(localizedRouteSource, /page: "professional-account"/);
  assert.match(localizedRouteSource, /robots: \{ index: false, follow: false \}/);
  assert.match(sitemapSource, /return withLocalizedCatalogEntries\(\[\s*toSitemapEntry\("\/professionals"/);
});

test("preferred locale extends the user record instead of duplicating professional profiles", () => {
  const localeMigration = readProjectFile("../supabase/migrations/20260908150000_users_preferred_locale.sql");
  assert.match(localeMigration, /alter table public\.users/i);
  assert.match(localeMigration, /preferred_locale/i);
  assert.doesNotMatch(localeMigration, /insert\s+into\s+public\.trainer_profiles/i);
});
