import { Suspense } from "react";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/marketplace/InquiryForm";
import { MarketplaceCategoryResources } from "@/components/marketplace/MarketplaceCategoryResources";
import { MarketplaceDirectory } from "@/components/marketplace/MarketplaceDirectory";
import { ProfessionalCard } from "@/components/marketplace/ProfessionalCard";
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

export async function generateMetadata({ params }: ProfessionalRoutePageProps) {
  const { slug } = await params;
  const [category, professional, professionals] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceProfessionalBySlug(slug),
    getMarketplaceProfessionals(),
  ]);

  if (professional) {
    return buildMetadata({
      title: buildMarketplaceProfessionalSeoTitle(professional),
      description: buildMarketplaceProfessionalMetaDescription(professional),
      pathname: `/professionals/${professional.profileSlug}`,
      imageUrl: professional.profilePhotoUrl ?? undefined,
    });
  }

  if (category) {
    const isIndexable = isMarketplaceCategoryIndexable(category, professionals);

    return buildMetadata({
      title: `${getMarketplaceCategorySeoLabel(category)} | Elevare`,
      description: buildMarketplaceCategoryMetaDescription(category),
      pathname: `/professionals/${category.slug}`,
      robots: isIndexable ? undefined : { index: false, follow: true },
    });
  }

  return buildMetadata({
    title: "Profile page not found",
    description: "The requested marketplace profile could not be found.",
    pathname: `/professionals/${slug}`,
    robots: { index: false, follow: false },
  });
}

async function ProfessionalProfilePage({ slug }: { slug: string }) {
  const [professional, professionals] = await Promise.all([
    getMarketplaceProfessionalBySlug(slug),
    getMarketplaceProfessionals(),
  ]);

  if (!professional) {
    notFound();
  }

  const relatedProfessionals = getRelatedProfessionals(professional, professionals, 3);
  const yearsExperience = formatYearsExperience(professional.yearsExperience);
  const priceSummary = formatPriceSummary(professional);
  const publicBadges = getProfessionalPublicBadges(professional);
  const clientStatusLabel = professional.clientAcceptanceStatus === "waitlist"
    ? "Accepting waitlist requests"
    : professional.clientAcceptanceStatus === "not_accepting"
      ? "Not accepting new clients"
      : "Accepting new clients";
  const profileLinks = [
    { label: "Website", href: professional.websiteUrl },
    { label: "Instagram", href: professional.socialLinks.instagram },
    { label: "TikTok", href: professional.socialLinks.tiktok },
    { label: "YouTube", href: professional.socialLinks.youtube },
    { label: "LinkedIn", href: professional.socialLinks.linkedin },
  ].filter((entry): entry is { label: string; href: string } => Boolean(entry.href));
  const primaryCategory = professional.categories.find((category) => category.isPrimary) ?? professional.categories[0] ?? null;
  const profileLocation = formatPublicLocationLabel(professional);
  const profilePhotoAlt = `${professional.displayName}, ${professional.professionalTitle || primaryCategory?.label || "professional"}, ${profileLocation}`;
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Find Support",
      item: absoluteUrl("/professionals"),
    },
    ...(primaryCategory
      ? [
          {
            "@type": "ListItem",
            position: 2,
            name: primaryCategory.label,
            item: absoluteUrl(`/professionals/${primaryCategory.slug}`),
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: primaryCategory ? 3 : 2,
      name: professional.displayName,
      item: absoluteUrl(`/professionals/${professional.profileSlug}`),
    },
  ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems,
    },
    buildProfessionalSchema(professional, siteConfig.url),
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <TrackedLink href="/professionals/" eventName="breadcrumb_click" eventParams={{ destination: "professionals" }}>
          Find Support
        </TrackedLink>
        {primaryCategory ? (
          <>
            <span aria-hidden="true">/</span>
            <TrackedLink
              href={`/professionals/${primaryCategory.slug}/`}
              eventName="breadcrumb_click"
              eventParams={{ destination: primaryCategory.slug }}
            >
              {primaryCategory.label}
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
          <div className="eyebrow">Profile</div>
          <h1>{professional.displayName}</h1>
          <p className="professional-title-copy professional-title-copy-large">
            {professional.professionalTitle || formatCategoryList(professional.categories) || "Profile"}
          </p>
          <p>{professional.bio}</p>

          {publicBadges.length > 0 ? (
            <div className="tag-row">
              {publicBadges.map((badge) => (
                <span key={badge} className="verification-pill">
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          <div className="hero-proof professional-summary-grid">
            <article className="proof-card">
              <span className="proof-label">Marketplace status</span>
              <div className="proof-value">{formatApprovalStatusLabel(professional.approvalStatus)}</div>
              <p className="proof-copy">Only profiles reviewed for marketplace eligibility and currently active are listed publicly.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">Identity</span>
              <div className="proof-value">
                {formatIdentityVerificationLabel(professional.identityVerificationStatus)}
              </div>
              <p className="proof-copy">Identity review and credential review are tracked separately.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">Categories</span>
              <div className="proof-value">{formatCategoryList(professional.categories) || "Profile"}</div>
              <p className="proof-copy">Public categories this profile appears under.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">Location</span>
              <div className="proof-value">{profileLocation}</div>
              <p className="proof-copy">Service area and availability context for this profile.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">Pricing</span>
              <div className="proof-value">{priceSummary ?? "Contact for pricing"}</div>
              <p className="proof-copy">Starting price context when this profile has chosen to list it.</p>
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
            <span className="stat-label">Profile details</span>
            <h2 className="panel-title">What to know before you reach out</h2>
            <ul>
              <li>
                <strong>Location:</strong> {profileLocation}
              </li>
              <li>
                <strong>Service modes:</strong>{" "}
                {professional.serviceModes.length > 0
                  ? professional.serviceModes.map((entry) => formatServiceModeLabel(entry)).join(", ")
                  : "Flexible"}
              </li>
              {yearsExperience ? (
                <li>
                  <strong>Experience:</strong> {yearsExperience}
                </li>
              ) : null}
              {professional.availabilitySummary ? (
                <li>
                  <strong>Availability:</strong> {professional.availabilitySummary}
                </li>
              ) : null}
              <li>
                <strong>New clients:</strong> {clientStatusLabel}
              </li>
            </ul>

            {professional.specialties.length > 0 ? (
              <>
                <span className="stat-label">Specialties</span>
                <div className="tag-row">
                  {professional.specialties.map((specialty) => (
                    <span key={specialty} className="tag-chip">
                      {specialty}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>

          <article className="panel">
            <span className="stat-label">Request consultation</span>
            <h2 className="panel-title">Start the conversation with context.</h2>
            <p>
              Send a short request with your goal, preferred service mode, and any helpful background. The
              person you contact can review it inside their Elevare account.
            </p>
            <InquiryForm professional={professional} />
            <ReportProfileForm professional={professional} />
            <div className="form-note">
              Professionals are independent service providers and are not employees or agents of Elevare Fit LLC.
              Profile approval does not constitute an endorsement or guarantee of services. Confirm current
              credentials, licensing, insurance, and suitability before engaging a Professional.
            </div>
          </article>
        </div>
      </section>

      {professional.services.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Services offered</div>
            <h2 className="section-title">A quick look at how this profile works.</h2>
            <p className="section-copy">
              Review the services, delivery options, and pricing details this professional currently offers.
            </p>
          </div>

          <div className="grid-3">
            {professional.services.map((service) => (
              <article key={service.id} className="panel">
                <span className="meta-pill">
                  {service.serviceMode ? formatServiceModeLabel(service.serviceMode) : "Flexible"}
                </span>
                <h3>{service.name}</h3>
                <p>{service.description || "Review this service directly with the person listed here when you reach out."}</p>
                <ul>
                  {service.durationMinutes ? (
                    <li>
                      <strong>Duration:</strong> {service.durationMinutes} minutes
                    </li>
                  ) : null}
                  {service.price != null || service.contactForPricing ? (
                    <li>
                      <strong>Pricing:</strong>{" "}
                      {formatServicePriceSummary(service)}
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
            <div className="eyebrow">Links</div>
            <h2 className="section-title">Learn more about this professional.</h2>
          </div>
          <div className="button-row">
            {profileLinks.map((entry) => (
              <TrackedLink
                key={entry.label}
                className="button button-secondary"
                href={entry.href}
                eventName="professional_external_link_click"
                eventParams={{ professional_slug: professional.profileSlug, link_type: entry.label.toLowerCase() }}
              >
                {entry.label}
              </TrackedLink>
            ))}
          </div>
        </section>
      ) : null}

      {professional.credentials.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Credentials</div>
            <h2 className="section-title">Public credentials listed on this profile.</h2>
            <p className="section-copy">
              Only public-safe credential details are shown here. Identity review and credential review are not the same thing.
            </p>
          </div>

          <div className="grid-3">
            {professional.credentials.map((credential) => {
              const publicStatus = getCredentialPublicStatus(credential);

              return (
                <article key={credential.id} className="panel">
                  <span className="meta-pill">{publicStatus.label}</span>
                  <h3>{credential.credentialName}</h3>
                  <p>
                    {credential.organizationName}
                    {credential.credentialType ? ` - ${credential.credentialType}` : ""}
                  </p>
                  <ul>
                    {credential.issueDate ? (
                      <li>
                        <strong>Issued:</strong> {credential.issueDate}
                      </li>
                    ) : null}
                    {credential.expirationDate ? (
                      <li>
                        <strong>Expires:</strong> {credential.expirationDate}
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
            <div className="eyebrow">You may also want to compare</div>
            <h2 className="section-title">Similar profiles</h2>
            <p className="section-copy">Compare a few similar profiles before deciding who you want to contact.</p>
          </div>
          <div className="professional-grid">
            {relatedProfessionals.map((entry) => (
              <ProfessionalCard
                key={entry.id}
                professional={entry}
                sourcePage={`professional_${professional.profileSlug}_related`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="sr-only">Related ElevareFit resources</h2>
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Related resource</span>
            <h3>Calorie and macro tools</h3>
            <p>
              Use the free calculators if you want more context before you reach out for nutrition or coaching support.
            </p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/calculators/"
                eventName="cta_click"
                eventParams={{ cta_name: "Browse calculators", cta_context: "professional_profile_related" }}
              >
                Browse calculators
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">Related resource</span>
            <h3>Workout templates</h3>
            <p>Explore structured workout templates if you want a clearer starting point before hiring support.</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/workouts/"
                eventName="cta_click"
                eventParams={{ cta_name: "Browse workouts", cta_context: "professional_profile_related" }}
              >
                Browse workouts
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">Tracking app</span>
            <h3>Track progress with Logbook</h3>
            <p>
              Keep your nutrition, workouts, and bodyweight in one place while you compare profiles or work with a coach.
            </p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/logbook/"
                eventName="cta_click"
                eventParams={{ cta_name: "Explore Logbook", cta_context: "professional_profile_related" }}
              >
                Explore Logbook
              </TrackedLink>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

async function ProfessionalCategoryPage({ slug }: { slug: string }) {
  const [category, categories, professionals] = await Promise.all([
    getMarketplaceCategoryBySlug(slug),
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);

  if (!category) {
    notFound();
  }

  const faqs = buildCategoryFaqs(category);
  const categoryProfessionals = getProfessionalsByCategory(professionals, category.slug);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Find Support",
          item: absoluteUrl("/professionals"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: category.label,
          item: absoluteUrl(`/professionals/${category.slug}`),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.label,
      url: absoluteUrl(`/professionals/${category.slug}`),
      description: category.shortDescription ?? buildCategoryIntro(category),
      ...(categoryProfessionals.length > 0
        ? {
            mainEntity: {
              "@type": "ItemList",
              itemListElement: categoryProfessionals.slice(0, 24).map((professional, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: professional.displayName,
                url: absoluteUrl(`/professionals/${professional.profileSlug}`),
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

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <TrackedLink href="/professionals/" eventName="breadcrumb_click" eventParams={{ destination: "professionals" }}>
          Find Support
        </TrackedLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.label}</span>
      </nav>

      <Suspense fallback={null}>
        <MarketplaceDirectory
          categories={categories}
          professionals={professionals}
          fixedCategorySlug={category.slug}
          sourcePage={`professional_category_${category.slug}`}
          heroEyebrow="Category"
          heroTitle={category.label}
          heroDescription={buildCategoryIntro(category)}
          showCategoryCards={false}
          showHeroActions={false}
          showSecondaryExplanation={false}
        />
      </Suspense>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Questions people usually ask first.</h2>
          <p className="section-copy">Use these answers as a starting point while you compare profiles in this category.</p>
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

      <MarketplaceCategoryResources categorySlug={category.slug} />
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
