"use client";

import Image from "next/image";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { detectStageLabPlatform } from "@/lib/stagelab-start";
import { eventContext } from "./StageLabStartActions";

const videoId = "uSHrNGqia-M";

export function StageLabStartVideo({ locale, playLabel, videoTitle }: {
  locale: Locale;
  playLabel: string;
  videoTitle: string;
}) {
  const [playing, setPlaying] = useState(false);

  function play() {
    trackEvent("stagelab_start_video_play_clicked", {
      ...eventContext(detectStageLabPlatform(navigator.userAgent), locale),
      video_id: videoId,
    });
    setPlaying(true);
  }

  return (
    <div className="stagelab-start-video-frame">
      {playing ? (
        <iframe
          title={videoTitle}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="stagelab-start-video-play" onClick={play} aria-label={playLabel}>
          <Image
            src="/stagelab/weekly-check-in-video-poster.webp"
            alt=""
            fill
            sizes="(max-width: 600px) min(100vw - 72px, 300px), 300px"
          />
          <span className="stagelab-start-video-icon" aria-hidden="true">▶</span>
          <span className="stagelab-start-video-play-text" aria-hidden="true">{playLabel}</span>
        </button>
      )}
    </div>
  );
}
