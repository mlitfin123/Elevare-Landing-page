"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
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
  onPhotoChange: (view: QuickAnalysisPhotoView, file: File | null) => void;
};

const SLOT_CONTENT: Record<QuickAnalysisPhotoView, { label: string; help: string; required: boolean }> = {
  front: {
    label: "Front",
    help: "Face the camera with your full physique visible.",
    required: true,
  },
  side: {
    label: "Side",
    help: "Turn to either side and keep your full physique visible.",
    required: true,
  },
  back: {
    label: "Back",
    help: "Face away from the camera with your full physique visible.",
    required: true,
  },
  additional_1: {
    label: "Additional View",
    help: "Optional: another pose, the opposite side, or a useful closer view.",
    required: false,
  },
  additional_2: {
    label: "Additional View",
    help: "Optional: another pose, the opposite side, or a useful closer view.",
    required: false,
  },
};

const PHOTO_VIEW_GUIDES = [
  {
    label: "Front",
    src: "/images/quick-analysis/front-guide.webp",
    alt: "Front physique photo positioning example",
  },
  {
    label: "Side",
    src: "/images/quick-analysis/side-guide.webp",
    alt: "Side physique photo positioning example",
  },
  {
    label: "Back",
    src: "/images/quick-analysis/back-guide.webp",
    alt: "Back physique photo positioning example",
  },
] as const;

function PhotoSlot({
  view,
  photo,
  error,
  disabled,
  onPhotoChange,
}: {
  view: QuickAnalysisPhotoView;
  photo?: QuickAnalysisSelectedPhoto;
  error?: string;
  disabled: boolean;
  onPhotoChange: (view: QuickAnalysisPhotoView, file: File | null) => void;
}) {
  const content = SLOT_CONTENT[view];
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
          <span className="quick-analysis-photo-requirement">{content.required ? "Required" : "Optional"}</span>
        </div>
        {photo ? <span className="quick-analysis-photo-ready">Ready</span> : null}
      </div>

      <p id={helpId}>{content.help}</p>

      {photo ? (
        <div className="quick-analysis-photo-preview">
          <div className="quick-analysis-photo-preview-image">
            {/* The object URL is browser-local and revoked by the parent when replaced or unmounted. */}
            <Image src={photo.previewUrl} alt={`${content.label} photo preview`} fill sizes="(max-width: 640px) 100vw, 260px" unoptimized />
          </div>
          <div className="quick-analysis-photo-actions">
            <label className="button button-secondary" htmlFor={inputId}>Replace</label>
            <button className="quick-analysis-photo-remove" type="button" onClick={() => onPhotoChange(view, null)} disabled={disabled}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="quick-analysis-photo-add" htmlFor={inputId}>
          <span aria-hidden="true">+</span>
          Choose photo
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
  onPhotoChange,
}: QuickAnalysisPhotoUploaderProps) {
  const modeGuidance = mode === "competition_prep"
    ? (
        <p className="quick-analysis-mode-guidance">
          <strong>Competition Prep:</strong> Use your normal check-in or division poses when possible. Division-appropriate poses can improve the presentation and division-specific assessment.
        </p>
      )
    : (
        <p className="quick-analysis-mode-guidance">
          <strong>Physique Check:</strong> No posing experience needed. Stand naturally and keep your full physique visible.
        </p>
      );

  return (
    <div className="quick-analysis-photo-uploader">
      {modeGuidance}

      <section className="quick-analysis-photo-guide" aria-labelledby="quick-analysis-photo-guide-title">
        <div>
          <span className="stat-label" id="quick-analysis-photo-guide-title">For the best read</span>
          <div className="quick-analysis-view-guide" aria-label="Submit front, side, and back views">
            {PHOTO_VIEW_GUIDES.map((guide) => (
              <span key={guide.label}>
                <Image
                  className="quick-analysis-view-guide-image"
                  src={guide.src}
                  alt={guide.alt}
                  width={600}
                  height={400}
                  sizes="(max-width: 640px) 30vw, 180px"
                />
                {guide.label}
              </span>
            ))}
          </div>
        </div>
        <ul>
          <li>Full physique visible</li>
          <li>Clear, even lighting</li>
          <li>Fitted athletic clothing</li>
          <li>Camera straight-on</li>
        </ul>
        <p>Keep the camera roughly straight-on and, if possible, use photos from the same session. Mirror photos are fine when the phone or frame does not block large areas of your physique.</p>
        <small><strong>Avoid:</strong> heavy shadows, baggy clothing, extreme camera angles, or blocking your physique with the phone.</small>
      </section>

      <div className="quick-analysis-photo-slots">
        {QUICK_ANALYSIS_PHOTO_VIEWS.map((view) => (
          <PhotoSlot
            key={view}
            view={view}
            photo={photos[view]}
            error={errors[view]}
            disabled={disabled}
            onPhotoChange={onPhotoChange}
          />
        ))}
      </div>

      <p className="quick-analysis-upload-privacy">
        Your photos are processed for this analysis and are not retained by ElevareFit.
      </p>
    </div>
  );
}
