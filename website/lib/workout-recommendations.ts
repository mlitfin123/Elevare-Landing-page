import type { WorkoutTemplateRecord } from "@/lib/training-data";

export const WORKOUT_GENERATOR_GOALS = [
  { value: "weight-loss", label: "Weight Loss" },
  { value: "general-fitness", label: "General Fitness" },
  { value: "muscle-gain", label: "Muscle Gain" },
  { value: "strength", label: "Strength" },
  { value: "beginner-fitness", label: "Beginner Fitness" },
] as const;

export const WORKOUT_GENERATOR_EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const WORKOUT_GENERATOR_EQUIPMENT_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "resistance-bands", label: "Resistance Bands" },
  { value: "full-gym", label: "Full Gym" },
] as const;

export const WORKOUT_GENERATOR_DAY_OPTIONS = [2, 3, 4, 5, 6] as const;

export const WORKOUT_GENERATOR_DURATION_OPTIONS = [
  { value: "20-30", label: "20-30 Minutes" },
  { value: "30-45", label: "30-45 Minutes" },
  { value: "45-60", label: "45-60 Minutes" },
  { value: "60-plus", label: "60+ Minutes" },
] as const;

export const WORKOUT_GENERATOR_FOCUS_OPTIONS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "core", label: "Core" },
  { value: "full-body", label: "Full Body" },
] as const;

export type WorkoutGeneratorGoal = (typeof WORKOUT_GENERATOR_GOALS)[number]["value"];
export type WorkoutGeneratorExperience = (typeof WORKOUT_GENERATOR_EXPERIENCE_LEVELS)[number]["value"];
export type WorkoutGeneratorEquipment = (typeof WORKOUT_GENERATOR_EQUIPMENT_OPTIONS)[number]["value"];
export type WorkoutGeneratorDuration = (typeof WORKOUT_GENERATOR_DURATION_OPTIONS)[number]["value"];
export type WorkoutGeneratorFocus = (typeof WORKOUT_GENERATOR_FOCUS_OPTIONS)[number]["value"];

export type WorkoutGeneratorInput = {
  goal: WorkoutGeneratorGoal;
  experience: WorkoutGeneratorExperience;
  equipment: WorkoutGeneratorEquipment;
  daysPerWeek: number;
  workoutDuration: WorkoutGeneratorDuration;
  focusArea: WorkoutGeneratorFocus | null;
};

export type WorkoutRecommendationCandidate = {
  template: WorkoutTemplateRecord;
  score: number;
  reasons: string[];
  breakdown: {
    goal: number;
    experience: number;
    equipment: number;
    days: number;
    duration: number;
    focus: number;
    structure: number;
  };
};

export type WorkoutRecommendationResult = {
  recommended: WorkoutRecommendationCandidate | null;
  alternatives: WorkoutRecommendationCandidate[];
  evaluatedCount: number;
};

const durationRanges: Record<WorkoutGeneratorDuration, { minimum: number; maximum: number | null }> = {
  "20-30": { minimum: 20, maximum: 30 },
  "30-45": { minimum: 30, maximum: 45 },
  "45-60": { minimum: 45, maximum: 60 },
  "60-plus": { minimum: 60, maximum: null },
};

const goalPreferences: Record<
  WorkoutGeneratorGoal,
  {
    primary: string[];
    secondary: string[];
  }
> = {
  "weight-loss": {
    primary: ["weight-loss"],
    secondary: ["beginner"],
  },
  "general-fitness": {
    primary: ["beginner"],
    secondary: ["weight-loss"],
  },
  "muscle-gain": {
    primary: ["muscle-building"],
    secondary: ["strength"],
  },
  strength: {
    primary: ["strength"],
    secondary: ["muscle-building"],
  },
  "beginner-fitness": {
    primary: ["beginner"],
    secondary: ["weight-loss"],
  },
};

const experienceRank: Record<WorkoutGeneratorExperience, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const templateExperienceRank: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function pushReason(reasons: string[], reason: string | null) {
  if (!reason || reasons.includes(reason)) {
    return;
  }

  reasons.push(reason);
}

function scoreGoal(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  const preferences = goalPreferences[input.goal];
  const reasons: string[] = [];
  let score = 0;

  if (template.goal && preferences.primary.includes(template.goal)) {
    score += 16;
    pushReason(reasons, `It is built for ${WORKOUT_GENERATOR_GOALS.find((option) => option.value === input.goal)?.label.toLowerCase()}.`);
  } else if (template.goal && preferences.secondary.includes(template.goal)) {
    score += 9;
    pushReason(reasons, "It still fits the kind of training structure that usually works well for your goal.");
  }

  if ((input.goal === "general-fitness" || input.goal === "beginner-fitness") && template.goal === "beginner") {
    score += 3;
  }

  if (input.goal === "muscle-gain" && template.goal === "muscle-building") {
    score += 2;
  }

  if (input.goal === "strength" && template.goal === "strength") {
    score += 2;
  }

  return { score, reasons };
}

function scoreExperience(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  const templateExperience =
    template.experienceLevel ??
    template.difficulty ??
    null;

  if (!templateExperience || !(templateExperience in templateExperienceRank)) {
    return { score: 0, reasons: [] as string[] };
  }

  const userRank = experienceRank[input.experience];
  const workoutRank = templateExperienceRank[templateExperience] ?? 2;
  const difference = workoutRank - userRank;
  const reasons: string[] = [];

  if (difference === 0) {
    pushReason(reasons, "The difficulty lines up with your current experience level.");
    return { score: 12, reasons };
  }

  if (difference < 0) {
    if (difference === -1) {
      pushReason(reasons, "The difficulty should still feel manageable at your current level.");
      return { score: 5, reasons };
    }

    return { score: 2, reasons };
  }

  if (input.experience === "beginner") {
    return { score: -8, reasons };
  }

  pushReason(reasons, "It is a little more challenging, but still in range for someone past the beginner stage.");
  return { score: 2, reasons };
}

function scoreDaysPerWeek(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  if (template.trainingDaysPerWeek == null) {
    return { score: 0, reasons: [] as string[] };
  }

  const difference = Math.abs(template.trainingDaysPerWeek - input.daysPerWeek);
  const reasons: string[] = [];

  if (difference === 0) {
    pushReason(reasons, `It is structured around ${input.daysPerWeek} training days per week.`);
    return { score: 12, reasons };
  }

  if (difference === 1) {
    return { score: 6, reasons };
  }

  if (difference === 2) {
    return { score: 2, reasons };
  }

  return { score: -4, reasons };
}

function scoreDuration(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  if (template.estimatedDurationMinutes == null) {
    return { score: 0, reasons: [] as string[] };
  }

  const range = durationRanges[input.workoutDuration];
  const duration = template.estimatedDurationMinutes;
  const withinRange =
    duration >= range.minimum && (range.maximum == null ? true : duration <= range.maximum);
  const reasons: string[] = [];

  if (withinRange) {
    pushReason(reasons, "The session length fits the time window you selected.");
    return { score: 8, reasons };
  }

  const distance =
    duration < range.minimum
      ? range.minimum - duration
      : range.maximum == null
        ? duration - range.minimum
        : duration - range.maximum;

  if (distance <= 10) {
    return { score: 4, reasons };
  }

  return { score: -1, reasons };
}

function scoreEquipment(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  const equipment = new Set(template.equipment);
  const usesGymOnlyTools =
    equipment.has("barbell") || equipment.has("cable") || equipment.has("machine");
  const usesHomeFriendlyTools = [...equipment].every((item) =>
    ["bodyweight", "dumbbell", "band", "other", "ez-bar"].includes(item),
  );
  const reasons: string[] = [];

  switch (input.equipment) {
    case "home":
      if (usesHomeFriendlyTools && !usesGymOnlyTools) {
        pushReason(reasons, "The equipment list stays home-friendly.");
        return { score: 10, reasons };
      }
      if (equipment.has("bodyweight") || equipment.has("dumbbell")) {
        return { score: 2, reasons };
      }
      return { score: -8, reasons };
    case "dumbbells":
      if (equipment.has("dumbbell") && !usesGymOnlyTools) {
        pushReason(reasons, "It works well with a dumbbell-based setup.");
        return { score: 10, reasons };
      }
      if (equipment.has("dumbbell")) {
        return { score: 5, reasons };
      }
      if (!usesGymOnlyTools) {
        return { score: 6, reasons };
      }
      return { score: -6, reasons };
    case "resistance-bands":
      if (equipment.has("band")) {
        pushReason(reasons, "The setup is already close to a resistance-band friendly workout.");
        return { score: 10, reasons };
      }
      if (!usesGymOnlyTools && !equipment.has("dumbbell")) {
        pushReason(reasons, "The workout is simple enough to adapt with band or bodyweight substitutions.");
        return { score: 7, reasons };
      }
      if (equipment.has("dumbbell") && !usesGymOnlyTools) {
        pushReason(reasons, "It is still home-friendly and easier to adapt than a full gym plan.");
        return { score: 2, reasons };
      }
      return { score: -8, reasons };
    case "full-gym":
      if (usesGymOnlyTools) {
        pushReason(reasons, "The equipment list makes good use of a full gym setup.");
        return { score: 8, reasons };
      }
      return { score: 4, reasons };
  }
}

function scoreFocusArea(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  if (!input.focusArea) {
    return { score: 0, reasons: [] as string[] };
  }

  const reasons: string[] = [];

  if (input.focusArea === "full-body") {
    if (
      template.targetMuscleGroups.length >= 4 ||
      /full body/i.test(template.name)
    ) {
      pushReason(reasons, "It covers enough muscle groups to work well as a full-body recommendation.");
      return { score: 9, reasons };
    }

    return { score: 0, reasons };
  }

  if (template.targetMuscleGroups.includes(input.focusArea)) {
    const focusLabel =
      WORKOUT_GENERATOR_FOCUS_OPTIONS.find((option) => option.value === input.focusArea)?.label.toLowerCase() ??
      input.focusArea;
    pushReason(reasons, `It gives extra attention to ${focusLabel}.`);
    return { score: 10, reasons };
  }

  return { score: 0, reasons };
}

function scoreStructure(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord) {
  const reasons: string[] = [];

  if (input.focusArea && input.focusArea !== "full-body") {
    return { score: 0, reasons };
  }

  const targetCount = template.targetMuscleGroups.length;
  let score = Math.min(targetCount, 5);

  if (
    (input.goal === "general-fitness" || input.goal === "beginner-fitness" || input.goal === "weight-loss") &&
    targetCount >= 4
  ) {
    pushReason(reasons, "It gives you a balanced starting point instead of isolating just one area.");
    score += 2;
  }

  if (input.goal === "strength" && targetCount >= 4) {
    score += 2;
  }

  return { score, reasons };
}

function compareCandidates(left: WorkoutRecommendationCandidate, right: WorkoutRecommendationCandidate) {
  if (right.score !== left.score) return right.score - left.score;
  if (right.breakdown.goal !== left.breakdown.goal) return right.breakdown.goal - left.breakdown.goal;
  if (right.breakdown.days !== left.breakdown.days) return right.breakdown.days - left.breakdown.days;
  if (right.breakdown.equipment !== left.breakdown.equipment) return right.breakdown.equipment - left.breakdown.equipment;
  if (right.breakdown.focus !== left.breakdown.focus) return right.breakdown.focus - left.breakdown.focus;
  if (right.breakdown.experience !== left.breakdown.experience) return right.breakdown.experience - left.breakdown.experience;
  if (right.breakdown.structure !== left.breakdown.structure) return right.breakdown.structure - left.breakdown.structure;
  return left.template.name.localeCompare(right.template.name);
}

function scoreTemplate(input: WorkoutGeneratorInput, template: WorkoutTemplateRecord): WorkoutRecommendationCandidate {
  const goal = scoreGoal(input, template);
  const experience = scoreExperience(input, template);
  const equipment = scoreEquipment(input, template);
  const days = scoreDaysPerWeek(input, template);
  const duration = scoreDuration(input, template);
  const focus = scoreFocusArea(input, template);
  const structure = scoreStructure(input, template);
  const reasons: string[] = [];

  for (const reason of [
    ...goal.reasons,
    ...experience.reasons,
    ...days.reasons,
    ...duration.reasons,
    ...equipment.reasons,
    ...focus.reasons,
    ...structure.reasons,
  ]) {
    pushReason(reasons, reason);
  }

  return {
    template,
    score:
      goal.score +
      experience.score +
      equipment.score +
      days.score +
      duration.score +
      focus.score +
      structure.score,
    reasons: reasons.slice(0, 5),
    breakdown: {
      goal: goal.score,
      experience: experience.score,
      equipment: equipment.score,
      days: days.score,
      duration: duration.score,
      focus: focus.score,
      structure: structure.score,
    },
  };
}

export function getWorkoutGeneratorGoalBrowsePath(goal: string | null) {
  switch (goal) {
    case "weight-loss":
      return "/workouts/weight-loss";
    case "muscle-building":
      return "/workouts/muscle-building";
    case "strength":
      return "/workouts/strength";
    case "beginner":
      return "/workouts/beginner";
    default:
      return "/workouts";
  }
}

export function recommendWorkoutTemplates(
  input: WorkoutGeneratorInput,
  templates: WorkoutTemplateRecord[],
): WorkoutRecommendationResult {
  const publicTemplates = templates.filter((template) => template.isPublic !== false);
  const scored = publicTemplates.map((template) => scoreTemplate(input, template)).sort(compareCandidates);
  const recommended = scored[0] && scored[0].score > 0 ? scored[0] : null;

  return {
    recommended,
    alternatives: recommended ? scored.filter((entry) => entry.template.id !== recommended.template.id).slice(0, 4) : [],
    evaluatedCount: scored.length,
  };
}
