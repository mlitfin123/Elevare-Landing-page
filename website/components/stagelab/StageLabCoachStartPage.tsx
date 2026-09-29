import Image from "next/image";
import Link from "next/link";
import { LanguageSelector } from "@/components/localization/LanguageSelector";
import { StageLabStartActions } from "@/components/stagelab/StageLabStartActions";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import { productConfig, siteConfig } from "@/lib/site";
import { stageLabCoachStartMessages } from "@/lib/stagelab-coach-start";

export function StageLabCoachStartPage({ locale }: { locale: Locale }) {
  const copy = stageLabCoachStartMessages[locale];
  const ios = productConfig.StageLab.storeLinks?.find((link) => link.store === "ios");
  const android = productConfig.StageLab.storeLinks?.find((link) => link.store === "android");
  if (!ios || !android) throw new Error("StageLab store destinations are not configured");

  const actions = (placement: "hero" | "footer") => (
    <StageLabStartActions
      placement={placement}
      pageId="stagelab_coach_start"
      locale={locale}
      iosHref={ios.href}
      androidHref={android.href}
      download={copy.download}
      iosLabel={copy.ios}
      androidLabel={copy.android}
      groupLabel={copy.storeGroup}
    />
  );

  return (
    <div className="stagelab-start stagelab-coach-start">
      <div className="stagelab-start-wrap">
        <div className="stagelab-start-top">
          <Link className="stagelab-start-brand" href={localizePathname("/stagelab/", locale)} aria-label={copy.more}>
            <Image src="/stagelab-logo.webp" alt="" width={44} height={44} priority />
            <span>StageLab</span>
          </Link>
          <LanguageSelector />
        </div>

        <main>
          <section className="stagelab-start-hero stagelab-coach-start-hero" aria-labelledby="stagelab-coach-start-title">
            <p className="stagelab-start-eyebrow">{copy.eyebrow}</p>
            <h1 id="stagelab-coach-start-title">{copy.title}</h1>
            <p className="stagelab-start-lead">{copy.description}</p>

            <div className="stagelab-coach-benefits" aria-label={copy.eyebrow}>
              <article className="stagelab-start-offer">
                <h2>{copy.trialTitle}</h2>
                <p>{copy.trialBody}</p>
              </article>
              <article className="stagelab-start-offer">
                <h2>{copy.athletesTitle}</h2>
                <p>{copy.athletesBody}</p>
              </article>
              <article className="stagelab-start-offer">
                <h2>{copy.athleteProTitle}</h2>
                <p>{copy.athleteProBody}</p>
              </article>
            </div>

            {actions("hero")}
            <p className="stagelab-start-next">{copy.nextStep}</p>
          </section>

          <section className="stagelab-coach-screenshots" aria-labelledby="stagelab-coach-screenshots-title">
            <div className="stagelab-coach-screenshots-copy">
              <h2 id="stagelab-coach-screenshots-title">{copy.screenshotsHeading}</h2>
              <p>{copy.screenshotsDescription}</p>
            </div>
            <div className="stagelab-coach-screenshot-grid">
              {copy.screenshots.map((screenshot) => (
                <figure className="stagelab-coach-screenshot" key={screenshot.src}>
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    width={591}
                    height={1280}
                    sizes="(max-width: 540px) 43vw, (max-width: 860px) 28vw, 300px"
                    loading="lazy"
                  />
                  <figcaption>{screenshot.caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="stagelab-coach-start-section" aria-labelledby="stagelab-coach-value-title">
            <h2 id="stagelab-coach-value-title">{copy.valueHeading}</h2>
            <div className="stagelab-coach-value-grid">
              {copy.valueItems.map((item) => (
                <article className="stagelab-start-feature" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="stagelab-coach-start-section" aria-labelledby="stagelab-coach-how-title">
            <h2 id="stagelab-coach-how-title">{copy.howHeading}</h2>
            <ol className="stagelab-coach-how-list">
              {copy.howItems.map((item, index) => (
                <li className="stagelab-coach-how-item" key={item.title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="stagelab-start-closing" aria-labelledby="stagelab-coach-closing-title">
            <h2 id="stagelab-coach-closing-title">{copy.closingTitle}</h2>
            <p className="stagelab-start-lead">{copy.closingBody}</p>
            {actions("footer")}
            <p className="stagelab-start-disclosure">{copy.closingTerms}</p>
            <p className="stagelab-start-disclosure">{copy.disclaimer}</p>
          </section>
        </main>

        <footer className="stagelab-start-footer">
          <span>© {new Date().getFullYear()} {copy.footer}</span>
          <nav aria-label={copy.footer}>
            <Link href={localizePathname("/stagelab/", locale)}>{copy.more}</Link>
            <a href={localizePathname("/stagelab-privacy-policy/", locale)}>{copy.privacy}</a>
            <Link href="/stagelab-coach-agreement/">{copy.coachAgreement}</Link>
            <a href={localizePathname("/terms-of-service/", locale)}>{copy.terms}</a>
            <a href={`mailto:${siteConfig.contacts.support}`}>{copy.support}</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
