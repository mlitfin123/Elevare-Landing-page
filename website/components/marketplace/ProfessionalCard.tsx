import { TrackedLink } from "@/components/TrackedLink";
import type { AnalyticsEventParams } from "@/lib/analytics";
import {
  buildProfessionalPath,
  formatCategoryList,
  formatLocationLabel,
  formatPriceSummary,
  formatServiceModeLabel,
  formatYearsExperience,
  getProfessionalInitials,
  getProfessionalPublicBadges,
} from "@/lib/marketplace-helpers";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";
import type { Locale } from "@/lib/i18n/config";
import {
  formatLocalizedProfessionalPrice,
  formatMarketplaceYears,
  localizeMarketplaceCategory,
  localizeMarketplaceLocation,
  localizeMarketplaceSpecialty,
  localizeProfessionalPath,
  localizeServiceMode,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";
import { PROFESSIONAL_GOAL_OPTIONS } from "@/lib/professional-profile";

type ProfessionalCardProps = {
  professional: ProfessionalProfileRecord;
  sourcePage: string;
  actionLabel?: string;
  eventName?: string;
  eventParams?: AnalyticsEventParams;
  locale?: Locale;
};

export function ProfessionalCard({
  professional,
  sourcePage,
  actionLabel = "View profile",
  eventName = "professional_profile_viewed",
  eventParams,
  locale = "en",
}: ProfessionalCardProps) {
  const priceSummary = locale === "en"
    ? formatPriceSummary(professional)
    : formatLocalizedProfessionalPrice(professional, locale);
  const yearsExperience = locale === "en"
    ? formatYearsExperience(professional.yearsExperience)
    : formatMarketplaceYears(professional.yearsExperience, locale);
  const localizedCategories = professional.categories.map((category) => localizeMarketplaceCategory(category, locale));
  const categoryList = formatCategoryList(localizedCategories);
  const serviceModes = professional.serviceModes
    .map((entry) => locale === "en" ? formatServiceModeLabel(entry) : localizeServiceMode(entry, locale))
    .join(" / ");
  const publicBadges = getProfessionalPublicBadges(professional);
  const rawLocation = formatLocationLabel(professional);
  const location = localizeMarketplaceLocation(rawLocation, locale);
  const acceptanceLabel = marketplaceText(locale, professional.clientAcceptanceStatus === "waitlist"
    ? "Waitlist available"
    : professional.clientAcceptanceStatus === "not_accepting"
      ? "Not accepting new clients"
      : "Accepting new clients");
  const goalLabels = professional.goalTags.map((goal) => (
    PROFESSIONAL_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? goal.replaceAll("_", " ")
  ));

  return (
    <article className="panel professional-card">
      <TrackedLink
        className="professional-card-link"
        href={localizeProfessionalPath(buildProfessionalPath(professional.profileSlug), locale)}
        eventName={eventName}
        eventParams={{
          source_page: sourcePage,
          accepting_status: professional.clientAcceptanceStatus,
          has_price: Boolean(priceSummary),
          ...eventParams,
        }}
      >
        <div className="professional-card-media">
          {professional.profilePhotoUrl ? (
            <img
              className="professional-avatar-image"
              src={professional.profilePhotoUrl}
              alt={`${professional.displayName}, ${professional.professionalTitle || categoryList || marketplaceText(locale, "professional")}${
                rawLocation !== "Location not listed"
                  ? `, ${location}`
                  : ""
              }`}
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="professional-avatar-fallback" aria-hidden="true">
              {getProfessionalInitials(professional.displayName)}
            </div>
          )}
        </div>

        <div className="professional-card-body">
          <div className="professional-card-topline">
            <span className="meta-pill">{categoryList || marketplaceText(locale, "Profile")}</span>
            {publicBadges.map((badge) => (
              <span key={badge} className="verification-pill">
                {marketplaceText(locale, badge)}
              </span>
            ))}
          </div>

          <h3>{professional.displayName}</h3>
          <p className="professional-title-copy">
            {professional.professionalTitle || localizedCategories[0]?.label || marketplaceText(locale, "Profile")}
          </p>
          {professional.publicHeadline ? <p className="professional-card-headline">{professional.publicHeadline}</p> : null}

          <div className="professional-stat-list">
            <span>{location}</span>
            {serviceModes ? <span>{serviceModes}</span> : null}
            {yearsExperience ? <span>{yearsExperience}</span> : null}
            {priceSummary ? <span>{priceSummary}</span> : null}
            <span>{acceptanceLabel}</span>
          </div>

          {professional.specialties.length > 0 ? (
            <div className="tag-row">
              {professional.specialties.slice(0, 4).map((specialty) => (
                <span key={specialty} className="tag-chip">
                  {localizeMarketplaceSpecialty(specialty, locale)}
                </span>
              ))}
            </div>
          ) : null}

          {goalLabels.length > 0 ? (
            <div className="tag-row" aria-label={marketplaceText(locale, "Client goals")}>
              {goalLabels.slice(0, 3).map((goal) => <span key={goal} className="tag-chip">{marketplaceText(locale, goal)}</span>)}
            </div>
          ) : null}

          <p className="professional-bio-snippet">
            {professional.bestFitSummary || professional.publicHeadline || marketplaceText(locale, "View this profile to review specialties, services, pricing, and consultation details.")}
          </p>

          <span className="proof-action">{marketplaceText(locale, actionLabel)}</span>
        </div>
      </TrackedLink>
    </article>
  );
}
