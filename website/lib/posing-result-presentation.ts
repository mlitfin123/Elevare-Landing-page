import type { Locale } from "./i18n/config.ts";
import { getPosingMessages, posingLabel } from "./i18n/posing-messages.ts";
import { isPosingTransition, type CanonicalPosingResult } from "./posing-contract.ts";

/** Historical prose is cleaned for display only; canonical reports remain intact. */
export function cleanPosingText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\s*\([^)]*\b\d[\d,.]*\s*(?:[-–—]\s*\d[\d,.]*\s*)?ms\b[^)]*\)/gi, "")
    .replace(/\b(?:(?:during|between|from|at|entre|durante|de|a los|em)\s+)?\d[\d,.]*\s*(?:[-–—]\s*\d[\d,.]*\s*)?ms\b[:,]?/gi, "")
    .replace(/\b(?:frame|fotograma|quadro)\s*#?\d+\s*[:;,]?/gi, "")
    .replace(/(?:https?:\/\/\S+|data:image\S+)/gi, "")
    .replace(/\(\s*\)/g, "").replace(/\s+([,.;:!?])/g, "$1").replace(/^\s*[,;:–—-]\s*/, "")
    .replace(/\s+/g, " ").trim();
}
export function compactPosingText(value: string | null | undefined, maxWords: number, maxSentences = 2) {
  const cleaned = cleanPosingText(value);
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const selected = sentences.slice(0, maxSentences).join(" ").trim();
  const words = selected.split(/\s+/).filter(Boolean);
  const limited = words.length > maxWords ? words.slice(0, maxWords).join(" ").replace(/[,;:.\-]+$/, "") + "…" : selected;
  // Bound pathological unbroken text too; saved narrative remains unchanged.
  const characters = Array.from(limited);
  return characters.length > maxWords * 12 ? characters.slice(0, maxWords * 12).join("") + "…" : limited;
}
const comparison = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function dedupe(values: string[], excluded: string[] = []) {
  const seen = new Set(excluded.map(comparison));
  return values.filter((value) => { const key = comparison(value); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}

export function buildPosingPresentation(result: CanonicalPosingResult, locale: Locale) {
  const m = getPosingMessages(locale);
  const seenCorrections = new Set<string>();
  const corrections = result.highest_priority_corrections.map((c) => ({
    title: compactPosingText(c.title, 12, 1), evidence: compactPosingText(c.visible_evidence, 30, 1), action: compactPosingText(c.try_this, 34, 1),
    evidenceDetail: cleanPosingText(c.visible_evidence), actionDetail: cleanPosingText(c.try_this),
  })).filter((c) => {
    const key = comparison(c.actionDetail || c.evidenceDetail || c.title);
    if (!key || seenCorrections.has(key)) return false; seenCorrections.add(key); return true;
  });
  const priority = corrections.slice(0, 3);
  const secondaryExclusions = priority.flatMap((c) => [c.evidenceDetail, c.actionDetail]);
  const ordered = result.poses_detected.map((source, index) => ({ source, index })).sort((a, b) => {
    const left = a.source.segment_start_ms, right = b.source.segment_start_ms;
    return result.poses_detected.every((pose) => pose.segment_start_ms != null) && left != null && right != null ? left - right || a.index - b.index : a.index - b.index;
  });
  const occurrences = new Map<string, number>();
  const poses = ordered.map(({ source }) => {
    const key = comparison(source.pose_name); const total = ordered.filter(({ source: other }) => comparison(other.pose_name) === key).length;
    const occurrence = (occurrences.get(key) ?? 0) + 1; occurrences.set(key, occurrence);
    const transition = isPosingTransition(source.pose_name);
    const base = posingLabel(source.pose_name, locale, "pose");
    const unknown = base === m.unknownPose;
    const name = total > 1 && !transition ? `${base} — ${occurrence === 1 ? m.first : occurrence === total ? m.final : occurrence}` : base;
    const cue = unknown ? "" : compactPosingText(source.coaching_cue, 22, 1);
    return {
      name, transition, unknown,
      score: transition || unknown || result.video_usability_status === "unusable" ? null : source.pose_score,
      confidence: m.confidence[unknown ? "low" : source.confidence],
      observation: unknown ? m.unknownNote : compactPosingText(source.biggest_issue || source.strongest_aspect, 20, 1),
      strength: compactPosingText(source.strongest_aspect, 42), issue: compactPosingText(source.biggest_issue, 42),
      corrections: unknown ? [] : dedupe(source.corrections.map((v) => compactPosingText(v, 32, 1)), [cue]).slice(0, 2), cue,
      components: transition || unknown ? [] : source.component_scores.map((c) => ({ label: posingLabel(c.label, locale, "component"), score: c.score, note: cleanPosingText(c.note) })),
    };
  });
  const notes = (values: string[], maxWords = 32) => dedupe(values.map((v) => compactPosingText(v, maxWords)), secondaryExclusions);
  return {
    summary: compactPosingText(result.score_explanation, 90, 3) || m.summaryFallback,
    opportunity: compactPosingText(result.biggest_opportunity, 35), priority, additionalCorrections: corrections.slice(3), poses,
    strengths: notes(result.overall_strengths).slice(0, 4), nextFocus: notes(result.athlete_next_focus).slice(0, 4),
    consistency: notes(result.consistency_observations), transitions: notes(result.transition_observations),
    quality: dedupe([result.video_usability_reason, ...result.quality_flags].map(cleanPosingText)),
    disclaimer: cleanPosingText(result.disclaimer),
  };
}
