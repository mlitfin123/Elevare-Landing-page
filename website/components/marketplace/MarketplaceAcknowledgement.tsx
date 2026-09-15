"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { isCurrentMarketplaceConsent, marketplaceAcknowledgement, marketplaceConsentCopy } from "@/lib/marketplace-consent";

type Request = { client: SupabaseClient; userId: string; trigger: HTMLElement | null; resolve: (accepted: boolean) => void };
const Context = createContext<(client: SupabaseClient, userId: string) => Promise<boolean>>(async () => false);
export const useMarketplaceAcknowledgement = () => useContext(Context);

export function MarketplaceAcknowledgement({ children }: { children: ReactNode }) {
  const locale = localeFromPathname(usePathname());
  const copy = marketplaceConsentCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<Request | null>(null);
  const checking = useRef(false);
  const [legal, setLegal] = useState(false);
  const [adult, setAdult] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function finish(accepted: boolean) {
    const request = pending.current;
    pending.current = null;
    dialog.current?.close();
    request?.resolve(accepted);
    if (request && !accepted) requestAnimationFrame(() => request.trigger?.focus());
  }
  useEffect(() => () => { pending.current?.resolve(false); pending.current = null; }, []);

  async function requireAcknowledgement(client: SupabaseClient, userId: string) {
    if (pending.current || checking.current) return false;
    checking.current = true;
    try {
      const { data, error: statusError } = await client.rpc("marketplace_get_consent_status");
      const { data: auth } = await client.auth.getUser();
      if (auth.user?.id !== userId) return false;
      const compatible = isCurrentMarketplaceConsent(data);
      if (!statusError && compatible && data.accepted) return true;
      setLegal(false); setAdult(false); setSaving(false);
      setError(statusError ? copy.error : !compatible ? copy.reload : "");
      return new Promise<boolean>((resolve) => {
        pending.current = { client, userId, resolve, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null };
        dialog.current?.showModal();
      });
    } finally { checking.current = false; }
  }

  async function acknowledge() {
    const request = pending.current;
    if (!request || !legal || !adult || saving) return;
    setSaving(true); setError("");
    try {
      const { data: auth } = await request.client.auth.getUser();
      if (auth.user?.id !== request.userId) { finish(false); return; }
      const { data, error: saveError } = await request.client.rpc("marketplace_acknowledge_legal", marketplaceAcknowledgement);
      if (saveError || !isCurrentMarketplaceConsent(data) || !data.accepted) throw new Error("Acknowledgement not saved");
      finish(true);
    } catch { setError(copy.error); } finally { setSaving(false); }
  }

  return <Context.Provider value={requireAcknowledgement}>
    {children}
    <dialog ref={dialog} className="translation-feedback-dialog" aria-labelledby="marketplace-ack-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) finish(false); }} onClose={() => finish(false)}>
      <form className="translation-feedback-form" onSubmit={(event) => { event.preventDefault(); void acknowledge(); }}>
        <h2 id="marketplace-ack-title">{copy.title}</h2><p>{copy.body}</p>
        <label className="checkbox-row professional-attestation"><input type="checkbox" checked={legal} onChange={(event) => setLegal(event.target.checked)} required disabled={saving} />
          <span>{copy.agree} <a href={localizePathname("/terms-of-service/", locale)} target="_blank" rel="noopener">{copy.terms}</a> {copy.acknowledge} <a href={localizePathname("/privacy-policy/", locale)} target="_blank" rel="noopener">{copy.privacy}</a>.</span>
        </label>
        <label className="checkbox-row professional-attestation"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} required disabled={saving} /><span>{copy.age}</span></label>
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
        <div className="button-row"><button type="submit" className="button button-primary" disabled={!legal || !adult || saving}>{saving ? copy.saving : copy.continue}</button>
          <button type="button" className="button button-secondary" disabled={saving} onClick={() => finish(false)}>{copy.cancel}</button></div>
      </form>
    </dialog>
  </Context.Provider>;
}
