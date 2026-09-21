import Link from "next/link";
import Image from "next/image";
import { LanguageSelector } from "@/components/localization/LanguageSelector";
import { StageLabStartActions, StageLabStartImage } from "@/components/stagelab/StageLabStartActions";
import { StageLabStartVideo } from "@/components/stagelab/StageLabStartVideo";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import { productConfig, siteConfig } from "@/lib/site";
import { stageLabStartMessages } from "@/lib/stagelab-start";

const physiqueImage = "/blog-posts/mens-physique-classic-physique-prep-4-weeks-out/recommendation-visual.png";
const posingImage = "/stagelab/posing-analysis-example.jpg";
const weeklyImage = "/blog-posts/mens-physique-classic-physique-prep-10-weeks-out/recommendation.png";

export function StageLabStartPage({ locale }: { locale: Locale }) {
  const copy = stageLabStartMessages[locale];
  const ios = productConfig.StageLab.storeLinks?.find((link) => link.store === "ios");
  const android = productConfig.StageLab.storeLinks?.find((link) => link.store === "android");
  if (!ios || !android) throw new Error("StageLab store destinations are not configured");

  const actions = (placement: "hero" | "footer") => (
    <StageLabStartActions
      placement={placement} locale={locale} iosHref={ios.href} androidHref={android.href}
      download={copy.download} iosLabel={copy.ios} androidLabel={copy.android}
      groupLabel={copy.storeGroup}
    />
  );

  return (
    <div className="stagelab-start">
      <div className="stagelab-start-wrap">
        <div className="stagelab-start-top">
          <Link className="stagelab-start-brand" href={localizePathname("/stagelab/", locale)} aria-label={copy.more}>
            <Image src="/stagelab-logo.webp" alt="" width={44} height={44} priority />
            <span>StageLab</span>
          </Link>
          <LanguageSelector />
        </div>

        <div>
          <section className="stagelab-start-hero" aria-labelledby="stagelab-start-title">
            <p className="stagelab-start-eyebrow">{copy.eyebrow}</p>
            <h1 id="stagelab-start-title">{copy.title}</h1>
            <p className="stagelab-start-lead">{copy.description}</p>
            <div className="stagelab-start-offers">
              <div className="stagelab-start-offer">
                <h2>{copy.freeTitle}</h2>
                <p>{copy.freeBody}</p>
              </div>
              <div className="stagelab-start-offer">
                <h2>{copy.trialTitle}</h2>
                <p>{copy.trialBody}</p>
                <p className="stagelab-start-offer-terms">{copy.trialTerms}</p>
              </div>
            </div>
            <p className="stagelab-start-separate">{copy.separateOffers}</p>
            {actions("hero")}
            <p className="stagelab-start-next">{copy.nextStep}</p>
          </section>

          <section className="stagelab-start-video" aria-labelledby="stagelab-start-video-title">
            <div className="stagelab-start-video-copy">
              <h2 id="stagelab-start-video-title">{copy.videoHeading}</h2>
              <p>{copy.videoDescription}</p>
              <p className="stagelab-start-video-note">{copy.videoNote}</p>
              <a href="https://www.youtube.com/shorts/uSHrNGqia-M" target="_blank" rel="noopener noreferrer">{copy.watchOnYouTube}</a>
            </div>
            <StageLabStartVideo locale={locale} playLabel={copy.playVideo} videoTitle={copy.videoTitle} />
          </section>

          <section className="stagelab-start-examples" aria-labelledby="stagelab-start-examples-title">
            <h2 id="stagelab-start-examples-title">{copy.examplesTitle}</h2>
            <div className="stagelab-start-feature-grid">
              <article className="stagelab-start-feature">
                <h3>{copy.physiqueTitle}</h3>
                <p>{copy.physiqueCaption}</p>
                <figure>
                  <StageLabStartImage imageId="physique-feedback" locale={locale} src={physiqueImage} alt={copy.physiqueAlt} fallback={copy.imageUnavailable} />
                  <figcaption>{copy.physiqueLabel}</figcaption>
                </figure>
              </article>
              <article className="stagelab-start-feature">
                <h3>{copy.posingTitle}</h3>
                <p>{copy.posingCaption}</p>
                <figure>
                  <StageLabStartImage imageId="posing-analysis" locale={locale} src={posingImage} alt={copy.posingAlt} fallback={copy.imageUnavailable} />
                  <figcaption>{copy.posingLabel}</figcaption>
                </figure>
                <p className="stagelab-start-feature-note">{copy.posingAccess}</p>
              </article>
              <article className="stagelab-start-feature">
                <h3>{copy.weeklyTitle}</h3>
                <p>{copy.weeklyCaption}</p>
                <figure>
                  <StageLabStartImage imageId="weekly-review" locale={locale} src={weeklyImage} alt={copy.weeklyAlt} fallback={copy.imageUnavailable} />
                  <figcaption>{copy.weeklyLabel}</figcaption>
                </figure>
              </article>
            </div>
            <p className="stagelab-start-feature-access">{copy.featureAccess}</p>
          </section>

          <section className="stagelab-start-closing" aria-labelledby="stagelab-start-closing-title">
            <h2 id="stagelab-start-closing-title">{copy.closingTitle}</h2>
            {actions("footer")}
            <p className="stagelab-start-disclosure">{copy.closingTerms}</p>
            <p className="stagelab-start-disclosure">{copy.disclaimer}</p>
          </section>
        </div>

        <footer className="stagelab-start-footer">
          <span>© {new Date().getFullYear()} {copy.footer}</span>
          <nav aria-label={copy.footer}>
            <Link href={localizePathname("/stagelab/", locale)}>{copy.more}</Link>
            <a href={localizePathname("/stagelab-privacy-policy/", locale)}>{copy.privacy}</a>
            <a href={localizePathname("/terms-of-service/", locale)}>{copy.terms}</a>
            <a href={`mailto:${siteConfig.contacts.support}`}>{copy.support}</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
