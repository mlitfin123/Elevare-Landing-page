/**
 * Authoritative source: StageLab supabase/functions/_shared/posing-contract.ts.
 * Vendored byte-for-byte for website builds; verify-posing-contract.mjs checks parity.
 * v1 is additive: historical prompt 0.2/0.3 reports remain supported without AI.
 */
export const POSING_CONTRACT = {
  schemaVersion: "posing_analysis_v1",
  promptVersion: "posing-prompt-0.4.0",
  rubricVersion: "division-rubrics-0.2.0",
  providerVersion: "posing-provider-0.4.0",
  narrativeMax: 4_000,
  producer: { strengths: 4, corrections: 3, poses: 8, components: 9, notes: 4, quality: 8 },
} as const;

export const POSING_RESULT_DIVISIONS = ["Men's Physique", "Classic Physique", "Bodybuilding", "Men's Bodybuilding", "Men's 212 Bodybuilding", "Women's Bodybuilding", "Bikini", "Wellness", "Figure"] as const;
export type PosingConfidence = "low" | "medium" | "high";
export type CanonicalPosingComponent = { label: string; score: number | null; note: string };
export type CanonicalPosingPose = {
  pose_name: string;
  segment_start_ms: number | null;
  segment_end_ms: number | null;
  representative_frame_timestamps_ms: number[];
  confidence: PosingConfidence;
  pose_score: number | null;
  component_scores: CanonicalPosingComponent[];
  strongest_aspect: string;
  biggest_issue: string;
  corrections: string[];
  /** Absent/empty legacy cues become null. No new inference is made. */
  coaching_cue: string | null;
};
export type CanonicalPosingResult = {
  schema_version: typeof POSING_CONTRACT.schemaVersion;
  analysis_id: string;
  division: (typeof POSING_RESULT_DIVISIONS)[number];
  video_usability_status: "usable" | "limited" | "unusable";
  video_usability_reason: string;
  analysis_quality: PosingConfidence | "unusable";
  overall_stage_lab_posing_score: number | null;
  score_explanation: string;
  biggest_opportunity: string;
  overall_strengths: string[];
  highest_priority_corrections: Array<{ title: string; visible_evidence: string; try_this: string }>;
  poses_detected: CanonicalPosingPose[];
  transition_observations: string[];
  consistency_observations: string[];
  quality_flags: string[];
  athlete_next_focus: string[];
  disclaimer: string;
};

export class PosingContractError extends Error {
  readonly field: string;
  constructor(field: string) { super(`Invalid posing result field: ${field}`); this.name = "PosingContractError"; this.field = field; }
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PosingContractError(field);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, max: number = POSING_CONTRACT.narrativeMax): string {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) throw new PosingContractError(field);
  // Text is data, never interpreted as HTML or fetched. No display truncation here.
  return value;
}
function identifier(value: unknown, field: string) {
  const result = text(value, field, 200).trim();
  if (!result || /(?:https?:|data:|[\r\n])/i.test(result)) throw new PosingContractError(field);
  return result;
}
function score(value: unknown, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw new PosingContractError(field);
  return value;
}
function timestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function list(value: unknown, field: string, max = 20): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new PosingContractError(field);
  return value;
}
function notes(value: unknown, field: string) { return list(value, field).map((v) => text(v, field)); }
export function normalizePosingConfidence(value: unknown): PosingConfidence {
  const key = typeof value === "string" ? value.toLowerCase().trim() : "";
  return key === "high" || key === "medium" ? key : "low";
}
export function isPosingTransition(value: string) {
  return /\b(?:transition|transicion|transicao)\b/.test(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
}

/** Reader limits include the prior website v1 envelope; producer counts remain lower.
 * Unknown extra properties are not copied, keeping media/transport metadata out.
 * Canonical prose is retained verbatim; all compaction belongs in presentation.
 */
export function parseCanonicalPosingResult(value: unknown): CanonicalPosingResult {
  const r = record(value, "result");
  if (r.schema_version !== POSING_CONTRACT.schemaVersion) throw new PosingContractError("schema_version");
  if (!POSING_RESULT_DIVISIONS.includes(r.division as CanonicalPosingResult["division"])) throw new PosingContractError("division");
  if (!["usable", "limited", "unusable"].includes(String(r.video_usability_status))) throw new PosingContractError("video_usability_status");
  const unusable = r.video_usability_status === "unusable";
  return {
    schema_version: POSING_CONTRACT.schemaVersion,
    analysis_id: identifier(r.analysis_id, "analysis_id"),
    division: r.division as CanonicalPosingResult["division"],
    video_usability_status: r.video_usability_status as CanonicalPosingResult["video_usability_status"],
    video_usability_reason: text(r.video_usability_reason, "video_usability_reason"),
    analysis_quality: unusable ? "unusable" : normalizePosingConfidence(r.analysis_quality),
    overall_stage_lab_posing_score: unusable ? null : score(r.overall_stage_lab_posing_score, "overall_score"),
    score_explanation: text(r.score_explanation, "score_explanation"),
    biggest_opportunity: text(r.biggest_opportunity, "biggest_opportunity"),
    overall_strengths: notes(r.overall_strengths, "overall_strengths"),
    highest_priority_corrections: list(r.highest_priority_corrections, "highest_priority_corrections", 12).map((v) => {
      const c = record(v, "correction");
      return { title: text(c.title, "title"), visible_evidence: text(c.visible_evidence, "visible_evidence"), try_this: text(c.try_this, "try_this") };
    }),
    poses_detected: list(r.poses_detected, "poses_detected").map((v) => {
      const p = record(v, "pose");
      // Do not rewrite legacy scores here. The display model hides transition scores.
      return {
        pose_name: identifier(p.pose_name, "pose_name"),
        segment_start_ms: timestamp(p.segment_start_ms), segment_end_ms: timestamp(p.segment_end_ms),
        representative_frame_timestamps_ms: list(p.representative_frame_timestamps_ms, "timestamps", 16).map(timestamp).filter((v): v is number => v != null),
        confidence: normalizePosingConfidence(p.confidence),
        pose_score: unusable ? null : score(p.pose_score, "pose_score"),
        component_scores: list(p.component_scores, "component_scores", 40).map((v) => {
          const c = record(v, "component");
          return { label: identifier(c.label, "label"), score: unusable ? null : score(c.score, "component_score"), note: text(c.note, "note") };
        }),
        strongest_aspect: text(p.strongest_aspect, "strongest_aspect"), biggest_issue: text(p.biggest_issue, "biggest_issue"),
        corrections: notes(p.corrections, "corrections"), coaching_cue: text(p.coaching_cue, "coaching_cue").trim() || null,
      };
    }),
    transition_observations: notes(r.transition_observations, "transition_observations"),
    consistency_observations: notes(r.consistency_observations, "consistency_observations"),
    quality_flags: notes(r.quality_flags, "quality_flags"), athlete_next_focus: notes(r.athlete_next_focus, "athlete_next_focus"),
    disclaimer: text(r.disclaimer, "disclaimer"),
  };
}
