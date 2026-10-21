"use client";
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { CategoryCatalog, CategoryMembership, CategorySnapshot, availableCategories, categoryCopy } from '@/lib/category-specialties';
import { getMarketplaceCategoryCopy } from '@/lib/i18n/marketplace-content';
import { MARKETPLACE_TAXONOMY_CATEGORIES } from '@/lib/marketplace-taxonomy';
import { Locale } from '@/lib/i18n/config';

export default function CategorySpecialties({ profileId, locale, initialServices, onChange, onCatalog }: {
  profileId: string | null; locale: Locale; initialServices: CategoryMembership[]; onChange: (services: CategoryMembership[]) => void;
  onCatalog?: (catalog: CategoryCatalog) => void;
}) {
  const copy = categoryCopy[locale];
  const goalLocale = locale.split('-')[0];
  const [snapshot, setSnapshot] = useState<CategorySnapshot>();
  const [catalog, setCatalog] = useState<CategoryCatalog>([]);
  const [drafts, setDrafts] = useState<CategoryMembership[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const changed = useRef(onChange); changed.current = onChange;
  const initial = useRef(initialServices); initial.current = initialServices;
  const loaded = useRef(onCatalog); loaded.current = onCatalog;
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    setSnapshot(undefined); setMessage('');
    const client = getSupabaseBrowserClient();
    if (!client) { setMessage(copy.failed); return; }
    void Promise.all([
      profileId ? client.rpc('professional_category_snapshot', { p_trainer_profile_id: profileId })
        : Promise.resolve({ data: { revision: '', services: initial.current }, error: null }),
      client.rpc('marketplace_category_catalog'),
    ])
      .then(([saved, options]) => {
        if (request !== generation.current) return;
        if (saved.error || options.error || !saved.data || !Array.isArray(options.data)) { setMessage(copy.failed); return; }
        const catalog = availableCategories(options.data);
        setSnapshot(saved.data); setDrafts(saved.data.services); setCatalog(catalog); loaded.current?.(catalog); changed.current(saved.data.services);
      }).catch(() => { if (request === generation.current) setMessage(copy.failed); });
    return () => { generation.current++; };
  }, [profileId, reload, copy.failed]);
  async function run(action: () => PromiseLike<{ data: CategorySnapshot | null; error: unknown }>, savedCategory?: string) {
    if (pending.current || !snapshot) return;
    const request = generation.current;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await action();
      if (result.error || !result.data) throw new Error('save');
      if (request !== generation.current) return;
      setSnapshot(result.data);
      setDrafts(result.data.services.map(service => {
        const draft = drafts.find(row => row.service_category_id === service.service_category_id);
        return draft && service.service_category_id !== savedCategory
          ? { ...service, primary_specialty: draft.primary_specialty, secondary_specialties: draft.secondary_specialties } : service;
      }));
      changed.current(result.data.services); setMessage(copy.saved);
    } catch { if (request === generation.current) setMessage(copy.failed); }
    finally { pending.current = false; setBusy(false); }
  }
  function categories(ids: string[], featured: string) {
    if (!profileId) {
      const next = ids.flatMap(id => {
        const category = catalog.find(row => row.id === id);
        if (!category) return [];
        const current = drafts.find(row => row.service_category_id === id);
        return [{ service_category_id: id, category_slug: category.slug, updated_at: '', primary_specialty: null,
          secondary_specialties: [], specialty_status: 'pending', options: category.options.map(option => option.id),
          ...current, is_primary: id === featured }];
      });
      setDrafts(next); changed.current(next);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client || !snapshot) return;
    void run(() => client.rpc('save_professional_categories', { p_trainer_profile_id: profileId,
      p_expected_revision: snapshot.revision, p_primary_category_id: featured, p_category_ids: ids }));
  }
  function update(id: string, patch: Partial<CategoryMembership>) {
    const next = drafts.map(service => service.service_category_id === id ? { ...service, ...patch } : service);
    setDrafts(next);
    if (!profileId) changed.current(next);
  }
  const label = (slug: string) => {
    const entry = MARKETPLACE_TAXONOMY_CATEGORIES.find(category => category.stableId === slug);
    const category = catalog.find(row => row.slug === slug);
    return (entry && getMarketplaceCategoryCopy(entry.publicSlug, locale)?.label) ?? category?.name ?? entry?.label ?? slug;
  };
  return <section className="profile-subsection">
    <h3>{copy.title}</h3><p>{copy.hint}</p>
    {message ? <p role="status">{message}</p> : null}
    {profileId || message ? <button type="button" disabled={busy} className="button button-secondary" onClick={() => setReload(value => value + 1)}>{copy.reload}</button> : null}
    {snapshot ? <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
      {drafts.map(service => {
        const options = catalog.find(category => category.id === service.service_category_id)?.options ?? [];
        return <div className="nested-editor-card" key={service.service_category_id}>
          <h4>{label(service.category_slug)}</h4>
          {service.is_primary ? <p>{copy.featured}</p> : <button type="button" onClick={() => categories(drafts.map(row => row.service_category_id), service.service_category_id)}>{copy.feature}</button>}
          <label className="field"><span>{copy.primary}</span><select value={service.primary_specialty ?? ''}
            onChange={event => update(service.service_category_id, { primary_specialty: event.target.value, secondary_specialties: service.secondary_specialties.filter(value => value !== event.target.value) })}>
            <option value="">{copy.primary}</option>{options.map(option => <option key={option.id} value={option.id}>{option.labels[goalLocale] ?? option.labels.en ?? option.id}</option>)}
          </select></label>
          <fieldset><legend>{copy.secondary}</legend>{options.filter(option => option.id !== service.primary_specialty).map(option => <label key={option.id}>
            <input type="checkbox" checked={service.secondary_specialties.includes(option.id)} disabled={!service.secondary_specialties.includes(option.id) && service.secondary_specialties.length >= 3}
              onChange={event => update(service.service_category_id, { secondary_specialties: event.target.checked ? [...service.secondary_specialties, option.id] : service.secondary_specialties.filter(value => value !== option.id) })} />{option.labels[goalLocale] ?? option.labels.en ?? option.id}
          </label>)}</fieldset>
          {profileId ? <button type="button" className="button button-secondary" disabled={!service.primary_specialty} onClick={() => {
            const client = getSupabaseBrowserClient(); if (client) void run(() => client.rpc('save_category_specialties', {
              p_profile_id: profileId, p_category_id: service.service_category_id, p_expected_updated_at: service.updated_at,
              p_primary: service.primary_specialty, p_secondary: service.secondary_specialties,
            }), service.service_category_id);
          }}>{copy.save}</button> : null}
          {drafts.length > 1 ? <button type="button" onClick={() => {
            if (!window.confirm(copy.confirm)) return;
            const kept = drafts.filter(row => row.service_category_id !== service.service_category_id);
            categories(kept.map(row => row.service_category_id), (kept.find(row => row.is_primary) ?? kept[0]).service_category_id);
          }}>{copy.remove}</button> : null}
        </div>;
      })}
      {drafts.length < 3 ? <div className="professional-inline-add"><select value={selected} onChange={event => setSelected(event.target.value)} aria-label={copy.choose}>
        <option value="">{copy.choose}</option>{catalog.filter(category => !drafts.some(service => service.service_category_id === category.id)).map(category => <option key={category.id} value={category.id}>{label(category.slug)}</option>)}
      </select><button type="button" disabled={!selected} onClick={() => { categories([...drafts.map(row => row.service_category_id), selected], drafts.find(row => row.is_primary)?.service_category_id ?? selected); setSelected(''); }}>{copy.add}</button></div> : null}
    </fieldset> : null}
  </section>;
}
