import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/marketplace/InquiryForm";
import { MarketplaceCategoryResources } from "@/components/marketplace/MarketplaceCategoryResources";
import { MarketplaceDirectory } from "@/components/marketplace/MarketplaceDirectory";
import { ProfessionalCard } from "@/components/marketplace/ProfessionalCard";
import { ProfessionalProfileViewTracker } from "@/components/marketplace/ProfessionalProfileViewTracker";
import { ProfessionalSaveButton } from "@/components/marketplace/ProfessionalSaveButton";
import { ReportProfileForm } from "@/components/marketplace/ReportProfileForm";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import {
  getMarketplaceCategories,
  getMarketplaceCategoryBySlug,
  getMarketplaceProfessionalBySlug,
  getMarketplaceProfessionals,
} from "@/lib/marketplace";
import {
  buildCategoryFaqs,
  buildCategoryIntro,
  buildProfessionalSchema,
  formatApprovalStatusLabel,
  formatCategoryList,
  formatIdentityVerificationLabel,
  formatPublicLocationLabel,
  formatPriceSummary,
  formatServicePriceSummary,
  formatServiceModeLabel,
  formatYearsExperience,
  getCredentialPublicStatus,
  getProfessionalInitials,
  getProfessionalPublicBadges,
  getRelatedProfessionals,
  getProfessionalsByCategory,
} from "@/lib/marketplace-helpers";
import {
  buildMarketplaceCategoryMetaDescription,
  buildMarketplaceProfessionalMetaDescription,
  buildMarketplaceProfessionalSeoTitle,
  getMarketplaceCategorySeoLabel,
  isMarketplaceCategoryIndexable,
} from "@/lib/marketplace-seo";
import { absoluteUrl, buildMetadata, siteConfig } from "@/lib/site";
import type { Locale } from "@/lib/i18n/config";
import { isLocalizedIndexingEnabled, localizePathname } from "@/lib/i18n/config";
import {
  buildLocalizedCategoryFaqs,
  formatLocalizedProfessionalPrice,
  formatLocalizedServicePrice,
  formatMarketplaceYears,
  getLocalizedProfessionalMetadataCopy,
  localizeApprovalStatus,
  localizeGeneratedCategoryService,
  localizeMarketplaceAvailability,
  localizeMarketplaceCategory,
  localizeMarketplaceLocation,
  localizeMarketplaceSpecialty,
  localizeProfessionalPath,
  localizeServiceMode,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";
import { formatWebsiteLinkLabel } from "@/lib/professional-profile";

type ProfessionalRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const [categories, professionals] = await Promise.all([
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);

  return [
    ...categories.map((category) => ({ slug: category.slug })),
    ...professionals.map((professional) => ({ slug: professional.profileSlug })),
  ];
}

export async function buildProfessionalRouteMetadata(slug: string, locale: Locale = "en") {
  const [category, professional, professionals] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceProfessionalBySlug(slug),
    getMarketplaceProfessionals(),
  ]);

  if (professional) {
    const primaryCategory = professional.categories.find((entry) => entry.isPrimary) ?? professional.categories[0] ?? null;
    const localizedCategory = primaryCategory ? localizeMarketplaceCategory(primaryCategory, locale) : null;
    const role = professional.professionalTitle || localizedCategory?.label || marketplaceText(locale, "Profile");
    const copy = getLocalizedProfessionalMetadataCopy(
      locale,
      professional.displayName,
      role,
      localizeMarketplaceLocation(formatPublicLocationLabel(professional), locale),
    );
    return buildMetadata({
      title: locale === "en" ? buildMarketplaceProfessionalSeoTitle(professional) : copy.title,
      description: locale === "en" ? buildMarketplaceProfessionalMetaDescription(professional) : copy.description,
      pathname: localizeProfessionalPath(`/professionals/${professional.profileSlug}`, locale),
      imageUrl: professional.profilePhotoUrl ?? undefined,
      locale,
      localizedAlternates: locale !== "en",
      robots: locale !== "en" && !isLocalizedIndexingEnabled() ? { index: false, follow: false } : undefined,
    });
  }

  if (category) {
    const isIndexable = isMarketplaceCategoryIndexable(category, professionals);

    return buildMetadata({
      title: `${locale === "en" ? getMarketplaceCategorySeoLabel(category) : localizeMarketplaceCategory(category, locale).label} | Elevare`,
      description: locale === "en" ? buildMarketplaceCategoryMetaDescription(category) : localizeMarketplaceCategory(category, locale).shortDescription ?? category.shortDescription ?? "",
      pathname: localizeProfessionalPath(`/professionals/${category.slug}`, locale),
      locale,
      localizedAlternates: locale !== "en",
      robots: !isIndexable || (locale !== "en" && !isLocalizedIndexingEnabled()) ? { index: false, follow: true } : undefined,
    });
  }

  return buildMetadata({
    title: marketplaceText(locale, "Profile page not found"),
    description: marketplaceText(locale, "The requested marketplace profile could not be found."),
    pathname: localizeProfessionalPath(`/professionals/${slug}`, locale),
    locale,
    localizedAlternates: locale !== "en",
    robots: { index: false, follow: false },
  });
}

export async function generateMetadata({ params }: ProfessionalRoutePageProps) {
  const { slug } = await params;
  return buildProfessionalRouteMetadata(slug, "en");
}

async function ProfessionalProfilePage({ slug, locale = "en" }: { slug: string; locale?: Locale }) {
  const [professional, professionals] = await Promise.all([
    getMarketplaceProfessionalBySlug(slug),
    getMarketplaceProfessionals(),
  ]);

  if (!professional) {
    notFound();
  }

  const relatedProfessionals = getRelatedProfessionals(professional, professionals, 3);
  const yearsExperience = locale === "en" ? formatYearsExperience(professional.yearsExperience) : formatMarketplaceYears(professional.yearsExperience, locale);
  const priceSummary = locale === "en"
    ? formatPriceSummary(professional)
    : formatLocalizedProfessionalPrice(professional, locale);
  const publicBadges = getProfessionalPublicBadges(professional);
  const t = (value: string) => marketplaceText(locale, value);
  const clientStatusLabel = t(professional.clientAcceptanceStatus === "waitlist"
    ? "Accepting waitlist requests"
    : professional.clientAcceptanceStatus === "not_accepting"
      ? "Not accepting new clients"
      : "Accepting new clients");
  const profileLinks = [
    {
      type: "website",
      label: formatWebsiteLinkLabel(professional.websiteUrl ?? "", professional.socialLinks.website_label),
      href: professional.websiteUrl,
    },
    { type: "instagram", label: "Instagram", href: professional.socialLinks.instagram },
    { type: "facebook", label: "Facebook", href: professional.socialLinks.facebook },
    { type: "tiktok", label: "TikTok", href: professional.socialLinks.tiktok },
    { type: "youtube", label: "YouTube", href: professional.socialLinks.youtube },
    { type: "linkedin", label: "LinkedIn", href: professional.socialLinks.linkedin },
  ].flatMap((entry) => entry.href ? [{ ...entry, href: entry.href }] : []);
  const profileLinkIcons: Record<string, { src: string; width: number; height: number }> = {
    instagram: { src: "/instagram-icon.png", width: 26, height: 26 },
    facebook: { src: "/facebook-icon.png", width: 26, height: 26 },
    tiktok: { src: "/tiktok-icon.png", width: 26, height: 26 },
    youtube: { src: "/youtube-icon.png", width: 28, height: 19 },
    linkedin: { src: "/linkedin-icon.png", width: 26, height: 26 },
  };
  const primaryCategory = professional.categories.find((category) => category.isPrimary) ?? professional.categories[0] ?? null;
  const localizedPrimaryCategory = primaryCategory ? localizeMarketplaceCategory(primaryCategory, locale) : null;
  const localizedCategories = professional.categories.map((category) => localizeMarketplaceCategory(category, locale));
  const localizedServices = professional.services.map((service) => (
    localizeGeneratedCategoryService(service, professional.categories, locale)
  ));
  const languages = professional.languages ?? [];
  const availabilitySummary = localizeMarketplaceAvailability(
    professional.typicalAvailability,
    professional.availabilitySummary,
    locale,
  );
  const profileLocation = localizeMarketplaceLocation(formatPublicLocationLabel(professional), locale);
  const profilePhotoAlt = `${professional.displayName}, ${professional.professionalTitle || localizedPrimaryCategory?.label || t("professional")}, ${profileLocation}`;
  const profilePath = localizeProfessionalPath(`/professionals/${professional.profileSlug}`, locale);
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: t("Find Support"),
      item: absoluteUrl(localizeProfessionalPath("/professionals", locale)),
    },
    ...(primaryCategory
      ? [
          {
            "@type": "ListItem",
            position: 2,
            name: localizedPrimaryCategory?.label ?? primaryCategory.label,
            item: absoluteUrl(localizeProfessionalPath(`/professionals/${primaryCategory.slug}`, locale)),
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: primaryCategory ? 3 : 2,
      name: professional.displayName,
      item: absoluteUrl(profilePath),
    },
  ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems,
    },
    {
      ...buildProfessionalSchema(professional, siteConfig.url),
      url: absoluteUrl(profilePath),
      inLanguage: locale,
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />
      <ProfessionalProfileViewTracker professionalId={professional.id} />

      <nav className="breadcrumbs professional-profile-breadcrumbs" aria-label={t("Breadcrumb")}>
        <TrackedLink href={localizeProfessionalPath("/professionals/", locale)} eventName="breadcrumb_click" eventParams={{ destination: "professionals" }}>
          {t("Find Support")}
        </TrackedLink>
        {primaryCategory ? (
          <>
            <span aria-hidden="true">/</span>
            <TrackedLink
              href={localizeProfessionalPath(`/professionals/${primaryCategory.slug}/`, locale)}
              eventName="breadcrumb_click"
              eventParams={{ destination: primaryCategory.slug }}
            >
              {localizedPrimaryCategory?.label ?? primaryCategory.label}
            </TrackedLink>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{professional.displayName}</span>
      </nav>

      <section className="hero professional-hero">
        <div className="professional-hero-media">
          {professional.profilePhotoUrl ? (
            <img
              src={professional.profilePhotoUrl}
              alt={profilePhotoAlt}
              width={360}
              height={360}
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="professional-avatar-fallback professional-avatar-fallback-large">
              {getProfessionalInitials(professional.displayName)}
            </div>
          )}
        </div>

        <div className="professional-hero-copy">
          <div className="eyebrow">{t("Profile")}</div>
          <h1>{professional.displayName}</h1>
          <p className="professional-title-copy professional-title-copy-large">
            {professional.professionalTitle || formatCategoryList(localizedCategories) || t("Profile")}
          </p>
          <p>{professional.bio}</p>

          {publicBadges.length > 0 ? (
            <div className="tag-row">
              {publicBadges.map((badge) => (
                <span key={badge} className="verification-pill">
                  {t(badge)}
                </span>
              ))}
            </div>
          ) : null}

          <div className="hero-proof professional-summary-grid">
            <article className="proof-card">
              <span className="proof-label">{t("Marketplace status")}</span>
              <div className="proof-value">{locale === "en" ? formatApprovalStatusLabel(professional.approvalStatus) : localizeApprovalStatus(professional.approvalStatus, locale)}</div>
              <p className="proof-copy">{t("Only profiles reviewed for marketplace eligibility and currently active are listed publicly.")}</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Identity")}</span>
              <div className="proof-value">
                {t(formatIdentityVerificationLabel(professional.identityVerificationStatus))}
              </div>
              <p className="proof-copy">{t("Identity review and credential review are tracked separately.")}</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Categories")}</span>
              <div className="proof-value">{formatCategoryList(localizedCategories) || t("Profile")}</div>
              <p className="proof-copy">{t("Public categories this profile appears under.")}</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Location")}</span>
              <div className="proof-value">{profileLocation}</div>
              <p className="proof-copy">{t("Service area and availability context for this profile.")}</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Pricing")}</span>
              <div className="proof-value">{priceSummary ?? t("Contact for pricing")}</div>
              <p className="proof-copy">{t("Starting price context when this profile has chosen to list it.")}</p>
            </article>
          </div>

          <div className="button-row">
            <ProfessionalSaveButton
              professionalId={professional.id}
              professionalSlug={professional.profileSlug}
              professionalName={professional.displayName}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="marketplace-detail-grid">
          <article className="panel">
            <span className="stat-label">{t("Profile details")}</span>
            <h2 className="panel-title">{t("What to know before you reach out")}</h2>
            <ul>
              <li>
                <strong>{t("Location")}:</strong> {profileLocation}
              </li>
              <li>
                <strong>{t("Service modes")}:</strong>{" "}
                {professional.serviceModes.length > 0
                  ? professional.serviceModes.map((entry) => locale === "en" ? formatServiceModeLabel(entry) : localizeServiceMode(entry, locale)).join(", ")
                  : t("Flexible")}
              </li>
              {yearsExperience ? (
                <li>
                  <strong>{t("Experience")}:</strong> {yearsExperience}
                </li>
              ) : null}
              {availabilitySummary ? (
                <li>
                  <strong>{t("Availability")}:</strong> {availabilitySummary}
                </li>
              ) : null}
              <li>
                <strong>{t("New clients")}:</strong> {clientStatusLabel}
              </li>
            </ul>

            {professional.specialties.length > 0 ? (
              <>
                <span className="stat-label">{t("Specialties")}</span>
                <div className="tag-row">
                  {professional.specialties.map((specialty) => (
                    <span key={specialty} className="tag-chip">
                      {localizeMarketplaceSpecialty(specialty, locale)}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {languages.length > 0 ? (
              <>
                <span className="stat-label">{t("Languages")}</span>
                <div className="tag-row">
                  {languages.map((language) => (
                    <span key={language} className="tag-chip">
                      {t(language)}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>

          <article className="panel">
            <span className="stat-label">{t("Request consultation")}</span>
            <h2 className="panel-title">{t("Start the conversation with context.")}</h2>
            <p>
              {t("Send a short request with your goal, preferred service mode, and any helpful background. The person you contact can review it inside their Elevare account.")}
            </p>
            <InquiryForm professional={professional} />
            <ReportProfileForm professional={professional} />
            <div className="form-note">
              {t("Professionals are independent service providers and are not employees or agents of Elevare Fit LLC. Profile approval does not constitute an endorsement or guarantee of services. Confirm current credentials, licensing, insurance, and suitability before engaging a Professional.")}
            </div>
          </article>
        </div>
      </section>

      {localizedServices.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">{t("Services offered")}</div>
            <h2 className="section-title">{t("A quick look at how this profile works.")}</h2>
            <p className="section-copy">
              {t("Review the services, delivery options, and pricing details this professional currently offers.")}
            </p>
          </div>

          <div className="grid-3">
            {localizedServices.map((service) => (
              <article key={service.id} className="panel">
                <span className="meta-pill">
                  {service.serviceMode ? (locale === "en" ? formatServiceModeLabel(service.serviceMode) : localizeServiceMode(service.serviceMode, locale)) : t("Flexible")}
                </span>
                <h3>{service.name}</h3>
                <p>{service.description || t("Review this service directly with the person listed here when you reach out.")}</p>
                <ul>
                  {service.durationMinutes ? (
                    <li>
                      <strong>{t("Duration")}:</strong> {service.durationMinutes} {t("minutes")}
                    </li>
                  ) : null}
                  {service.price != null || service.contactForPricing ? (
                    <li>
                      <strong>{t("Pricing")}:</strong>{" "}
                      {locale === "en"
                        ? formatServicePriceSummary(service)
                        : formatLocalizedServicePrice(service, locale)}
                    </li>
                  ) : null}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {profileLinks.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">{t("Links")}</div>
            <h2 className="section-title">{t("Learn more about this professional.")}</h2>
          </div>
          <div className="button-row">
            {profileLinks.map((entry) => {
              const icon = profileLinkIcons[entry.type];

              return (
                <TrackedLink
                  key={entry.type}
                  className={`button button-secondary${icon ? " professional-social-icon-link" : " professional-website-link"}`}
                  href={entry.href}
                  eventName="professional_external_link_click"
                  eventParams={{ professional_slug: professional.profileSlug, link_type: entry.type }}
                  title={icon ? entry.label : undefined}
                >
                  {icon ? (
                    <>
                      <Image
                        src={icon.src}
                        width={icon.width}
                        height={icon.height}
                        alt=""
                        aria-hidden="true"
                      />
                      <span className="sr-only">{entry.label}</span>
                    </>
                  ) : entry.label}
                </TrackedLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {professional.credentials.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">{t("Credentials")}</div>
            <h2 className="section-title">{t("Public credentials listed on this profile.")}</h2>
            <p className="section-copy">
              {t("Only public-safe credential details are shown here. Identity review and credential review are not the same thing.")}
            </p>
          </div>

          <div className="grid-3">
            {professional.credentials.map((credential) => {
              const publicStatus = getCredentialPublicStatus(credential);

              return (
                <article key={credential.id} className="panel">
                  <span className="meta-pill">{t(publicStatus.label)}</span>
                  <h3>{credential.credentialName}</h3>
                  <p>
                    {credential.organizationName}
                    {credential.credentialType ? ` - ${credential.credentialType}` : ""}
                  </p>
                  <ul>
                    {credential.issueDate ? (
                      <li>
                        <strong>{t("Issued")}:</strong> {credential.issueDate}
                      </li>
                    ) : null}
                    {credential.expirationDate ? (
                      <li>
                        <strong>{t("Expires")}:</strong> {credential.expirationDate}
                      </li>
                    ) : null}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {relatedProfessionals.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">{t("You may also want to compare")}</div>
            <h2 className="section-title">{t("Similar profiles")}</h2>
            <p className="section-copy">{t("Compare a few similar profiles before deciding who you want to contact.")}</p>
          </div>
          <div className="professional-grid">
            {relatedProfessionals.map((entry) => (
              <ProfessionalCard
                key={entry.id}
                professional={entry}
                sourcePage={`professional_${professional.profileSlug}_related`}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="sr-only">{t("Related ElevareFit resources")}</h2>
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">{t("Related resource")}</span>
            <h3>{t("Calorie and macro tools")}</h3>
            <p>
              {t("Use the free calculators if you want more context before you reach out for nutrition or coaching support.")}
            </p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href={localizePathname("/calculators/", locale)}
                eventName="cta_click"
                eventParams={{ cta_name: "Browse calculators", cta_context: "professional_profile_related" }}
              >
                {t("Browse calculators")}
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">{t("Related resource")}</span>
            <h3>{t("Workout templates")}</h3>
            <p>{t("Explore structured workout templates if you want a clearer starting point before hiring support.")}</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href={localizePathname("/workouts/", locale)}
                eventName="cta_click"
                eventParams={{ cta_name: "Browse workouts", cta_context: "professional_profile_related" }}
              >
                {t("Browse workouts")}
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">{t("Tracking app")}</span>
            <h3>{t("Track progress with Logbook")}</h3>
            <p>
              {t("Keep your nutrition, workouts, and bodyweight in one place while you compare profiles or work with a coach.")}
            </p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href={localizePathname("/logbook/", locale)}
                eventName="cta_click"
                eventParams={{ cta_name: "Explore Logbook", cta_context: "professional_profile_related" }}
              >
                {t("Explore Logbook")}
              </TrackedLink>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

async function ProfessionalCategoryPage({ slug, locale = "en" }: { slug: string; locale?: Locale }) {
  const [category, categories, professionals] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);

  if (!category) {
    notFound();
  }

  const t = (value: string) => marketplaceText(locale, value);
  const localizedCategory = localizeMarketplaceCategory(category, locale);
  const faqs = buildLocalizedCategoryFaqs(category, locale) ?? buildCategoryFaqs(category);
  const categoryProfessionals = getProfessionalsByCategory(professionals, category.slug);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t("Find Support"),
          item: absoluteUrl(localizeProfessionalPath("/professionals", locale)),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: localizedCategory.label,
          item: absoluteUrl(localizeProfessionalPath(`/professionals/${category.slug}`, locale)),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: localizedCategory.label,
      url: absoluteUrl(localizeProfessionalPath(`/professionals/${category.slug}`, locale)),
      description: localizedCategory.shortDescription ?? buildCategoryIntro(category),
      inLanguage: locale,
      ...(categoryProfessionals.length > 0
        ? {
            mainEntity: {
              "@type": "ItemList",
              itemListElement: categoryProfessionals.slice(0, 24).map((professional, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: professional.displayName,
                url: absoluteUrl(localizeProfessionalPath(`/professionals/${professional.profileSlug}`, locale)),
              })),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <nav className="breadcrumbs" aria-label={t("Breadcrumb")}>
        <TrackedLink href={localizeProfessionalPath("/professionals/", locale)} eventName="breadcrumb_click" eventParams={{ destination: "professionals" }}>
          {t("Find Support")}
        </TrackedLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{localizedCategory.label}</span>
      </nav>

      <Suspense fallback={null}>
        <MarketplaceDirectory
          categories={categories}
          professionals={professionals}
          fixedCategorySlug={category.slug}
          sourcePage={`professional_category_${category.slug}`}
          heroEyebrow={t("Category")}
          heroTitle={localizedCategory.label}
          heroDescription={localizedCategory.shortDescription ?? buildCategoryIntro(category)}
          showCategoryCards={false}
          showHeroActions={false}
          showSecondaryExplanation={false}
        />
      </Suspense>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">{t("Questions people usually ask first.")}</h2>
          <p className="section-copy">{t("Use these answers as a starting point while you compare profiles in this category.")}</p>
        </div>
        <div className="grid-3">
          {faqs.map((faq) => (
            <article key={faq.question} className="panel">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <MarketplaceCategoryResources categorySlug={category.slug} locale={locale} />
    </div>
  );
}

export default async function ProfessionalRoutePage({ params }: ProfessionalRoutePageProps) {
  const { slug } = await params;
  const [category, professional] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceProfessionalBySlug(slug),
  ]);

  if (professional) {
    return <ProfessionalProfilePage slug={slug} />;
  }

  if (category) {
    return <ProfessionalCategoryPage slug={slug} />;
  }

  notFound();
}

export async function LocalizedProfessionalRoutePage({ slug, locale }: { slug: string; locale: Locale }) {
  const [category, professional] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceProfessionalBySlug(slug),
  ]);

  if (professional) return <ProfessionalProfilePage slug={slug} locale={locale} />;
  if (category) return <ProfessionalCategoryPage slug={slug} locale={locale} />;
  notFound();
}
