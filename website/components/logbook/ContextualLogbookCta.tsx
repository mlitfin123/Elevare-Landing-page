"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import {
  getLogbookCtaAccessibility,
  getLogbookCtaCopy,
  logbookConversionConfig,
  type LogbookCtaSourceType,
  type LogbookCtaVariant,
} from "@/lib/logbook-conversion";
import { localizePathname, localeFromPathname, type Locale } from "@/lib/i18n/config";
import { productConfig } from "@/lib/site";
import type { ToolSlug } from "@/lib/tools";

type Props = {
  sourceType: LogbookCtaSourceType;
  ctaPosition: string;
  locale?: Locale;
  toolSlug?: ToolSlug;
  variant?: LogbookCtaVariant;
};

function pageSource(pathname: string) {
  const segments = pathname.split("?")[0].split("/").filter(Boolean);
  const localOffset = segments[0] === "es" || segments[0] === "pt-br" ? 1 : 0;
  const sourceSegments = segments.slice(localOffset);

  return {
    sourceSlug: sourceSegments.length > 1 ? sourceSegments.at(-1) : sourceSegments[0] ?? "home",
    pagePath: pathname.split("?")[0] || "/",
  };
}

function MobileStickyCta({
  sourceType,
  action,
  locale,
  ariaLabel,
  dismissLabel,
  onOpen,
}: {
  sourceType: LogbookCtaSourceType;
  action: string;
  locale: Locale;
  ariaLabel: string;
  dismissLabel: string;
  onOpen: (destination: "logbook_landing") => void;
}) {
  const storageKey = `elevare-logbook-sticky-dismissed-${sourceType}`;
  const [dismissedThisView, setDismissedThisView] = useState(false);
  const dismissedPreviously = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.sessionStorage.getItem(storageKey) === "true";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const dismissed = dismissedThisView || dismissedPreviously;

  if (!logbookConversionConfig.mobileStickyEnabled || !logbookConversionConfig.stickyEligibleSources.has(sourceType) || dismissed) {
    return null;
  }

  return (
    <div className="logbook-contextual-sticky-wrap">
      <div className="logbook-contextual-sticky-spacer" aria-hidden="true" />
      <aside className="logbook-contextual-sticky" aria-label={ariaLabel}>
        <a
          className="button button-primary"
          href={localizePathname("/logbook/", locale)}
          onClick={() => onOpen("logbook_landing")}
        >
          {action} <span aria-hidden="true">→</span>
        </a>
        <button
          className="logbook-contextual-dismiss"
          type="button"
          aria-label={dismissLabel}
          onClick={() => {
            try {
              window.sessionStorage.setItem(storageKey, "true");
            } catch {
              // Dismiss the current view even when storage is unavailable.
            }
            setDismissedThisView(true);
          }}
        >
          ×
        </button>
      </aside>
    </div>
  );
}

export function ContextualLogbookCta({
  sourceType,
  ctaPosition,
  locale,
  toolSlug,
  variant = logbookConversionConfig.activeVariant,
}: Props) {
  const pathname = usePathname() ?? "/";
  const resolvedLocale = locale ?? localeFromPathname(pathname);
  const ctaCopy = getLogbookCtaCopy({ sourceType, locale: resolvedLocale, variant, toolSlug });
  const accessibility = getLogbookCtaAccessibility(resolvedLocale);
  const root = useRef<HTMLElement>(null);
  const { sourceSlug, pagePath } = pageSource(pathname);
  const tracking = useMemo(
    () => ({
      source_type: sourceType,
      source_slug: sourceSlug,
      source_title: typeof document === "undefined" ? undefined : document.querySelector("h1")?.textContent?.trim(),
      cta_position: ctaPosition,
      cta_variant: variant,
      page_path: pagePath,
    }),
    [ctaPosition, pagePath, sourceSlug, sourceType, variant],
  );

  useEffect(() => {
    const element = root.current;
    if (!element || !ctaCopy || typeof IntersectionObserver === "undefined") return;

    let counted = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.5 || counted) return;
        counted = true;
        observer.disconnect();
        trackEvent("logbook_cta_impression", tracking);
      },
      { threshold: [0.5] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ctaCopy, tracking]);

  if (!ctaCopy) return null;

  const storeLinks = productConfig.Logbook.storeLinks ?? [];
  const deepLinkHref = logbookConversionConfig.deepLinks.enabled
    ? logbookConversionConfig.deepLinks.resolveHref()
    : null;
  const recordOpen = (destination: "ios_store" | "android_store" | "logbook_landing") => {
    trackEvent("logbook_cta_click", { ...tracking, destination });
    if (destination !== "logbook_landing") {
      trackEvent("logbook_store_click", { ...tracking, platform: destination === "ios_store" ? "ios" : "android", destination });
    }
  };
  const openDeepLink = () => {
    trackEvent("logbook_cta_click", { ...tracking, destination: "deep_link" });
    trackEvent("logbook_deeplink_attempt", { ...tracking, destination: "deep_link" });
  };

  return (
    <>
      <section
        ref={root}
        className={`logbook-contextual-cta logbook-contextual-cta--${ctaCopy.presentation}`}
        aria-label={`${ctaCopy.title} ${accessibility.withLogbook}`}
      >
        <div className="logbook-contextual-cta-copy">
          <span className="meta-pill">{ctaCopy.eyebrow}</span>
          <h2>{ctaCopy.title}</h2>
          <p>{ctaCopy.description}</p>
          <p className="logbook-contextual-supporting">{ctaCopy.supportingText}</p>
        </div>
        <div className="logbook-contextual-actions" aria-label={accessibility.chooseDestination}>
          {deepLinkHref ? (
            <a className="button button-primary" href={deepLinkHref} onClick={openDeepLink}>
              {ctaCopy.action}
            </a>
          ) : (
            storeLinks.map((store) => (
              <a
                key={store.store}
                className={store.store === "ios" ? "button button-primary" : "button button-secondary"}
                href={store.href}
                onClick={() => recordOpen(store.store === "ios" ? "ios_store" : "android_store")}
              >
                {store.store === "ios" ? `${ctaCopy.action} ${accessibility.onIphone}` : `${ctaCopy.action} ${accessibility.onAndroid}`}
              </a>
            ))
          )}
        </div>
      </section>
      <MobileStickyCta
        sourceType={sourceType}
        action={ctaCopy.action}
        locale={resolvedLocale}
        ariaLabel={accessibility.stickyShortcut}
        dismissLabel={accessibility.dismissStickyShortcut}
        onOpen={recordOpen}
      />
    </>
  );
}
