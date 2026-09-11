import Image from "next/image";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { InquiryForm } from "@/components/marketplace/InquiryForm";
import { MarketplaceCategoryResources } from "@/components/marketplace/MarketplaceCategoryResources";
import { MarketplaceDirectory } from "@/components/marketplace/MarketplaceDirectory";
import { ProfessionalCard } from "@/components/marketplace/ProfessionalCard";
import { PublicProfessionalTrustSummary } from "@/components/marketplace/PublicProfessionalTrustSummary";
import { ProfessionalProfileViewTracker } from "@/components/marketplace/ProfessionalProfileViewTracker";
import { ProfessionalSaveButton } from "@/components/marketplace/ProfessionalSaveButton";
import { ReportProfileForm } from "@/components/marketplace/ReportProfileForm";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import {
  getMarketplaceCanonicalSlug,
  getMarketplaceCategories,
  getMarketplaceCategoryBySlug,
  getMarketplaceProfessionalBySlug,
  getMarketplaceProfessionals,
} from "@/lib/marketplace";
import {
  buildCategoryFaqs,
  buildCategoryIntro,
  buildProfessionalSchema,
  formatCategoryList,
  formatPublicLocationLabel,
  formatPriceSummary,
  formatServicePriceSummary,
  formatServiceModeLabel,
  formatYearsExperience,
  getCredentialPublicStatus,
  getMarketplaceRotationSeed,
  getProfessionalInitials,
  getRelatedProfessionals,
  toProfessionalDirectoryRecords,
  getProfessionalsByCategory,
} from "@/lib/marketplace-helpers";
import {
  buildMarketplaceCategoryMetaDescription,
  buildMarketplaceProfessionalMetaDescription,
  buildMarketplaceProfessionalSeoTitle,
  getMarketplaceCategorySeoLabel,
  hasMarketplaceFilterSearchParams,
  isMarketplaceCategoryIndexable,
} from "@/lib/marketplace-seo";
import { absoluteUrl, buildMetadata, siteConfig } from "@/lib/site";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, isLocalizedIndexingEnabled, localizePathname } from "@/lib/i18n/config";
import {
  buildLocalizedCategoryFaqs,
  formatLocalizedProfessionalPrice,
  formatLocalizedServicePrice,
  formatMarketplaceYears,
  getLocalizedProfessionalMetadataCopy,
  localizeGeneratedCategoryService,
  localizeMarketplaceAvailability,
  localizeMarketplaceCategory,
  localizeMarketplaceLocation,
  localizeMarketplaceSpecialty,
  localizeProfessionalPath,
  localizeServiceMode,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";
import {
  CONSULTATION_TYPE_OPTIONS,
  formatWebsiteLinkLabel,
  PROFESSIONAL_EXPERIENCE_LEVEL_OPTIONS,
  PROFESSIONAL_GOAL_OPTIONS,
} from "@/lib/professional-profile";

type ProfessionalRoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getMarketplaceCategories()).map((category) => ({ slug: category.slug }));
}

export async function buildProfessionalRouteMetadata(
  slug: string,
  locale: Locale = "en",
  filteredSearch = false,
) {
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
      robots: !isIndexable || filteredSearch || (locale !== "en" && !isLocalizedIndexingEnabled()) ? { index: false, follow: true } : undefined,
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

export async function generateMetadata({ params, searchParams }: ProfessionalRoutePageProps) {
  const { slug } = await params;
  return buildProfessionalRouteMetadata(slug, "en", hasMarketplaceFilterSearchParams(await searchParams));
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
  const serviceModeSummary = professional.serviceModes.length > 0
    ? professional.serviceModes
      .map((entry) => locale === "en" ? formatServiceModeLabel(entry) : localizeServiceMode(entry, locale))
      .join(", ")
    : t("Flexible");
  const goalLabels = professional.goalTags.map((goal) => (
    PROFESSIONAL_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? goal.replaceAll("_", " ")
  ));
  const experienceLevelLabels = professional.experienceLevelsServed.map((level) => (
    PROFESSIONAL_EXPERIENCE_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level.replaceAll("_", " ")
  ));
  const availabilityConfirmedLabel = (() => {
    if (!professional.availabilityConfirmedAt) return null;
    const date = new Date(professional.availabilityConfirmedAt);
    if (Number.isNaN(date.getTime())) return null;
    const dateLocale = locale === "pt-BR" ? "pt-BR" : locale === "es-419" ? "es-419" : "en-US";
    return new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(date);
  })();
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
          <div className="eyebrow">{localizedPrimaryCategory?.label ?? t("Profile")}</div>
          <h1>{professional.displayName}</h1>
          <p className="professional-title-copy professional-title-copy-large">
            {professional.professionalTitle || formatCategoryList(localizedCategories) || t("Profile")}
          </p>
          <p>{professional.publicHeadline || professional.bestFitSummary || professional.bio}</p>

          <div className="professional-stat-list">
            <span>{profileLocation}</span>
            <span>{serviceModeSummary}</span>
            <span>{clientStatusLabel}</span>
          </div>

          <div className="hero-proof professional-summary-grid">
            <article className="proof-card">
              <span className="proof-label">{t("Category")}</span>
              <div className="proof-value">{formatCategoryList(localizedCategories) || t("Profile")}</div>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Location")}</span>
              <div className="proof-value">{profileLocation}</div>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Services")}</span>
              <div className="proof-value">{serviceModeSummary}</div>
            </article>
            <article className="proof-card">
              <span className="proof-label">{t("Pricing from")}</span>
              <div className="proof-value">{priceSummary ?? t("Contact for pricing")}</div>
            </article>
          </div>

          <div className="button-row">
            <ProfessionalSaveButton professionalId={professional.id} />
          </div>
        </div>
      </section>

      <PublicProfessionalTrustSummary professional={professional} />

      {localizedServices.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">{t("Services and pricing")}</div>
            <h2 className="section-title">{t("Choose the support that fits your needs.")}</h2>
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
                  {service.intendedFor ? (
                    <li><strong>{t("Best for")}:</strong> {service.intendedFor}</li>
                  ) : null}
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
                  {service.deliveryCadence ? (
                    <li><strong>{t("Delivery cadence")}:</strong> {service.deliveryCadence}</li>
                  ) : null}
                  {service.minimumCommitment ? (
                    <li><strong>{t("Minimum commitment")}:</strong> {service.minimumCommitment}</li>
                  ) : null}
                  <li>
                    <strong>{t("Consultation")}:</strong>{" "}
                    {t(CONSULTATION_TYPE_OPTIONS.find((option) => option.value === service.consultationType)?.label ?? "Ask for details")}
                  </li>
                </ul>
                {service.includedItems.length > 0 ? (
                  <>
                    <span className="stat-label">{t("What is included")}</span>
                    <ul>{service.includedItems.map((item) => <li key={item}>{item}</li>)}</ul>
                  </>
                ) : null}
                {service.additionalCostsNote ? (
                  <p className="form-note"><strong>{t("Additional costs or requirements")}:</strong> {service.additionalCostsNote}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">{t("Client fit")}</div>
          <h2 className="section-title">{t("Who this professional is best suited to help.")}</h2>
          {professional.bestFitSummary ? <p className="section-copy">{professional.bestFitSummary}</p> : null}
        </div>
        <div className="grid-3">
          {goalLabels.length > 0 ? (
            <article className="panel">
              <span className="stat-label">{t("Common client goals")}</span>
              <div className="tag-row">
                {goalLabels.map((goal) => <span key={goal} className="tag-chip">{t(goal)}</span>)}
              </div>
            </article>
          ) : null}
          {professional.specialties.length > 0 ? (
            <article className="panel">
              <span className="stat-label">{t("Specialties")}</span>
              <div className="tag-row">
                {professional.specialties.map((specialty) => (
                  <span key={specialty} className="tag-chip">{localizeMarketplaceSpecialty(specialty, locale)}</span>
                ))}
              </div>
            </article>
          ) : null}
          {experienceLevelLabels.length > 0 || languages.length > 0 ? (
            <article className="panel">
              {experienceLevelLabels.length > 0 ? (
                <>
                  <span className="stat-label">{t("Experience levels served")}</span>
                  <div className="tag-row">
                    {experienceLevelLabels.map((level) => <span key={level} className="tag-chip">{t(level)}</span>)}
                  </div>
                </>
              ) : null}
              {languages.length > 0 ? (
                <>
                  <span className="stat-label">{t("Languages")}</span>
                  <div className="tag-row">
                    {languages.map((language) => <span key={language} className="tag-chip">{t(language)}</span>)}
                  </div>
                </>
              ) : null}
            </article>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">{t("Experience and approach")}</div>
          <h2 className="section-title">{t("How this professional works.")}</h2>
        </div>
        <div className="marketplace-detail-grid">
          <article className="panel">
            {yearsExperience ? <p><strong>{t("Experience")}:</strong> {yearsExperience}</p> : null}
            <p>{professional.bio}</p>
          </article>
          {professional.coachingStyle ? (
            <article className="panel">
              <span className="stat-label">{t("Coaching or training style")}</span>
              <p>{professional.coachingStyle}</p>
            </article>
          ) : null}
        </div>
      </section>

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
                  eventParams={{ source_page: "professional_profile", link_type: entry.type }}
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
                        <strong>{t("Issued")}:</strong> {formatDate(credential.issueDate, locale, { dateStyle: "medium" })}
                      </li>
                    ) : null}
                    {credential.expirationDate ? (
                      <li>
                        <strong>{t("Expires")}:</strong> {formatDate(credential.expirationDate, locale, { dateStyle: "medium" })}
                      </li>
                    ) : null}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">{t("Working together")}</div>
          <h2 className="section-title">{t("What to expect before you reach out.")}</h2>
        </div>
        <div className="marketplace-detail-grid">
          <article className="panel">
            <span className="stat-label">{t("Availability")}</span>
            <h3>{clientStatusLabel}</h3>
            {availabilitySummary ? <p>{availabilitySummary}</p> : null}
            {availabilityConfirmedLabel ? (
              <p className="form-note">{t("Availability last confirmed")}: {availabilityConfirmedLabel}</p>
            ) : null}
            {professional.consultationExpectations ? (
              <>
                <span className="stat-label">{t("After you request a consultation")}</span>
                <p>{professional.consultationExpectations}</p>
              </>
            ) : null}
            {professional.serviceBoundaries ? (
              <>
                <span className="stat-label">{t("Service boundaries")}</span>
                <p>{professional.serviceBoundaries}</p>
              </>
            ) : null}
          </article>

          <article className="panel">
            <span className="stat-label">{t("Request consultation")}</span>
            <h2 className="panel-title">{t("Start the conversation with context.")}</h2>
            <p>
              {t("Send a short request with your goal, preferred service mode, and any helpful background. The professional can review it inside their Elevare account.")}
            </p>
            <InquiryForm professional={professional} />
            <ReportProfileForm professional={professional} />
            <div className="form-note">
              {t("Professionals are independent service providers and are not employees or agents of Elevare Fit LLC. Profile approval does not constitute an endorsement or guarantee of services. Confirm current credentials, licensing, insurance, and suitability before engaging a Professional.")}
            </div>
          </article>
        </div>
      </section>

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
                sourcePage="professional_profile_related"
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
  const directoryProfessionals = toProfessionalDirectoryRecords(professionals);
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
          professionals={directoryProfessionals}
          fixedCategorySlug={category.slug}
          sourcePage={`professional_category_${category.slug}`}
          rotationSeed={getMarketplaceRotationSeed(`professional-category-${category.slug}-${locale}`)}
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

  const canonical = await getMarketplaceCanonicalSlug(slug);
  if (canonical) permanentRedirect(`/professionals/${canonical}/`);
  notFound();
}

export async function LocalizedProfessionalRoutePage({ slug, locale }: { slug: string; locale: Locale }) {
  const [category, professional] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceProfessionalBySlug(slug),
  ]);

  if (professional) return <ProfessionalProfilePage slug={slug} locale={locale} />;
  if (category) return <ProfessionalCategoryPage slug={slug} locale={locale} />;
  const canonical = await getMarketplaceCanonicalSlug(slug);
  if (canonical) permanentRedirect(localizeProfessionalPath(`/professionals/${canonical}/`, locale));
  notFound();
}
