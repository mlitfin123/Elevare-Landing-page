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

  return (
    <article className="panel professional-card">
      <TrackedLink
        className="professional-card-link"
        href={localizeProfessionalPath(buildProfessionalPath(professional.profileSlug), locale)}
        eventName={eventName}
        eventParams={{
          source_page: sourcePage,
          professional_slug: professional.profileSlug,
          professional_name: professional.displayName,
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

          <div className="professional-stat-list">
            <span>{location}</span>
            {serviceModes ? <span>{serviceModes}</span> : null}
            {yearsExperience ? <span>{yearsExperience}</span> : null}
            {priceSummary ? <span>{priceSummary}</span> : null}
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

          <p className="professional-bio-snippet">
            {professional.bio || marketplaceText(locale, "View this profile to review specialties, services, pricing, and consultation details.")}
          </p>

          <span className="proof-action">{marketplaceText(locale, actionLabel)}</span>
        </div>
      </TrackedLink>
    </article>
  );
}
