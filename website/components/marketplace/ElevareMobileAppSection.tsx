import { TrackedLink } from "@/components/TrackedLink";
import { elevareMobileAppConfig } from "@/lib/site";

type ElevareMobileAppSectionProps = {
  sourcePage: string;
};

export function ElevareMobileAppSection({ sourcePage }: ElevareMobileAppSectionProps) {
  return (
    <section className="section">
      <div className="section-head section-head-compact">
        <div className="eyebrow">Mobile apps</div>
        <h2 className="section-title section-title-compact">{elevareMobileAppConfig.heading}</h2>
        <p className="section-copy">
          {elevareMobileAppConfig.description}
        </p>
      </div>

      <div className="grid-3">
        <article className="panel">
          <span className="stat-label">Mobile status</span>
          <div className="status-row">
            <span className="status-chip">{elevareMobileAppConfig.statusLabel}</span>
          </div>
          <h3>Web now, mobile next.</h3>
          <p>{elevareMobileAppConfig.webNowDescription}</p>
          <div className="tag-row" aria-label="Elevare mobile platform status">
            {elevareMobileAppConfig.platforms.map((platform) =>
              platform.available && platform.url ? (
                <TrackedLink
                  key={platform.label}
                  className="tag-chip"
                  href={platform.url}
                  eventName="cta_click"
                  eventParams={{
                    cta_name: `${platform.label} app link`,
                    cta_context: `${sourcePage}_mobile_apps`,
                    product: "Elevare",
                  }}
                >
                  {platform.label}
                </TrackedLink>
              ) : (
                <span key={platform.label} className="tag-chip" aria-label={`${platform.label} coming soon`}>
                  {platform.label} - Coming Soon
                </span>
              ),
            )}
          </div>
        </article>

        <article className="panel">
          <span className="stat-label">Account continuity</span>
          <h3>{elevareMobileAppConfig.continuityTitle}</h3>
          <p>{elevareMobileAppConfig.continuityDescription}</p>
        </article>

        <article className="panel">
          <span className="stat-label">For pros</span>
          <h3>{elevareMobileAppConfig.proTitle}</h3>
          <p>{elevareMobileAppConfig.proDescription}</p>
          <p>{elevareMobileAppConfig.proCarryOverDescription}</p>
          <div className="button-row">
            <TrackedLink
              className="button button-secondary"
              href="/account/professional-profile/"
              eventName="cta_click"
              eventParams={{
                cta_name: "Join as a Pro",
                cta_context: `${sourcePage}_mobile_apps`,
                product: "Elevare",
              }}
            >
              Join as a Pro
            </TrackedLink>
          </div>
        </article>
      </div>
    </section>
  );
}
