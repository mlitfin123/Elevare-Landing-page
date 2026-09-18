"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { detectStageLabPlatform, safeStageLabCampaignFields, type StageLabVisitorPlatform } from "@/lib/stagelab-start";

export function eventContext(platform: StageLabVisitorPlatform, locale: Locale) {
  return {
    page_id: "stagelab_start",
    platform,
    locale,
    ...safeStageLabCampaignFields(new URLSearchParams(window.location.search)),
  };
}

export function StageLabStartActions({
  placement, locale, iosHref, androidHref, download, iosLabel, androidLabel, groupLabel,
}: {
  placement: "hero" | "footer";
  locale: Locale;
  iosHref: string;
  androidHref: string;
  download: string;
  iosLabel: string;
  androidLabel: string;
  groupLabel: string;
}) {
  const storesRef = useRef<HTMLDivElement>(null);
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    const detected = detectStageLabPlatform(navigator.userAgent);
    if (storesRef.current) storesRef.current.dataset.platform = detected;
    if (placement === "hero") {
      const key = `${locale}:${window.location.pathname}`;
      if (tracked.current === key) return;
      tracked.current = key;
      trackEvent("stagelab_start_viewed", eventContext(detected, locale));
    }
  }, [locale, placement]);

  function trackStoreClick(store: "ios" | "android") {
    trackEvent("stagelab_start_store_clicked", {
      ...eventContext(detectStageLabPlatform(navigator.userAgent), locale),
      store,
      placement,
      destination_url: store === "ios" ? iosHref : androidHref,
    });
  }

  return (
    <div ref={storesRef} className="stagelab-start-stores" data-platform="other" role="group" aria-label={groupLabel}>
      <a className="stagelab-start-store store-ios" href={iosHref} onClick={() => trackStoreClick("ios")}>
        <span>{download}</span><strong>{iosLabel}</strong>
      </a>
      <a className="stagelab-start-store store-android" href={androidHref} onClick={() => trackStoreClick("android")}>
        <span>{download}</span><strong>{androidLabel}</strong>
      </a>
    </div>
  );
}

export function StageLabStartImage({
  imageId, locale, src, alt, fallback,
}: {
  imageId: "physique-feedback" | "posing-analysis" | "weekly-review";
  locale: Locale;
  src: string;
  alt: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <p className="stagelab-start-image-fallback">{fallback}</p>;
  return (
    <Image
      src={src}
      alt={alt}
      className={imageId === "weekly-review" ? "stagelab-start-image-weekly" : imageId === "posing-analysis" ? "stagelab-start-image-posing" : undefined}
      width={296}
      height={640}
      sizes="(max-width: 600px) 74vw, 296px"
      loading="lazy"
      onError={() => {
        trackEvent("stagelab_start_image_failed", {
          ...eventContext(detectStageLabPlatform(navigator.userAgent), locale),
          image_id: imageId,
        });
        setFailed(true);
      }}
    />
  );
}
