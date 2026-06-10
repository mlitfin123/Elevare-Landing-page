"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  ACTIVITY_FACTORS,
  ACTIVITY_MET_VALUES,
  calculateBmr,
  calculateBodyFatPercentage,
  calculateCalorieTargets,
  calculateCaloriesBurned,
  calculateContestPrepCountdown,
  calculateGoalWeightTimeline,
  calculateMacroPlan,
  calculateMaintenanceCalories,
  calculateOneRepMax,
  calculateProteinRange,
  centimetersToInches,
  formatDateLabel,
  generateCompetitionTimeline,
  generateShowDayChecklist,
  inchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
  type ActivityLevel,
  type BurnActivity,
  type ExperienceLevel,
  type LengthUnit,
  type MacroGoal,
  type MeasurementUnit,
  type ProteinGoal,
  type Sex,
} from "@/lib/tool-calculators";
import type { ToolSlug } from "@/lib/tools";

const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light activity" },
  { value: "moderate", label: "Moderate activity" },
  { value: "veryActive", label: "Very active" },
  { value: "athlete", label: "Athlete" },
];

const goalOptions: Array<{ value: ProteinGoal; label: string }> = [
  { value: "generalHealth", label: "General health" },
  { value: "fatLoss", label: "Fat loss" },
  { value: "muscleGain", label: "Muscle gain" },
  { value: "contestPrep", label: "Contest prep" },
];

const burnActivityOptions: Array<{ value: BurnActivity; label: string }> = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "weightTraining", label: "Weight training" },
  { value: "swimming", label: "Swimming" },
  { value: "elliptical", label: "Elliptical" },
  { value: "rowing", label: "Rowing" },
  { value: "hiking", label: "Hiking" },
  { value: "stairClimber", label: "Stair climber" },
];

const divisionOptions = [
  "Men's Physique",
  "Classic Physique",
  "Bodybuilding",
  "Bikini",
  "Wellness",
  "Figure",
  "Other",
] as const;

function formatDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function parseNumber(value: string) {
  return Number(value);
}

function trackToolCalculation(toolSlug: ToolSlug) {
  trackEvent("tool_calculation", {
    tool_slug: toolSlug,
  });
}

function ToolFormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <article className="panel tool-form-card">
        <div className="section-head tool-form-head">
          <span className="meta-pill">Calculator</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
      </article>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <div className="form-feedback is-error">{message}</div>;
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel tool-result-card">
      <span className="meta-pill">Result</span>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function ResultGrid({ children }: { children: React.ReactNode }) {
  return <div className="tool-result-grid">{children}</div>;
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="tool-result-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FormActions({ toolSlug, children }: { toolSlug: ToolSlug; children?: React.ReactNode }) {
  return (
    <div className="form-actions">
      <button
        className="button button-primary"
        type="submit"
        onClick={() => trackToolCalculation(toolSlug)}
      >
        Calculate
      </button>
      {children}
    </div>
  );
}

function CalorieEstimator({
  toolSlug,
  mode,
}: {
  toolSlug: ToolSlug;
  mode: "full" | "maintenance";
}) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("180");
  const [weightUnit, setWeightUnit] = useState<MeasurementUnit>("lb");
  const [height, setHeight] = useState("70");
  const [heightUnit, setHeightUnit] = useState<LengthUnit>("in");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bmr: number;
    maintenance: ReturnType<typeof calculateCalorieTargets>;
  } | null>(null);

  const title =
    mode === "full" ? "Estimate calories for maintenance, cutting, or gaining." : "Estimate maintenance calories.";
  const description =
    mode === "full"
      ? "Start with your maintenance estimate, then view practical targets for weight loss or leaner weight gain."
      : "Use your age, size, and activity level to estimate roughly where maintenance may land.";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAge = parseNumber(age);
    const parsedWeight = parseNumber(weight);
    const parsedHeight = parseNumber(height);

    if (!isPositive(parsedAge) || !isPositive(parsedWeight) || !isPositive(parsedHeight)) {
      setError("Enter a valid age, weight, and height to calculate your estimate.");
      return;
    }

    const weightKg = weightUnit === "lb" ? poundsToKilograms(parsedWeight) : parsedWeight;
    const heightCm = heightUnit === "in" ? inchesToCentimeters(parsedHeight) : parsedHeight;
    const bmr = calculateBmr({
      sex,
      weightKg,
      heightCm,
      age: parsedAge,
    });
    const maintenanceCalories = calculateMaintenanceCalories(bmr, activity);

    setError(null);
    setResult({
      bmr: Math.round(bmr),
      maintenance: calculateCalorieTargets(maintenanceCalories),
    });
  };

  return (
    <ToolFormCard title={title} description={description}>
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectInput>
          </Field>
          <Field label="Age">
            <TextInput type="number" min="18" value={age} onChange={(event) => setAge(event.target.value)} />
          </Field>
          <Field label="Weight">
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Weight unit">
            <SelectInput value={weightUnit} onChange={(event) => setWeightUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Height">
            <TextInput type="number" min="1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Field>
          <Field label="Height unit">
            <SelectInput value={heightUnit} onChange={(event) => setHeightUnit(event.target.value as LengthUnit)}>
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </SelectInput>
          </Field>
          <Field label="Activity level">
            <SelectInput value={activity} onChange={(event) => setActivity(event.target.value as ActivityLevel)}>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title={mode === "full" ? "Estimated calorie targets" : "Estimated maintenance calories"}>
          <ResultGrid>
            <ResultMetric label="Estimated BMR" value={`${result.bmr} cal`} />
            <ResultMetric label="Maintenance" value={`${result.maintenance.maintenance} cal`} />
            <ResultMetric label="Activity factor" value={ACTIVITY_FACTORS[activity].toFixed(3)} />
          </ResultGrid>

          <div className="tool-subgrid">
            <div className="tool-subcard">
              <h4>Fat loss</h4>
              <ul>
                <li>Mild deficit: {result.maintenance.mildCut} cal</li>
                <li>Moderate deficit: {result.maintenance.moderateCut} cal</li>
                <li>Aggressive deficit: {result.maintenance.aggressiveCut} cal</li>
              </ul>
            </div>
            <div className="tool-subcard">
              <h4>Weight gain</h4>
              <ul>
                <li>Lean gain: {result.maintenance.leanGain} cal</li>
                <li>Surplus: {result.maintenance.surplus} cal</li>
              </ul>
            </div>
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function ProteinCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [goal, setGoal] = useState<ProteinGoal>("fatLoss");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateProteinRange> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(bodyweight);

    if (!isPositive(parsedWeight)) {
      setError("Enter a valid bodyweight before calculating protein.");
      return;
    }

    const bodyweightLb = unit === "kg" ? kilogramsToPounds(parsedWeight) : parsedWeight;

    setError(null);
    setResult(calculateProteinRange(bodyweightLb, goal));
  };

  return (
    <ToolFormCard
      title="Estimate a practical protein target."
      description="Choose your goal and bodyweight to generate a simple daily protein range."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Goal">
            <SelectInput value={goal} onChange={(event) => setGoal(event.target.value as ProteinGoal)}>
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated daily protein range">
          <ResultGrid>
            <ResultMetric label="Low end" value={`${result.minimum} g`} />
            <ResultMetric label="High end" value={`${result.maximum} g`} />
            <ResultMetric label="Middle of the range" value={`${Math.round((result.minimum + result.maximum) / 2)} g`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function MacroCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [calories, setCalories] = useState("2400");
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [goal, setGoal] = useState<MacroGoal>("fatLoss");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateMacroPlan> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCalories = parseNumber(calories);
    const parsedBodyweight = parseNumber(bodyweight);

    if (!isPositive(parsedCalories) || !isPositive(parsedBodyweight)) {
      setError("Enter valid calories and bodyweight before calculating macros.");
      return;
    }

    const bodyweightLb = unit === "kg" ? kilogramsToPounds(parsedBodyweight) : parsedBodyweight;
    const macroPlan = calculateMacroPlan({
      calories: parsedCalories,
      bodyweightLb,
      goal,
    });

    if (macroPlan.plans.some((plan) => !plan.valid)) {
      setError("These calories are too low for the selected bodyweight and goal. Raise calories and try again.");
      return;
    }

    setError(null);
    setResult(macroPlan);
  };

  return (
    <ToolFormCard
      title="Turn calories into usable macros."
      description="Protein is calculated first, then fat and carbs are distributed into low, moderate, and high-carb options."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Calories">
            <TextInput type="number" min="1" step="1" value={calories} onChange={(event) => setCalories(event.target.value)} />
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Bodyweight unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Goal">
            <SelectInput value={goal} onChange={(event) => setGoal(event.target.value as MacroGoal)}>
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Macro split options">
          <ResultGrid>
            <ResultMetric label="Protein target" value={`${result.proteinGrams} g`} />
          </ResultGrid>

          <div className="tool-subgrid">
            {result.plans.map((plan) => (
              <div key={plan.label} className="tool-subcard">
                <h4>{plan.label}</h4>
                <ul>
                  <li>Protein: {plan.proteinGrams} g</li>
                  <li>Fat: {plan.fatGrams} g</li>
                  <li>Carbs: {plan.carbGrams} g</li>
                </ul>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function GoalWeightTimelineCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [currentWeight, setCurrentWeight] = useState("200");
  const [goalWeight, setGoalWeight] = useState("180");
  const [weeklyRate, setWeeklyRate] = useState("1");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [currentDate, setCurrentDate] = useState(formatDateInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateGoalWeightTimeline> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCurrentWeight = parseNumber(currentWeight);
    const parsedGoalWeight = parseNumber(goalWeight);
    const parsedWeeklyRate = parseNumber(weeklyRate);

    if (!isPositive(parsedCurrentWeight) || !isPositive(parsedGoalWeight) || !isPositive(parsedWeeklyRate)) {
      setError("Enter valid weights and a weekly rate before calculating your timeline.");
      return;
    }

    if (parsedCurrentWeight === parsedGoalWeight) {
      setError("Choose a goal weight that is different from your current weight.");
      return;
    }

    const currentWeightLb = unit === "kg" ? kilogramsToPounds(parsedCurrentWeight) : parsedCurrentWeight;
    const goalWeightLb = unit === "kg" ? kilogramsToPounds(parsedGoalWeight) : parsedGoalWeight;

    setError(null);
    setResult(
      calculateGoalWeightTimeline({
        currentWeightLb,
        goalWeightLb,
        weeklyRateLb: unit === "kg" ? kilogramsToPounds(parsedWeeklyRate) : parsedWeeklyRate,
        currentDate: parseDateInput(currentDate),
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate the timeline to your goal weight."
      description="Use your current weight, goal weight, and expected weekly pace to see how long the change may take."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Current weight">
            <TextInput type="number" min="1" step="0.1" value={currentWeight} onChange={(event) => setCurrentWeight(event.target.value)} />
          </Field>
          <Field label="Goal weight">
            <TextInput type="number" min="1" step="0.1" value={goalWeight} onChange={(event) => setGoalWeight(event.target.value)} />
          </Field>
          <Field label="Weekly rate">
            <TextInput type="number" min="0.1" step="0.1" value={weeklyRate} onChange={(event) => setWeeklyRate(event.target.value)} />
          </Field>
          <Field label="Weight unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={currentDate} onChange={(event) => setCurrentDate(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated timeline">
          <ResultGrid>
            <ResultMetric label="Direction" value={result.direction} />
            <ResultMetric label="Total change" value={`${result.totalChangeLb} lb`} />
            <ResultMetric label="Estimated weeks" value={`${result.totalWeeks}`} />
            <ResultMetric label="Estimated target date" value={formatDateLabel(result.targetDate)} />
          </ResultGrid>
          {result.aggressiveLoss ? (
            <p className="tool-warning">
              This weekly loss rate is fairly aggressive. Slower rates are often easier to recover from and sustain.
            </p>
          ) : null}
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function BodyFatCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [height, setHeight] = useState("70");
  const [neck, setNeck] = useState("15");
  const [waist, setWaist] = useState("34");
  const [hips, setHips] = useState("38");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateBodyFatPercentage> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedHeight = parseNumber(height);
    const parsedNeck = parseNumber(neck);
    const parsedWaist = parseNumber(waist);
    const parsedHips = parseNumber(hips);

    if (!isPositive(parsedHeight) || !isPositive(parsedNeck) || !isPositive(parsedWaist)) {
      setError("Enter valid measurements before calculating body fat.");
      return;
    }

    if (sex === "female" && !isPositive(parsedHips)) {
      setError("Hip measurement is required for the female body fat formula.");
      return;
    }

    const baseNeckInches = unit === "cm" ? centimetersToInches(parsedNeck) : parsedNeck;
    const baseWaistInches = unit === "cm" ? centimetersToInches(parsedWaist) : parsedWaist;

    if (sex === "male" && baseWaistInches <= baseNeckInches) {
      setError("Waist must be larger than neck for the Navy method to work.");
      return;
    }

    setError(null);
    setResult(
      calculateBodyFatPercentage({
        sex,
        unit,
        height: parsedHeight,
        neck: parsedNeck,
        waist: parsedWaist,
        hips: sex === "female" ? parsedHips : undefined,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate body fat from measurements."
      description="This uses the U.S. Navy method and supports either inches or centimeters."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectInput>
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as LengthUnit)}>
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </SelectInput>
          </Field>
          <Field label="Height">
            <TextInput type="number" min="1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Field>
          <Field label="Neck">
            <TextInput type="number" min="1" step="0.1" value={neck} onChange={(event) => setNeck(event.target.value)} />
          </Field>
          <Field label="Waist">
            <TextInput type="number" min="1" step="0.1" value={waist} onChange={(event) => setWaist(event.target.value)} />
          </Field>
          {sex === "female" ? (
            <Field label="Hips">
              <TextInput type="number" min="1" step="0.1" value={hips} onChange={(event) => setHips(event.target.value)} />
            </Field>
          ) : null}
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated body fat percentage">
          <ResultGrid>
            <ResultMetric label="Estimated body fat" value={`${result.percentage}%`} />
            <ResultMetric label="Category" value={result.category} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function OneRepMaxCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateOneRepMax> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(weight);
    const parsedReps = parseNumber(reps);

    if (!isPositive(parsedWeight) || !isPositive(parsedReps)) {
      setError("Enter a valid lifted weight and rep count before estimating 1RM.");
      return;
    }

    setError(null);
    setResult(calculateOneRepMax(parsedWeight, parsedReps));
  };

  return (
    <ToolFormCard
      title="Estimate your one-rep max."
      description="This uses the Epley formula and then maps common training percentages from the estimate."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Weight lifted">
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Reps completed">
            <TextInput type="number" min="1" step="1" value={reps} onChange={(event) => setReps(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated 1RM and training percentages">
          <ResultGrid>
            <ResultMetric label="Estimated 1RM" value={`${result.oneRepMax} ${unit}`} />
          </ResultGrid>

          <div className="tool-subgrid">
            {result.trainingPercentages.map((percentage) => (
              <div key={percentage.percentage} className="tool-subcard">
                <h4>{percentage.percentage}%</h4>
                <p>
                  {percentage.trainingWeight} {unit}
                </p>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function CalorieBurnCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [activity, setActivity] = useState<BurnActivity>("walking");
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [duration, setDuration] = useState("45");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateCaloriesBurned> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedDuration = parseNumber(duration);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedDuration)) {
      setError("Enter a valid bodyweight and duration before calculating calories burned.");
      return;
    }

    const bodyweightKg = unit === "lb" ? poundsToKilograms(parsedBodyweight) : parsedBodyweight;

    setError(null);
    setResult(
      calculateCaloriesBurned({
        activity,
        bodyweightKg,
        durationMinutes: parsedDuration,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate calories burned from common activities."
      description="Pick an activity, enter your bodyweight and session duration, and get a rough calorie-burn estimate."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Activity">
            <SelectInput value={activity} onChange={(event) => setActivity(event.target.value as BurnActivity)}>
              {burnActivityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Duration in minutes">
            <TextInput type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated session burn">
          <ResultGrid>
            <ResultMetric label="MET value" value={ACTIVITY_MET_VALUES[activity].toFixed(1)} />
            <ResultMetric label="Calories burned" value={`${result.calories} cal`} />
            <ResultMetric label="Calories per hour" value={`${result.caloriesPerHour} cal`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function ContestPrepCountdownCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [showDate, setShowDate] = useState("");
  const [currentDate, setCurrentDate] = useState(formatDateInputValue(new Date()));
  const [division, setDivision] = useState<string>("Men's Physique");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateContestPrepCountdown> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!showDate) {
      setError("Choose a show date before calculating the countdown.");
      return;
    }

    const countdown = calculateContestPrepCountdown({
      showDate: parseDateInput(showDate),
      currentDate: currentDate ? parseDateInput(currentDate) : new Date(),
    });

    setError(null);
    setResult(countdown);
  };

  return (
    <ToolFormCard
      title="See how far out you are from show day."
      description="Use your show date and, if you want, a comparison date to understand your current prep phase."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Show date">
            <TextInput type="date" value={showDate} onChange={(event) => setShowDate(event.target.value)} />
          </Field>
          <Field label="Current date">
            <TextInput type="date" value={currentDate} onChange={(event) => setCurrentDate(event.target.value)} />
          </Field>
          <Field label="Division">
            <SelectInput value={division} onChange={(event) => setDivision(event.target.value)}>
              {divisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title={`${division} prep countdown`}>
          <ResultGrid>
            <ResultMetric label="Days out" value={`${result.daysOut}`} />
            <ResultMetric label="Weeks out" value={`${result.weeksOut}`} />
            <ResultMetric label="Current phase" value={result.phase} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function CompetitionTimelineGenerator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [showDate, setShowDate] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("intermediate");
  const [division, setDivision] = useState<string>("Men's Physique");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof generateCompetitionTimeline> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!showDate) {
      setError("Choose a show date before generating a timeline.");
      return;
    }

    setError(null);
    setResult(
      generateCompetitionTimeline({
        showDate: parseDateInput(showDate),
        experienceLevel,
        division,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Generate a simple contest prep timeline."
      description="Use your show date, experience level, and division to map out the main prep milestones."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Show date">
            <TextInput type="date" value={showDate} onChange={(event) => setShowDate(event.target.value)} />
          </Field>
          <Field label="Experience level">
            <SelectInput value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="experienced">Experienced</option>
            </SelectInput>
          </Field>
          <Field label="Division">
            <SelectInput value={division} onChange={(event) => setDivision(event.target.value)}>
              {divisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Competition timeline">
          <div className="tool-timeline">
            {result.map((milestone) => (
              <div key={milestone.title} className="tool-timeline-item">
                <div>
                  <strong>{milestone.title}</strong>
                  <p>{milestone.detail}</p>
                </div>
                <div className="tool-timeline-meta">
                  <span>{milestone.weeksOut === 0 ? "Show day" : `${milestone.weeksOut} weeks out`}</span>
                  <strong>{formatDateLabel(milestone.date)}</strong>
                </div>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function ShowDayChecklistGenerator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [division, setDivision] = useState<string>("Men's Physique");
  const [travelRequired, setTravelRequired] = useState("yes");
  const [result, setResult] = useState<ReturnType<typeof generateShowDayChecklist> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setResult(
      generateShowDayChecklist({
        division,
        travelRequired: travelRequired === "yes",
      }),
    );
  };

  return (
    <ToolFormCard
      title="Generate a cleaner show day packing list."
      description="Pick your division and whether travel is involved to generate a practical checklist grouped by category."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Division">
            <SelectInput value={division} onChange={(event) => setDivision(event.target.value)}>
              {divisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Travel required">
            <SelectInput value={travelRequired} onChange={(event) => setTravelRequired(event.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug} />
      </form>

      {result ? (
        <ResultCard title="Show day checklist">
          <div className="tool-subgrid">
            {Object.entries(result).map(([group, items]) => (
              <div key={group} className="tool-subcard">
                <h4>{group}</h4>
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

export function ToolCalculatorRenderer({ toolSlug }: { toolSlug: ToolSlug }) {
  switch (toolSlug) {
    case "calorie-calculator":
      return <CalorieEstimator toolSlug={toolSlug} mode="full" />;
    case "maintenance-calorie-calculator":
      return <CalorieEstimator toolSlug={toolSlug} mode="maintenance" />;
    case "calorie-burn-calculator":
      return <CalorieBurnCalculator toolSlug={toolSlug} />;
    case "body-fat-calculator":
      return <BodyFatCalculator toolSlug={toolSlug} />;
    case "one-rep-max-calculator":
      return <OneRepMaxCalculator toolSlug={toolSlug} />;
    case "protein-calculator":
      return <ProteinCalculator toolSlug={toolSlug} />;
    case "macro-calculator":
      return <MacroCalculator toolSlug={toolSlug} />;
    case "goal-weight-timeline-calculator":
      return <GoalWeightTimelineCalculator toolSlug={toolSlug} />;
    case "contest-prep-countdown":
      return <ContestPrepCountdownCalculator toolSlug={toolSlug} />;
    case "competition-timeline-generator":
      return <CompetitionTimelineGenerator toolSlug={toolSlug} />;
    case "show-day-checklist-generator":
      return <ShowDayChecklistGenerator toolSlug={toolSlug} />;
    default:
      return null;
  }
}
