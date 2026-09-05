"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import {
  QUICK_ANALYSIS_PHOTO_VIEWS,
  type QuickAnalysisMode,
  type QuickAnalysisPhotoView,
} from "@/lib/quick-analysis";

export type QuickAnalysisSelectedPhoto = {
  file: File;
  previewUrl: string;
};

type QuickAnalysisPhotoUploaderProps = {
  mode: QuickAnalysisMode;
  photos: Partial<Record<QuickAnalysisPhotoView, QuickAnalysisSelectedPhoto>>;
  errors: Partial<Record<QuickAnalysisPhotoView, string>>;
  disabled: boolean;
  messages: QuickAnalysisMessages["result"]["uploader"];
  onPhotoChange: (view: QuickAnalysisPhotoView, file: File | null) => void;
};

const PHOTO_VIEW_GUIDES = [
  {
    view: "front",
    src: "/images/quick-analysis/front-guide.webp",
  },
  {
    view: "side",
    src: "/images/quick-analysis/side-guide.webp",
  },
  {
    view: "back",
    src: "/images/quick-analysis/back-guide.webp",
  },
] as const;

function PhotoSlot({
  view,
  photo,
  error,
  disabled,
  messages,
  onPhotoChange,
}: {
  view: QuickAnalysisPhotoView;
  photo?: QuickAnalysisSelectedPhoto;
  error?: string;
  disabled: boolean;
  messages: QuickAnalysisMessages["result"]["uploader"];
  onPhotoChange: (view: QuickAnalysisPhotoView, file: File | null) => void;
}) {
  const content = messages.slots[view];
  const inputId = `quick-analysis-photo-${view}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    onPhotoChange(view, event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  return (
    <div className={`quick-analysis-photo-slot${photo ? " is-selected" : ""}${error ? " is-error" : ""}`}>
      <div className="quick-analysis-photo-slot-head">
        <div>
          <strong id={`${inputId}-label`}>{content.label}</strong>
          <span className="quick-analysis-photo-requirement">{content.required ? messages.required : messages.optional}</span>
        </div>
        {photo ? <span className="quick-analysis-photo-ready">{messages.ready}</span> : null}
      </div>

      <p id={helpId}>{content.help}</p>

      {photo ? (
        <div className="quick-analysis-photo-preview">
          <div className="quick-analysis-photo-preview-image">
            {/* The object URL is browser-local and revoked by the parent when replaced or unmounted. */}
            <Image src={photo.previewUrl} alt={messages.previewAlt.replace("{label}", content.label)} fill sizes="(max-width: 640px) 100vw, 260px" unoptimized />
          </div>
          <div className="quick-analysis-photo-actions">
            <label className="button button-secondary" htmlFor={inputId}>{messages.replace}</label>
            <button className="quick-analysis-photo-remove" type="button" onClick={() => onPhotoChange(view, null)} disabled={disabled}>
              {messages.remove}
            </button>
          </div>
        </div>
      ) : (
        <label className="quick-analysis-photo-add" htmlFor={inputId}>
          <span aria-hidden="true">+</span>
          {messages.choose}
        </label>
      )}

      <input
        id={inputId}
        className="quick-analysis-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
        aria-required={content.required}
        onChange={handleFile}
        disabled={disabled}
      />
      {error ? <p className="quick-analysis-photo-error" id={errorId} role="alert">{error}</p> : null}
    </div>
  );
}

export function QuickAnalysisPhotoUploader({
  mode,
  photos,
  errors,
  disabled,
  messages,
  onPhotoChange,
}: QuickAnalysisPhotoUploaderProps) {
  const modeGuidance = mode === "competition_prep"
    ? (
        <p className="quick-analysis-mode-guidance">
          <strong>{messages.prepLabel}:</strong> {messages.prepGuidance}
        </p>
      )
    : (
        <p className="quick-analysis-mode-guidance">
          <strong>{messages.physiqueLabel}:</strong> {messages.physiqueGuidance}
        </p>
      );

  return (
    <div className="quick-analysis-photo-uploader">
      {modeGuidance}

      <section className="quick-analysis-photo-guide" aria-labelledby="quick-analysis-photo-guide-title">
        <div>
          <span className="stat-label" id="quick-analysis-photo-guide-title">{messages.bestRead}</span>
          <div className="quick-analysis-view-guide" aria-label={messages.guideAria}>
            {PHOTO_VIEW_GUIDES.map((guide) => (
              <span key={guide.view}>
                <Image
                  className="quick-analysis-view-guide-image"
                  src={guide.src}
                  alt={messages.guideAlt[guide.view]}
                  width={600}
                  height={400}
                  sizes="(max-width: 640px) 30vw, 180px"
                />
                {messages.slots[guide.view].label}
              </span>
            ))}
          </div>
        </div>
        <ul>{messages.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
        <p>{messages.guideBody}</p>
        <small><strong>{messages.avoidLabel}:</strong> {messages.avoidBody}</small>
      </section>

      <div className="quick-analysis-photo-slots">
        {QUICK_ANALYSIS_PHOTO_VIEWS.map((view) => (
          <PhotoSlot
            key={view}
            view={view}
            photo={photos[view]}
            error={errors[view]}
            disabled={disabled}
            messages={messages}
            onPhotoChange={onPhotoChange}
          />
        ))}
      </div>

      <p className="quick-analysis-upload-privacy">
        {messages.privacy}
      </p>
    </div>
  );
}
