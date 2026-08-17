import Image from "next/image";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { Callout } from "@/components/Callout";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "StageLab",
  description:
    "StageLab is the ElevareFit competition prep app for physique-focused athletes and coaches, now available on iOS and Android.",
  pathname: "/stagelab",
});

export default function StageLabPage() {
  return (
    <div className="container">
      <section className="hero product-hero">
        <div className="product-hero-copy">
          <div className="eyebrow">StageLab</div>
          <h1>Competition prep, structured like a system instead of a scramble.</h1>
          <p>
            StageLab is the prep-focused app on ElevareFit, built for people who need more deliberate structure
            around performance phases, competition timing, and execution.
          </p>
          <div className="button-row">
            <ProductCtaButtons product="StageLab" context="stagelab_hero" />
            <TrackedLink
              className="button button-secondary"
              href="/blog/category/prep-files"
              eventName="cta_click"
              eventParams={{
                cta_name: "Read prep files",
                cta_context: "stagelab_hero",
                product: "StageLab",
              }}
            >
              Read prep files
            </TrackedLink>
          </div>
        </div>

        <div className="product-hero-visual">
          <div className="product-hero-logo-frame">
            <Image
              src="/stagelab-logo-transparent.png"
              alt="StageLab Competition Prep logo"
              width={360}
              height={360}
              className="product-hero-logo"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Role</span>
            <h3>Prep and workflow structure</h3>
            <p>Designed for phase-based thinking, competition preparation, and performance refinement.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Ideal user</span>
            <h3>Competitive and systems-minded users</h3>
            <p>People who want to organize prep with more intention and less guesswork.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Status</span>
            <h3>Live on iOS and Android</h3>
            <p>Available now on the App Store and Google Play for coaches and competitors who want more structure in prep.</p>
          </article>
        </div>
      </section>

      <Callout title="Where StageLab fits">
        <p>
          StageLab is for the higher-stakes side of performance planning, where timing, progression, and
          execution matter more and the margin for noise is smaller.
        </p>
      </Callout>
    </div>
  );
}
