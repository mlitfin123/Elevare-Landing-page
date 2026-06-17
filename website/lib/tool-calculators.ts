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

export type PaceUnit = "mi" | "km";
export type PaceMode = "pace" | "time" | "distance";
export type RepMaxFormula = "epley" | "brzycki" | "lombardi" | "oconner";
export type LiftType = "benchPress" | "squat" | "deadlift" | "overheadPress";
export type StrengthLevel = "Beginner" | "Novice" | "Intermediate" | "Advanced" | "Elite";
export type HeartRateZoneName = "Very light" | "Light" | "Moderate" | "Hard" | "Maximum";
export type RestGoal = "strength" | "hypertrophy" | "muscleEndurance" | "fatLoss";
export type ExerciseType = "compound" | "isolation" | "conditioning";
export type BmiCategory = "Underweight" | "Healthy weight" | "Overweight" | "Obesity";

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

function normalizeMetricWeight(weight: number, unit: MeasurementUnit) {
  return unit === "lb" ? poundsToKilograms(weight) : weight;
}

function normalizeMetricHeight(height: number, unit: LengthUnit) {
  return unit === "in" ? inchesToCentimeters(height) : height;
}

function normalizeImperialHeight(height: number, unit: LengthUnit) {
  return unit === "cm" ? centimetersToInches(height) : height;
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  return "Obesity";
}

export function calculateTdee({
  sex,
  weightKg,
  heightCm,
  age,
  activityLevel,
}: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
}) {
  const bmr = calculateBmr({ sex, weightKg, heightCm, age });
  const tdee = calculateMaintenanceCalories(bmr, activityLevel);

  return {
    bmr: roundTo(bmr),
    activityFactor: ACTIVITY_FACTORS[activityLevel],
    tdee: roundTo(tdee),
  };
}

export function calculateBmi({
  weight,
  height,
  weightUnit,
  heightUnit,
}: {
  weight: number;
  height: number;
  weightUnit: MeasurementUnit;
  heightUnit: LengthUnit;
}) {
  const weightKg = normalizeMetricWeight(weight, weightUnit);
  const heightMeters = normalizeMetricHeight(height, heightUnit) / 100;
  const bmi = weightKg / (heightMeters ** 2);

  return {
    bmi: roundTo(bmi, 1),
    category: getBmiCategory(bmi),
  };
}

export function calculateLeanBodyMass({
  weight,
  bodyFatPercentage,
  unit,
}: {
  weight: number;
  bodyFatPercentage: number;
  unit: MeasurementUnit;
}) {
  const weightLb = unit === "kg" ? kilogramsToPounds(weight) : weight;
  const leanBodyMassLb = weightLb * (1 - bodyFatPercentage / 100);
  const fatMassLb = weightLb - leanBodyMassLb;

  return {
    leanBodyMassLb: roundTo(leanBodyMassLb, 1),
    leanBodyMassKg: roundTo(poundsToKilograms(leanBodyMassLb), 1),
    fatMassLb: roundTo(fatMassLb, 1),
    fatMassKg: roundTo(poundsToKilograms(fatMassLb), 1),
  };
}

export function calculateWaterIntake({
  bodyweight,
  unit,
  activityMinutes = 0,
}: {
  bodyweight: number;
  unit: MeasurementUnit;
  activityMinutes?: number;
}) {
  const bodyweightLb = unit === "kg" ? kilogramsToPounds(bodyweight) : bodyweight;
  const baselineOunces = bodyweightLb * 0.5;
  const performanceOunces = bodyweightLb * 0.67;
  const activityOunces = (activityMinutes / 30) * 12;
  const targetOunces = baselineOunces + activityOunces;
  const higherTargetOunces = performanceOunces + activityOunces;

  return {
    baselineOunces: roundTo(baselineOunces),
    targetOunces: roundTo(targetOunces),
    higherTargetOunces: roundTo(higherTargetOunces),
    baselineLiters: roundTo(baselineOunces * 0.0295735, 1),
    targetLiters: roundTo(targetOunces * 0.0295735, 1),
    higherTargetLiters: roundTo(higherTargetOunces * 0.0295735, 1),
    cups: roundTo(targetOunces / 8),
  };
}

export function calculateCalorieDifference({
  maintenanceCalories,
  intakeCalories,
}: {
  maintenanceCalories: number;
  intakeCalories: number;
}) {
  const difference = intakeCalories - maintenanceCalories;
  const weeklyEquivalent = difference * 7;

  return {
    difference: roundTo(difference),
    weeklyEquivalent: roundTo(weeklyEquivalent),
    status: difference > 0 ? "surplus" : difference < 0 ? "deficit" : "maintenance",
  };
}

export function calculateIdealBodyWeight({
  sex,
  height,
  unit,
}: {
  sex: Sex;
  height: number;
  unit: LengthUnit;
}) {
  const heightInches = normalizeImperialHeight(height, unit);
  const inchesOverFiveFeet = Math.max(0, heightInches - 60);
  const idealWeightKg = (sex === "male" ? 50 : 45.5) + inchesOverFiveFeet * 2.3;

  return {
    idealWeightKg: roundTo(idealWeightKg, 1),
    idealWeightLb: roundTo(kilogramsToPounds(idealWeightKg), 1),
  };
}

function getWalkingMetFromSpeed(speedMph: number) {
  if (speedMph < 2) return 2.5;
  if (speedMph < 3) return 2.8;
  if (speedMph < 3.5) return 3.5;
  if (speedMph < 4) return 4.3;
  return 5;
}

function getRunningMetFromSpeed(speedMph: number) {
  if (speedMph < 5) return 6;
  if (speedMph < 6) return 8.3;
  if (speedMph < 7) return 9.8;
  if (speedMph < 8) return 11;
  if (speedMph < 9) return 11.8;
  if (speedMph < 10) return 12.8;
  return 14.5;
}

export function calculateWalkingCalories({
  bodyweightKg,
  durationMinutes,
  speedMph,
}: {
  bodyweightKg: number;
  durationMinutes: number;
  speedMph: number;
}) {
  const met = getWalkingMetFromSpeed(speedMph);
  const calories = (met * 3.5 * bodyweightKg) / 200 * durationMinutes;
  const distanceMiles = speedMph * (durationMinutes / 60);

  return {
    met,
    calories: roundTo(calories),
    distanceMiles: roundTo(distanceMiles, 1),
    caloriesPerMile: distanceMiles > 0 ? roundTo(calories / distanceMiles) : 0,
  };
}

export function calculateRunningCalories({
  bodyweightKg,
  durationMinutes,
  speedMph,
}: {
  bodyweightKg: number;
  durationMinutes: number;
  speedMph: number;
}) {
  const met = getRunningMetFromSpeed(speedMph);
  const calories = (met * 3.5 * bodyweightKg) / 200 * durationMinutes;
  const distanceMiles = speedMph * (durationMinutes / 60);

  return {
    met,
    calories: roundTo(calories),
    distanceMiles: roundTo(distanceMiles, 1),
    caloriesPerMile: distanceMiles > 0 ? roundTo(calories / distanceMiles) : 0,
  };
}

export function calculateStepsToCalories({
  bodyweight,
  unit,
  steps,
  height,
  heightUnit,
}: {
  bodyweight: number;
  unit: MeasurementUnit;
  steps: number;
  height: number;
  heightUnit: LengthUnit;
}) {
  const bodyweightLb = unit === "kg" ? kilogramsToPounds(bodyweight) : bodyweight;
  const heightInches = normalizeImperialHeight(height, heightUnit);
  const strideLengthInches = heightInches * 0.415;
  const distanceMiles = (steps * strideLengthInches) / 63360;
  const calories = distanceMiles * bodyweightLb * 0.53;

  return {
    strideLengthInches: roundTo(strideLengthInches, 1),
    distanceMiles: roundTo(distanceMiles, 2),
    distanceKm: roundTo(distanceMiles * 1.60934, 2),
    calories: roundTo(calories),
  };
}

export function calculateTargetHeartRate(age: number) {
  const maxHeartRate = 220 - age;
  const zones: Array<{ name: HeartRateZoneName; lowerBpm: number; upperBpm: number }> = [
    { name: "Very light", lowerBpm: roundTo(maxHeartRate * 0.5), upperBpm: roundTo(maxHeartRate * 0.6) },
    { name: "Light", lowerBpm: roundTo(maxHeartRate * 0.6), upperBpm: roundTo(maxHeartRate * 0.7) },
    { name: "Moderate", lowerBpm: roundTo(maxHeartRate * 0.7), upperBpm: roundTo(maxHeartRate * 0.8) },
    { name: "Hard", lowerBpm: roundTo(maxHeartRate * 0.8), upperBpm: roundTo(maxHeartRate * 0.9) },
    { name: "Maximum", lowerBpm: roundTo(maxHeartRate * 0.9), upperBpm: maxHeartRate },
  ];

  return {
    maxHeartRate,
    zones,
  };
}

function formatClockDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  return {
    hours,
    minutes,
    seconds,
    label:
      hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`,
  };
}

function formatPaceLabel(minutesPerUnit: number) {
  const wholeMinutes = Math.floor(minutesPerUnit);
  const seconds = Math.round((minutesPerUnit - wholeMinutes) * 60);
  return `${wholeMinutes}:${String(seconds).padStart(2, "0")}`;
}

export function calculatePace({
  mode,
  distance,
  distanceUnit,
  hours = 0,
  minutes = 0,
  seconds = 0,
  paceMinutes = 0,
  paceSeconds = 0,
}: {
  mode: PaceMode;
  distance: number;
  distanceUnit: PaceUnit;
  hours?: number;
  minutes?: number;
  seconds?: number;
  paceMinutes?: number;
  paceSeconds?: number;
}) {
  const totalTimeSeconds = hours * 3600 + minutes * 60 + seconds;
  const paceSecondsTotal = paceMinutes * 60 + paceSeconds;
  const miles = distanceUnit === "mi" ? distance : distance / 1.60934;
  const kilometers = distanceUnit === "km" ? distance : distance * 1.60934;

  if (mode === "pace") {
    const pacePerSelectedUnitMinutes = totalTimeSeconds / 60 / distance;
    const pacePerMileMinutes = totalTimeSeconds / 60 / miles;
    const pacePerKmMinutes = totalTimeSeconds / 60 / kilometers;

    return {
      mode,
      distance,
      distanceUnit,
      totalTime: formatClockDuration(totalTimeSeconds),
      pacePerSelectedUnit: formatPaceLabel(pacePerSelectedUnitMinutes),
      pacePerMile: formatPaceLabel(pacePerMileMinutes),
      pacePerKilometer: formatPaceLabel(pacePerKmMinutes),
    };
  }

  if (mode === "time") {
    const predictedSeconds = distance * paceSecondsTotal;
    return {
      mode,
      distance,
      distanceUnit,
      totalTime: formatClockDuration(predictedSeconds),
      pacePerSelectedUnit: formatPaceLabel(paceSecondsTotal / 60),
    };
  }

  const calculatedDistance = totalTimeSeconds / paceSecondsTotal;
  const calculatedMiles = distanceUnit === "mi" ? calculatedDistance : calculatedDistance / 1.60934;
  const calculatedKilometers = distanceUnit === "km" ? calculatedDistance : calculatedDistance * 1.60934;

  return {
    mode,
    distance: roundTo(calculatedDistance, 2),
    distanceUnit,
    totalTime: formatClockDuration(totalTimeSeconds),
    pacePerSelectedUnit: formatPaceLabel(paceSecondsTotal / 60),
    distanceMiles: roundTo(calculatedMiles, 2),
    distanceKilometers: roundTo(calculatedKilometers, 2),
  };
}

export function calculateRepMax(weight: number, reps: number) {
  const estimates = {
    epley: weight * (1 + reps / 30),
    brzycki: weight * (36 / (37 - reps)),
    lombardi: weight * (reps ** 0.1),
    oconner: weight * (1 + reps * 0.025),
  } as const;

  const estimateEntries = Object.entries(estimates).map(([formula, estimate]) => ({
    formula: formula as RepMaxFormula,
    estimate: roundTo(estimate),
  }));
  const rawValues = estimateEntries.map((entry) => entry.estimate);
  const averageEstimate = rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;

  return {
    estimates: estimateEntries,
    averageEstimate: roundTo(averageEstimate),
    lowEstimate: Math.min(...rawValues),
    highEstimate: Math.max(...rawValues),
  };
}

export function calculateTrainingMax(weight: number, reps: number) {
  const estimatedOneRepMax = calculateOneRepMax(weight, reps).oneRepMax;
  const trainingMax = estimatedOneRepMax * 0.9;

  return {
    estimatedOneRepMax,
    trainingMax: roundTo(trainingMax),
    percentages: [95, 90, 85, 80, 75, 70].map((percentage) => ({
      percentage,
      trainingWeight: roundTo((trainingMax * percentage) / 100),
    })),
  };
}

const RELATIVE_STRENGTH_THRESHOLDS: Record<Sex, Record<LiftType, [number, number, number, number]>> = {
  male: {
    benchPress: [0.75, 1, 1.4, 1.8],
    squat: [1, 1.5, 2, 2.5],
    deadlift: [1.25, 1.75, 2.25, 2.75],
    overheadPress: [0.45, 0.65, 0.9, 1.15],
  },
  female: {
    benchPress: [0.45, 0.7, 0.95, 1.2],
    squat: [0.8, 1.2, 1.7, 2.1],
    deadlift: [1, 1.4, 1.9, 2.3],
    overheadPress: [0.3, 0.45, 0.65, 0.85],
  },
};

function getStrengthLevelFromRatio(sex: Sex, liftType: LiftType, ratio: number): StrengthLevel {
  const [novice, intermediate, advanced, elite] = RELATIVE_STRENGTH_THRESHOLDS[sex][liftType];

  if (ratio < novice) return "Beginner";
  if (ratio < intermediate) return "Novice";
  if (ratio < advanced) return "Intermediate";
  if (ratio < elite) return "Advanced";
  return "Elite";
}

export function calculateRelativeStrength({
  liftWeight,
  bodyweight,
  sex,
  liftType,
  unit,
}: {
  liftWeight: number;
  bodyweight: number;
  sex: Sex;
  liftType: LiftType;
  unit: MeasurementUnit;
}) {
  const ratio = liftWeight / bodyweight;
  const standardizedLift = unit === "lb" ? poundsToKilograms(liftWeight) : liftWeight;
  const standardizedBodyweight = unit === "lb" ? poundsToKilograms(bodyweight) : bodyweight;

  return {
    ratio: roundTo(ratio, 2),
    level: getStrengthLevelFromRatio(sex, liftType, ratio),
    liftKg: roundTo(standardizedLift, 1),
    bodyweightKg: roundTo(standardizedBodyweight, 1),
  };
}

export function calculateDots({
  sex,
  bodyweightKg,
  totalKg,
}: {
  sex: Sex;
  bodyweightKg: number;
  totalKg: number;
}) {
  const clippedBodyweight =
    sex === "male"
      ? Math.min(Math.max(bodyweightKg, 40), 210)
      : Math.min(Math.max(bodyweightKg, 40), 150);
  const coefficients =
    sex === "male"
      ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
      : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];

  const denominator =
    coefficients[0] +
    coefficients[1] * clippedBodyweight +
    coefficients[2] * clippedBodyweight ** 2 +
    coefficients[3] * clippedBodyweight ** 3 +
    coefficients[4] * clippedBodyweight ** 4;

  return {
    bodyweightKg: roundTo(clippedBodyweight, 1),
    score: roundTo((500 / denominator) * totalKg, 2),
  };
}

export function calculateWilks({
  sex,
  bodyweightKg,
  totalKg,
}: {
  sex: Sex;
  bodyweightKg: number;
  totalKg: number;
}) {
  const coefficients =
    sex === "male"
      ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 0.00000701863, -0.00000001291]
      : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054];

  const denominator =
    coefficients[0] +
    coefficients[1] * bodyweightKg +
    coefficients[2] * bodyweightKg ** 2 +
    coefficients[3] * bodyweightKg ** 3 +
    coefficients[4] * bodyweightKg ** 4 +
    coefficients[5] * bodyweightKg ** 5;
  const coefficient = 500 / denominator;

  return {
    coefficient: roundTo(coefficient, 4),
    score: roundTo(totalKg * coefficient, 2),
  };
}

export function calculateMeetAttempts({
  recentMax,
}: {
  recentMax: number;
}) {
  return {
    opener: roundTo(recentMax * 0.91),
    second: roundTo(recentMax * 0.97),
    third: roundTo(recentMax * 1.02),
  };
}

export function calculateStrengthStandards({
  sex,
  liftType,
  bodyweight,
  liftWeight,
}: {
  sex: Sex;
  liftType: LiftType;
  bodyweight: number;
  liftWeight: number;
}) {
  const ratio = liftWeight / bodyweight;
  const thresholds = RELATIVE_STRENGTH_THRESHOLDS[sex][liftType];

  return {
    level: getStrengthLevelFromRatio(sex, liftType, ratio),
    ratio: roundTo(ratio, 2),
    standards: {
      Beginner: roundTo(bodyweight * thresholds[0]),
      Novice: roundTo(bodyweight * thresholds[1]),
      Intermediate: roundTo(bodyweight * thresholds[2]),
      Advanced: roundTo(bodyweight * thresholds[3]),
      Elite: roundTo(bodyweight * (thresholds[3] + 0.25)),
    },
  };
}

export function calculateWorkoutVolume({
  sets,
  reps,
  weight,
  exerciseCount = 1,
}: {
  sets: number;
  reps: number;
  weight: number;
  exerciseCount?: number;
}) {
  const volumePerExercise = sets * reps * weight;
  const totalVolume = volumePerExercise * exerciseCount;

  return {
    volumePerSet: roundTo(reps * weight),
    volumePerExercise: roundTo(volumePerExercise),
    totalVolume: roundTo(totalVolume),
    totalReps: sets * reps * exerciseCount,
  };
}

export function calculateReverseDiet({
  currentCalories,
  targetCalories,
  weeklyIncrease,
}: {
  currentCalories: number;
  targetCalories: number;
  weeklyIncrease: number;
}) {
  const totalIncrease = Math.max(0, targetCalories - currentCalories);
  const weeks = weeklyIncrease > 0 ? Math.ceil(totalIncrease / weeklyIncrease) : 0;
  const milestones = Array.from({ length: weeks }, (_, index) => {
    const calories = Math.min(targetCalories, currentCalories + weeklyIncrease * (index + 1));
    return {
      week: index + 1,
      calories: roundTo(calories),
    };
  });

  return {
    totalIncrease: roundTo(totalIncrease),
    weeks,
    milestones,
  };
}

export function calculateBodyRecomposition({
  maintenanceCalories,
  bodyweightLb,
}: {
  maintenanceCalories: number;
  bodyweightLb: number;
}) {
  const targetCalories = maintenanceCalories - 200;
  const proteinGrams = roundTo(bodyweightLb);
  const fatGrams = roundTo((targetCalories * 0.25) / 9);
  const carbGrams = roundTo((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4);

  return {
    targetCalories: roundTo(targetCalories),
    proteinGrams,
    fatGrams,
    carbGrams,
  };
}

export function calculateProteinPerMeal({
  dailyProtein,
  meals,
}: {
  dailyProtein: number;
  meals: number;
}) {
  const perMeal = dailyProtein / meals;

  return {
    perMeal: roundTo(perMeal),
    minimumTarget: roundTo(perMeal - 5),
    higherTarget: roundTo(perMeal + 5),
  };
}

export function calculateMacroSplit({
  calories,
  proteinPercentage,
  carbPercentage,
  fatPercentage,
}: {
  calories: number;
  proteinPercentage: number;
  carbPercentage: number;
  fatPercentage: number;
}) {
  return {
    proteinCalories: roundTo((calories * proteinPercentage) / 100),
    carbCalories: roundTo((calories * carbPercentage) / 100),
    fatCalories: roundTo((calories * fatPercentage) / 100),
    proteinGrams: roundTo(((calories * proteinPercentage) / 100) / 4),
    carbGrams: roundTo(((calories * carbPercentage) / 100) / 4),
    fatGrams: roundTo(((calories * fatPercentage) / 100) / 9),
  };
}

export function calculateRestTime({
  goal,
  exerciseType,
}: {
  goal: RestGoal;
  exerciseType: ExerciseType;
}) {
  const recommendationMap: Record<RestGoal, Record<ExerciseType, [number, number]>> = {
    strength: {
      compound: [120, 300],
      isolation: [60, 120],
      conditioning: [45, 75],
    },
    hypertrophy: {
      compound: [90, 180],
      isolation: [45, 90],
      conditioning: [30, 60],
    },
    muscleEndurance: {
      compound: [45, 90],
      isolation: [30, 60],
      conditioning: [20, 45],
    },
    fatLoss: {
      compound: [45, 90],
      isolation: [30, 60],
      conditioning: [15, 30],
    },
  };

  const [minimumSeconds, maximumSeconds] = recommendationMap[goal][exerciseType];

  return {
    minimumSeconds,
    maximumSeconds,
    recommendation: `${roundTo(minimumSeconds / 60, 1)} to ${roundTo(maximumSeconds / 60, 1)} minutes`,
  };
}
