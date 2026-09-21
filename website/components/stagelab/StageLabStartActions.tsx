"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { detectStageLabPlatform } from "@/lib/stagelab-start";

export function StageLabStartActions({
  iosHref, androidHref, download, iosLabel, androidLabel, groupLabel,
}: {
  iosHref: string;
  androidHref: string;
  download: string;
  iosLabel: string;
  androidLabel: string;
  groupLabel: string;
}) {
  const storesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storesRef.current) storesRef.current.dataset.platform = detectStageLabPlatform(navigator.userAgent);
  }, []);

  return (
    <div ref={storesRef} className="stagelab-start-stores" data-platform="other" role="group" aria-label={groupLabel}>
      <a className="stagelab-start-store store-ios" href={iosHref}>
        <span>{download}</span><strong>{iosLabel}</strong>
      </a>
      <a className="stagelab-start-store store-android" href={androidHref}>
        <span>{download}</span><strong>{androidLabel}</strong>
      </a>
    </div>
  );
}

export function StageLabStartImage({
  imageId, src, alt, fallback,
}: {
  imageId: "physique-feedback" | "posing-analysis" | "weekly-review";
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
      onError={() => setFailed(true)}
    />
  );
}
