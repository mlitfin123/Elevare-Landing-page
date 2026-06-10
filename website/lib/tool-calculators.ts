const POUNDS_PER_KILOGRAM = 2.2046226218;
const CENTIMETERS_PER_INCH = 2.54;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  veryActive: 1.725,
  athlete: 1.9,
} as const;

export const PROTEIN_GOAL_RANGES = {
  generalHealth: [0.7, 0.9],
  fatLoss: [0.8, 1.1],
  muscleGain: [0.8, 1.0],
  contestPrep: [1.0, 1.2],
} as const;

const MACRO_PROTEIN_TARGETS = {
  generalHealth: 0.8,
  fatLoss: 0.95,
  muscleGain: 0.9,
  contestPrep: 1.1,
} as const;

const FAT_SPLITS = [
  { label: "High carb", fatRatio: 0.2 },
  { label: "Moderate carb", fatRatio: 0.25 },
  { label: "Low carb", fatRatio: 0.3 },
] as const;

export const ACTIVITY_MET_VALUES = {
  walking: 3.8,
  running: 9.8,
  cycling: 7.5,
  weightTraining: 6,
  swimming: 8,
  elliptical: 5,
  rowing: 7,
  hiking: 6,
  stairClimber: 8.8,
} as const;

export type Sex = "male" | "female";
export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export type ProteinGoal = keyof typeof PROTEIN_GOAL_RANGES;
export type MacroGoal = keyof typeof MACRO_PROTEIN_TARGETS;
export type BurnActivity = keyof typeof ACTIVITY_MET_VALUES;
export type MeasurementUnit = "lb" | "kg";
export type LengthUnit = "in" | "cm";
export type ExperienceLevel = "beginner" | "intermediate" | "experienced";
export type PrepPhase =
  | "Show week"
  | "Peak prep / polish"
  | "Final fat loss phase"
  | "Main prep"
  | "Early prep"
  | "Offseason / improvement"
  | "Post-show / complete";

export type BodyFatCategory =
  | "Essential"
  | "Athlete"
  | "Fitness"
  | "Average"
  | "Above average";

export function poundsToKilograms(weightLb: number) {
  return weightLb / POUNDS_PER_KILOGRAM;
}

export function kilogramsToPounds(weightKg: number) {
  return weightKg * POUNDS_PER_KILOGRAM;
}

export function inchesToCentimeters(lengthInches: number) {
  return lengthInches * CENTIMETERS_PER_INCH;
}

export function centimetersToInches(lengthCm: number) {
  return lengthCm / CENTIMETERS_PER_INCH;
}

export function roundTo(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculateBmr({
  sex,
  weightKg,
  heightCm,
  age,
}: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateMaintenanceCalories(bmr: number, activityLevel: ActivityLevel) {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

export function calculateCalorieTargets(maintenanceCalories: number) {
  return {
    maintenance: roundTo(maintenanceCalories),
    mildCut: roundTo(maintenanceCalories - 250),
    moderateCut: roundTo(maintenanceCalories - 500),
    aggressiveCut: roundTo(maintenanceCalories - 750),
    leanGain: roundTo(maintenanceCalories + 200),
    surplus: roundTo(maintenanceCalories + 350),
  };
}

export function calculateProteinRange(bodyweightLb: number, goal: ProteinGoal) {
  const [minimum, maximum] = PROTEIN_GOAL_RANGES[goal];

  return {
    minimum: roundTo(bodyweightLb * minimum),
    maximum: roundTo(bodyweightLb * maximum),
  };
}

export function calculateMacroPlan({
  calories,
  bodyweightLb,
  goal,
}: {
  calories: number;
  bodyweightLb: number;
  goal: MacroGoal;
}) {
  const proteinGrams = roundTo(bodyweightLb * MACRO_PROTEIN_TARGETS[goal]);
  const proteinCalories = proteinGrams * 4;

  const plans = FAT_SPLITS.map((plan) => {
    const fatGrams = roundTo((calories * plan.fatRatio) / 9);
    const fatCalories = fatGrams * 9;
    const carbCalories = calories - proteinCalories - fatCalories;

    if (carbCalories < 0) {
      return {
        label: plan.label,
        proteinGrams,
        fatGrams,
        carbGrams: 0,
        valid: false,
      };
    }

    return {
      label: plan.label,
      proteinGrams,
      fatGrams,
      carbGrams: roundTo(carbCalories / 4),
      valid: true,
    };
  });

  return {
    proteinGrams,
    plans,
  };
}

export function calculateGoalWeightTimeline({
  currentWeightLb,
  goalWeightLb,
  weeklyRateLb,
  currentDate = new Date(),
}: {
  currentWeightLb: number;
  goalWeightLb: number;
  weeklyRateLb: number;
  currentDate?: Date;
}) {
  const totalChangeLb = Math.abs(currentWeightLb - goalWeightLb);
  const direction = goalWeightLb < currentWeightLb ? "loss" : goalWeightLb > currentWeightLb ? "gain" : "maintain";
  const totalWeeks = weeklyRateLb === 0 ? 0 : Math.ceil(totalChangeLb / weeklyRateLb);
  const targetDate = new Date(currentDate.getTime() + totalWeeks * 7 * DAY_IN_MS);
  const aggressiveLoss = direction === "loss" && (weeklyRateLb > 2 || weeklyRateLb / currentWeightLb > 0.01);

  return {
    totalChangeLb: roundTo(totalChangeLb, 1),
    totalWeeks,
    targetDate,
    direction,
    aggressiveLoss,
  };
}

export function calculateBodyFatPercentage({
  sex,
  height,
  neck,
  waist,
  hips,
  unit,
}: {
  sex: Sex;
  height: number;
  neck: number;
  waist: number;
  hips?: number;
  unit: LengthUnit;
}) {
  const heightInches = unit === "cm" ? centimetersToInches(height) : height;
  const neckInches = unit === "cm" ? centimetersToInches(neck) : neck;
  const waistInches = unit === "cm" ? centimetersToInches(waist) : waist;
  const hipsInches = hips ? (unit === "cm" ? centimetersToInches(hips) : hips) : undefined;

  let percentage = 0;

  if (sex === "male") {
    percentage =
      86.01 * Math.log10(waistInches - neckInches) -
      70.041 * Math.log10(heightInches) +
      36.76;
  } else {
    if (!hipsInches) {
      throw new Error("Hips measurement is required for female body fat calculations.");
    }

    percentage =
      163.205 * Math.log10(waistInches + hipsInches - neckInches) -
      97.684 * Math.log10(heightInches) -
      78.387;
  }

  return {
    percentage: roundTo(percentage, 1),
    category: getBodyFatCategory(sex, percentage),
  };
}

export function getBodyFatCategory(sex: Sex, percentage: number): BodyFatCategory {
  if (sex === "male") {
    if (percentage < 6) return "Essential";
    if (percentage < 14) return "Athlete";
    if (percentage < 18) return "Fitness";
    if (percentage < 25) return "Average";
    return "Above average";
  }

  if (percentage < 14) return "Essential";
  if (percentage < 21) return "Athlete";
  if (percentage < 25) return "Fitness";
  if (percentage < 32) return "Average";
  return "Above average";
}

export function calculateOneRepMax(weight: number, reps: number) {
  const oneRepMax = weight * (1 + reps / 30);
  const trainingPercentages = [95, 90, 85, 80, 75, 70, 65, 60].map((percentage) => ({
    percentage,
    trainingWeight: roundTo((oneRepMax * percentage) / 100),
  }));

  return {
    oneRepMax: roundTo(oneRepMax),
    trainingPercentages,
  };
}

export function calculateCaloriesBurned({
  activity,
  bodyweightKg,
  durationMinutes,
}: {
  activity: BurnActivity;
  bodyweightKg: number;
  durationMinutes: number;
}) {
  const met = ACTIVITY_MET_VALUES[activity];
  const calories = (met * 3.5 * bodyweightKg) / 200 * durationMinutes;

  return {
    met,
    calories: roundTo(calories),
    caloriesPerHour: roundTo((calories / durationMinutes) * 60),
  };
}

export function calculateContestPrepCountdown({
  showDate,
  currentDate = new Date(),
}: {
  showDate: Date;
  currentDate?: Date;
}) {
  const diffMs = showDate.getTime() - currentDate.getTime();
  const daysOut = Math.ceil(diffMs / DAY_IN_MS);
  const weeksOut = roundTo(daysOut / 7, 1);

  return {
    daysOut,
    weeksOut,
    phase: getPrepPhase(daysOut / 7),
  };
}

export function getPrepPhase(weeksOut: number): PrepPhase {
  if (weeksOut < 0) return "Post-show / complete";
  if (weeksOut <= 1) return "Show week";
  if (weeksOut < 4) return "Peak prep / polish";
  if (weeksOut < 8) return "Final fat loss phase";
  if (weeksOut < 16) return "Main prep";
  if (weeksOut < 20) return "Early prep";
  return "Offseason / improvement";
}

export function generateCompetitionTimeline({
  showDate,
  experienceLevel,
  division,
}: {
  showDate: Date;
  experienceLevel: ExperienceLevel;
  division: string;
}) {
  const prepWeeksByExperience: Record<ExperienceLevel, number> = {
    beginner: 24,
    intermediate: 20,
    experienced: 16,
  };

  const prepWeeks = prepWeeksByExperience[experienceLevel];
  const milestones = [
    { title: "Choose show", weeksOut: prepWeeks + 4, detail: `Lock in a target event for ${division}.` },
    { title: "Start prep", weeksOut: prepWeeks, detail: "Begin consistent training, nutrition, and check-ins." },
    { title: "Book posing coach", weeksOut: 14, detail: "Start refining presentation early." },
    { title: "Order suit/trunks", weeksOut: 10, detail: `Order division-specific stagewear for ${division}.` },
    { title: "Register for show", weeksOut: 6, detail: "Confirm entries before deadlines tighten." },
    { title: "Book tanning", weeksOut: 3, detail: "Reserve your tan and backstage services." },
    { title: "Schedule photos", weeksOut: 2, detail: "Line up check-ins, content, or peak-week progress photos." },
    { title: "Peak week", weeksOut: 1, detail: "Finalize the peak-week plan and logistics." },
    { title: "Show day", weeksOut: 0, detail: "Bring your checklist, stay calm, and execute." },
  ];

  return milestones.map((milestone) => {
    const date = new Date(showDate.getTime() - milestone.weeksOut * 7 * DAY_IN_MS);

    return {
      ...milestone,
      date,
    };
  });
}

export function generateShowDayChecklist({
  division,
  travelRequired,
}: {
  division: string;
  travelRequired: boolean;
}) {
  const divisionClothing =
    division === "Men's Physique"
      ? ["Board shorts", "Backup board shorts"]
      : division === "Classic Physique"
        ? ["Classic physique trunks", "Backup trunks"]
        : division === "Bikini"
          ? ["Bikini suit", "Stage heels", "Backup suit connectors"]
          : division === "Wellness"
            ? ["Wellness suit", "Stage heels", "Backup suit connectors"]
            : ["Posing trunks", "Backup posing trunks"];

  const checklist = {
    Documents: ["Photo ID", "Show registration confirmation", "Federation card or membership proof"],
    Clothing: [...divisionClothing, "Warm-up clothes", "Slides or easy-off shoes"],
    Food: ["Planned meals", "Quick carbs", "Water", "Salt packets", "Utensils and napkins"],
    "Pump-up gear": ["Resistance bands", "Light dumbbells or tubing if allowed", "Towel"],
    Grooming: ["Tan products or touch-up supplies", "Glaze or sheen", "Deodorant", "Hair and grooming kit"],
    "Backstage items": ["Phone charger or battery pack", "Headphones", "Posing music or cues", "Notebook"],
    "Travel items": travelRequired
      ? ["Hotel confirmation", "Travel cooler", "Garment bag", "Extra clothes", "Route and check-in details"]
      : ["No extra travel items required"],
  };

  return checklist;
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
