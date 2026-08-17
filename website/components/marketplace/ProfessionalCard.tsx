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

type ProfessionalCardProps = {
  professional: ProfessionalProfileRecord;
  sourcePage: string;
  actionLabel?: string;
  eventName?: string;
  eventParams?: AnalyticsEventParams;
};

export function ProfessionalCard({
  professional,
  sourcePage,
  actionLabel = "View profile",
  eventName = "professional_profile_viewed",
  eventParams,
}: ProfessionalCardProps) {
  const priceSummary = formatPriceSummary(professional);
  const yearsExperience = formatYearsExperience(professional.yearsExperience);
  const categoryList = formatCategoryList(professional.categories);
  const serviceModes = professional.serviceModes.map((entry) => formatServiceModeLabel(entry)).join(" / ");
  const publicBadges = getProfessionalPublicBadges(professional);

  return (
    <article className="panel professional-card">
      <TrackedLink
        className="professional-card-link"
        href={buildProfessionalPath(professional.profileSlug)}
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
              alt={`${professional.displayName} profile photo`}
            />
          ) : (
            <div className="professional-avatar-fallback" aria-hidden="true">
              {getProfessionalInitials(professional.displayName)}
            </div>
          )}
        </div>

        <div className="professional-card-body">
          <div className="professional-card-topline">
            <span className="meta-pill">{categoryList || "Profile"}</span>
            {publicBadges.map((badge) => (
              <span key={badge} className="verification-pill">
                {badge}
              </span>
            ))}
          </div>

          <h3>{professional.displayName}</h3>
          <p className="professional-title-copy">
            {professional.professionalTitle || professional.categories[0]?.label || "Profile"}
          </p>

          <div className="professional-stat-list">
            <span>{formatLocationLabel(professional)}</span>
            {serviceModes ? <span>{serviceModes}</span> : null}
            {yearsExperience ? <span>{yearsExperience}</span> : null}
            {priceSummary ? <span>{priceSummary}</span> : null}
          </div>

          {professional.specialties.length > 0 ? (
            <div className="tag-row">
              {professional.specialties.slice(0, 4).map((specialty) => (
                <span key={specialty} className="tag-chip">
                  {specialty}
                </span>
              ))}
            </div>
          ) : null}

          <p className="professional-bio-snippet">
            {professional.bio || "View this profile to review specialties, services, pricing, and consultation details."}
          </p>

          <span className="proof-action">{actionLabel}</span>
        </div>
      </TrackedLink>
    </article>
  );
}
