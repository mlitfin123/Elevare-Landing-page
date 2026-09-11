"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const COPY = {
  en: {
    title: "Email notifications", updates: "Email me about my match requests and invitations",
    reminders: "Also send optional reminders and follow-ups", save: "Save email preferences", retry: "Try again",
    saving: "Saving…", loading: "Loading email preferences…", saved: "Email preferences saved.",
    error: "Email preferences are unavailable. Please try again.",
    help: "Matching activity stays available in your account when emails are off. Consultation inquiry and account security emails are managed separately.",
  },
  "es-419": {
    title: "Notificaciones por correo", updates: "Recibir correos sobre mis solicitudes e invitaciones de conexión",
    reminders: "También recibir recordatorios y seguimientos opcionales", save: "Guardar preferencias de correo", retry: "Reintentar",
    saving: "Guardando…", loading: "Cargando preferencias de correo…", saved: "Preferencias de correo guardadas.",
    error: "Las preferencias de correo no están disponibles. Inténtalo de nuevo.",
    help: "Puedes consultar tus conexiones en tu cuenta aunque desactives los correos. Los correos de consultas y seguridad de la cuenta se gestionan por separado.",
  },
  "pt-BR": {
    title: "Notificações por e-mail", updates: "Receber e-mails sobre minhas solicitações e convites de conexão",
    reminders: "Também receber lembretes e acompanhamentos opcionais", save: "Salvar preferências de e-mail", retry: "Tentar novamente",
    saving: "Salvando…", loading: "Carregando preferências de e-mail…", saved: "Preferências de e-mail salvas.",
    error: "As preferências de e-mail estão indisponíveis. Tente novamente.",
    help: "As conexões continuam disponíveis na sua conta quando os e-mails estão desativados. E-mails de consultas e segurança da conta são gerenciados separadamente.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function NotificationPreferences({ locale, userId }: { locale: Locale; userId: string }) {
  const copy = COPY[locale];
  const [updates, setUpdates] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    void (async () => {
      try {
        if (!client) throw Error();
        const { data, error } = await client.rpc("marketplace_my_notification_preferences");
        if (error || typeof data?.match_updates !== "boolean" || typeof data?.match_reminders !== "boolean") throw Error();
        if (active) { setUpdates(data.match_updates); setReminders(data.match_reminders); setLoaded(true); setMessage(""); }
      } catch { if (active) setMessage(copy.error); }
    })();
    return () => { active = false; };
  }, [userId, attempt, copy.error]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw Error();
      const { data, error } = await client.rpc("marketplace_my_notification_preferences", {
        p_match_updates: updates, p_match_reminders: reminders,
      });
      if (error || typeof data?.match_updates !== "boolean" || typeof data?.match_reminders !== "boolean") throw Error();
      setUpdates(data.match_updates); setReminders(data.match_reminders); setMessage(copy.saved);
    } catch { setMessage(copy.error); }
    finally { setSaving(false); }
  }
  return <details id="email-notifications" className="panel notification-preferences">
    <summary>{copy.title}</summary>
    <p className="field-help">{copy.help}</p>
    {loaded ? <form onSubmit={save}>
      <fieldset disabled={saving} className="notification-preferences-fields">
        <label><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} />{copy.updates}</label>
        <label><input type="checkbox" checked={reminders} disabled={!updates} onChange={(event) => setReminders(event.target.checked)} />{copy.reminders}</label>
        <button type="submit" className="button button-secondary">{saving ? copy.saving : copy.save}</button>
      </fieldset>
    </form> : message ? <button type="button" className="button button-secondary" onClick={() => { setMessage(""); setAttempt(attempt + 1); }}>{copy.retry}</button> : <p>{copy.loading}</p>}
    <p role="status" aria-live="polite">{message}</p>
  </details>;
}
