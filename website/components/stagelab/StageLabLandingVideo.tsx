"use client";

import Image from "next/image";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { STAGELAB_LANDING_MEDIA } from "@/lib/stagelab-landing-media";

export function StageLabLandingVideo({ locale, playLabel, iframeTitle }: {
  locale: Locale;
  playLabel: string;
  iframeTitle: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = STAGELAB_LANDING_MEDIA.demoVideo;

  if (!video.enabled) return null;

  function play() {
    trackEvent("stagelab_demo_video_play", {
      page_id: "stagelab_product",
      locale,
      video_id: video.youtubeId,
    });
    setPlaying(true);
  }

  return (
    <div className="stagelab-landing-video-frame">
      {playing ? (
        <iframe
          title={iframeTitle}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&playsinline=1`}
          loading="lazy"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="stagelab-landing-video-play" onClick={play} aria-label={playLabel}>
          <Image
            src={video.poster}
            alt=""
            fill
            sizes="(max-width: 720px) 84vw, 330px"
          />
          <span className="stagelab-landing-video-icon" aria-hidden="true">▶</span>
          <span className="stagelab-landing-video-label" aria-hidden="true">{playLabel}</span>
        </button>
      )}
    </div>
  );
}
