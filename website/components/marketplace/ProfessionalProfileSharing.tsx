"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { getProfessionalShareMessages } from "@/lib/i18n/professional-share-messages";
import { getProfileCardFilename, getProfessionalSharingLinks } from "@/lib/professional-sharing";

type Props = { publicPath: string; name: string; title: string; specialties: string[]; photoUrl: string | null; locale: Locale };

export function ProfessionalProfileSharing({ publicPath, name, title, specialties, photoUrl, locale }: Props) {
  const m = getProfessionalShareMessages(locale);
  const links = getProfessionalSharingLinks(publicPath);
  const linkId = useId();
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [card, setCard] = useState<{ url: string; file: File; usedPhoto: boolean; canShare: boolean } | null>(null);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => () => { if (card) URL.revokeObjectURL(card.url); }, [card]);
  if (!links) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(links!.profileUrl);
      setFeedback(m.copied);
      trackEvent("professional_profile_share_selected", { share_method: "copy" });
    } catch {
      setFeedback(m.manualCopy);
      input.current?.focus(); input.current?.select();
    }
  }

  async function shareProfile() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name || "Elevare", url: links!.profileUrl });
        trackEvent("professional_profile_share_selected", { share_method: "native" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  async function createCard() {
    if (creating) return;
    const currentGeneration = ++generation.current;
    setCreating(true); setFeedback(null);
    try {
      // Canvas code and photo loading happen only after this explicit action.
      const { createProfessionalShareCard } = await import("@/lib/professional-share-card");
      const result = await createProfessionalShareCard({ name, title, specialties, photoUrl, label: m.cardGenericLabel, cta: m.cardCta, footer: m.cardFooter });
      if (currentGeneration !== generation.current) return;
      const file = new File([result.blob], getProfileCardFilename(publicPath), { type: "image/png" });
      let canShare = false;
      try { canShare = Boolean(navigator.canShare?.({ files: [file] })); } catch { /* Download remains available. */ }
      setCard({ url: URL.createObjectURL(result.blob), file, usedPhoto: result.usedPhoto, canShare });
      setFeedback(m.ready);
    } catch { if (currentGeneration === generation.current) setFeedback(m.failed); }
    finally { if (currentGeneration === generation.current) setCreating(false); }
  }

  async function shareImage() {
    if (!card) return;
    try {
      await navigator.share({ files: [card.file] });
      trackEvent("professional_profile_share_selected", { share_method: "image" });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFeedback(m.imageShareFailed);
    }
  }

  return (
    <section className="panel professional-sharing" aria-labelledby={`${linkId}-heading`}>
      <div><h3 id={`${linkId}-heading`}>{m.heading}</h3><p>{m.body}</p></div>
      <div className="professional-sharing-actions">
        <a className="button button-primary" href={links.facebookUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("professional_profile_share_selected", { share_method: "facebook" })}>{m.facebook}</a>
        <button className="button button-secondary" type="button" onClick={() => void copyLink()}>{m.copy}</button>
        <button className="button button-secondary" type="button" onClick={() => void shareProfile()}>{m.more}</button>
        <button className="button button-secondary" type="button" onClick={() => void createCard()} disabled={creating} aria-busy={creating}>{creating ? m.creating : m.create}</button>
      </div>
      <label className="field professional-sharing-link" htmlFor={linkId}>
        <span>{m.linkLabel}</span>
        <input id={linkId} ref={input} readOnly value={links.profileUrl} onFocus={event => event.target.select()} />
      </label>
      {feedback ? <p role="status" aria-live="polite">{feedback}</p> : null}
      {card ? <div className="professional-sharing-card">
        <Image unoptimized src={card.url} width={1080} height={1920} alt={m.preview} />
        <div className="professional-sharing-card-actions">
          <p>{m.instructions}</p>
          {photoUrl && !card.usedPhoto ? <p>{m.photoFallback}</p> : null}
          <div className="professional-sharing-actions">
            <a className="button button-primary" href={card.url} download={card.file.name} onClick={() => trackEvent("professional_profile_share_selected", { share_method: "download" })}>{m.download}</a>
            {card.canShare ? <button className="button button-secondary" type="button" onClick={() => void shareImage()}>{m.shareImage}</button> : null}
          </div>
          <button className="button button-secondary" type="button" onClick={() => void copyLink()}>{m.copy}</button>
        </div>
      </div> : null}
    </section>
  );
}
