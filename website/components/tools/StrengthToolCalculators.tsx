"use client";

import { useState } from "react";
import {
  calculateDots,
  calculateMeetAttempts,
  calculateRelativeStrength,
  calculateRepMax,
  calculateRestTime,
  calculateStrengthStandards,
  calculateTrainingMax,
  calculateWilks,
  calculateWorkoutVolume,
  poundsToKilograms,
  type ExerciseType,
  type LiftType,
  type MeasurementUnit,
  type RestGoal,
  type Sex,
} from "@/lib/tool-calculators";
import type { ToolSlug } from "@/lib/tools";
import {
  Field,
  FormActions,
  FormError,
  ResultCard,
  ResultGrid,
  ResultMetric,
  SelectInput,
  TextInput,
  ToolFormCard,
  isPositive,
  parseNumber,
} from "@/components/tools/ToolCalculatorUi";

const sexOptions: Array<{ value: Sex; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const liftOptions: Array<{ value: LiftType; label: string }> = [
  { value: "benchPress", label: "Bench press" },
  { value: "squat", label: "Squat" },
  { value: "deadlift", label: "Deadlift" },
  { value: "overheadPress", label: "Overhead press" },
];

const goalOptions: Array<{ value: RestGoal; label: string }> = [
  { value: "strength", label: "Strength" },
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "muscleEndurance", label: "Muscle endurance" },
  { value: "fatLoss", label: "Fat loss" },
];

const exerciseOptions: Array<{ value: ExerciseType; label: string }> = [
  { value: "compound", label: "Compound lift" },
  { value: "isolation", label: "Isolation exercise" },
  { value: "conditioning", label: "Conditioning interval" },
];

const repMaxFormulaLabels = {
  epley: "Epley",
  brzycki: "Brzycki",
  lombardi: "Lombardi",
  oconner: "O'Conner",
} as const;

function RepMaxCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateRepMax> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(weight);
    const parsedReps = parseNumber(reps);

    if (!isPositive(parsedWeight) || !isPositive(parsedReps) || parsedReps > 15) {
      setError("Enter a valid lifted weight and a rep count between 1 and 15.");
      return;
    }

    setError(null);
    setResult(calculateRepMax(parsedWeight, parsedReps));
  };

  return (
    <ToolFormCard
      title="Compare multiple rep-max formulas."
      description="This calculator estimates max strength from a recent set and shows the spread across several common rep-max formulas."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Weight lifted">
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Reps completed">
            <TextInput type="number" min="1" max="15" step="1" value={reps} onChange={(event) => setReps(event.target.value)} />
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
        <ResultCard title="Estimated rep max range">
          <ResultGrid>
            <ResultMetric label="Average estimate" value={`${result.averageEstimate} ${unit}`} />
            <ResultMetric label="Low estimate" value={`${result.lowEstimate} ${unit}`} />
            <ResultMetric label="High estimate" value={`${result.highEstimate} ${unit}`} />
          </ResultGrid>

          <div className="tool-subgrid">
            {result.estimates.map((estimate) => (
              <div key={estimate.formula} className="tool-subcard">
                <h4>{repMaxFormulaLabels[estimate.formula]}</h4>
                <p>
                  {estimate.estimate} {unit}
                </p>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function TrainingMaxCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateTrainingMax> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(weight);
    const parsedReps = parseNumber(reps);

    if (!isPositive(parsedWeight) || !isPositive(parsedReps) || parsedReps > 12) {
      setError("Enter a valid lifted weight and a rep count between 1 and 12.");
      return;
    }

    setError(null);
    setResult(calculateTrainingMax(parsedWeight, parsedReps));
  };

  return (
    <ToolFormCard
      title="Build a more conservative training max."
      description="This starts with an estimated one-rep max and then defaults to a 90 percent training max for programming."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Weight lifted">
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Reps completed">
            <TextInput type="number" min="1" max="12" step="1" value={reps} onChange={(event) => setReps(event.target.value)} />
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
        <ResultCard title="Estimated training max">
          <ResultGrid>
            <ResultMetric label="Estimated 1RM" value={`${result.estimatedOneRepMax} ${unit}`} />
            <ResultMetric label="Training max" value={`${result.trainingMax} ${unit}`} />
          </ResultGrid>
          <div className="tool-subgrid">
            {result.percentages.map((percentage) => (
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

function RelativeStrengthCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [liftType, setLiftType] = useState<LiftType>("benchPress");
  const [bodyweight, setBodyweight] = useState("180");
  const [liftWeight, setLiftWeight] = useState("225");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateRelativeStrength> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedLiftWeight = parseNumber(liftWeight);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedLiftWeight)) {
      setError("Enter a valid bodyweight and lift number before calculating relative strength.");
      return;
    }

    setError(null);
    setResult(
      calculateRelativeStrength({
        bodyweight: parsedBodyweight,
        liftWeight: parsedLiftWeight,
        sex,
        liftType,
        unit,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Compare a lift to your bodyweight."
      description="Relative strength helps put a lift in context by comparing it to your own size instead of only looking at the raw weight."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Lift">
            <SelectInput value={liftType} onChange={(event) => setLiftType(event.target.value as LiftType)}>
              {liftOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Lifted weight">
            <TextInput type="number" min="1" step="0.1" value={liftWeight} onChange={(event) => setLiftWeight(event.target.value)} />
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
        <ResultCard title="Relative strength result">
          <ResultGrid>
            <ResultMetric label="Lift-to-bodyweight ratio" value={`${result.ratio}x`} />
            <ResultMetric label="Estimated level" value={result.level} />
            <ResultMetric label="Lift in kilograms" value={`${result.liftKg} kg`} />
            <ResultMetric label="Bodyweight in kilograms" value={`${result.bodyweightKg} kg`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function DotsCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [bodyweight, setBodyweight] = useState("90");
  const [total, setTotal] = useState("650");
  const [unit, setUnit] = useState<MeasurementUnit>("kg");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateDots> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedTotal = parseNumber(total);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedTotal)) {
      setError("Enter a valid bodyweight and total before calculating a DOTS score.");
      return;
    }

    setError(null);
    setResult(
      calculateDots({
        sex,
        bodyweightKg: unit === "lb" ? poundsToKilograms(parsedBodyweight) : parsedBodyweight,
        totalKg: unit === "lb" ? poundsToKilograms(parsedTotal) : parsedTotal,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Calculate a DOTS score."
      description="DOTS is a bodyweight-adjusted powerlifting score that helps compare totals across different lifter sizes."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Total">
            <TextInput type="number" min="1" step="0.1" value={total} onChange={(event) => setTotal(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="kg">Kilograms</option>
              <option value="lb">Pounds</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="DOTS score">
          <ResultGrid>
            <ResultMetric label="Score" value={`${result.score}`} />
            <ResultMetric label="Bodyweight used" value={`${result.bodyweightKg} kg`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function WilksCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [bodyweight, setBodyweight] = useState("90");
  const [total, setTotal] = useState("650");
  const [unit, setUnit] = useState<MeasurementUnit>("kg");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateWilks> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedTotal = parseNumber(total);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedTotal)) {
      setError("Enter a valid bodyweight and total before calculating a Wilks score.");
      return;
    }

    setError(null);
    setResult(
      calculateWilks({
        sex,
        bodyweightKg: unit === "lb" ? poundsToKilograms(parsedBodyweight) : parsedBodyweight,
        totalKg: unit === "lb" ? poundsToKilograms(parsedTotal) : parsedTotal,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Calculate a Wilks score."
      description="Wilks is a legacy bodyweight-adjusted powerlifting scoring system that can still be useful for quick comparisons."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Total">
            <TextInput type="number" min="1" step="0.1" value={total} onChange={(event) => setTotal(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="kg">Kilograms</option>
              <option value="lb">Pounds</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Wilks score">
          <ResultGrid>
            <ResultMetric label="Score" value={`${result.score}`} />
            <ResultMetric label="Coefficient" value={`${result.coefficient}`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function PowerliftingMeetAttemptCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [recentMax, setRecentMax] = useState("315");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateMeetAttempts> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedRecentMax = parseNumber(recentMax);

    if (!isPositive(parsedRecentMax)) {
      setError("Enter a realistic recent max before calculating attempts.");
      return;
    }

    setError(null);
    setResult(
      calculateMeetAttempts({
        recentMax: parsedRecentMax,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Suggest meet attempts from a recent max."
      description="This gives you a conservative opener, a strong second attempt, and a more ambitious third attempt based on a realistic recent max."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Recent gym max">
            <TextInput type="number" min="1" step="0.1" value={recentMax} onChange={(event) => setRecentMax(event.target.value)} />
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
        <ResultCard title="Suggested meet attempts">
          <ResultGrid>
            <ResultMetric label="Opener" value={`${result.opener} ${unit}`} />
            <ResultMetric label="Second attempt" value={`${result.second} ${unit}`} />
            <ResultMetric label="Third attempt" value={`${result.third} ${unit}`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function StrengthStandardsCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [liftType, setLiftType] = useState<LiftType>("benchPress");
  const [bodyweight, setBodyweight] = useState("180");
  const [liftWeight, setLiftWeight] = useState("225");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateStrengthStandards> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedLiftWeight = parseNumber(liftWeight);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedLiftWeight)) {
      setError("Enter a valid bodyweight and lift number before comparing to standards.");
      return;
    }

    setError(null);
    setResult(
      calculateStrengthStandards({
        sex,
        liftType,
        bodyweight: parsedBodyweight,
        liftWeight: parsedLiftWeight,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Compare a lift to simple standards."
      description="This tool shows rough milestone levels based on bodyweight so you can see where your current number likely falls."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Lift">
            <SelectInput value={liftType} onChange={(event) => setLiftType(event.target.value as LiftType)}>
              {liftOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={bodyweight} onChange={(event) => setBodyweight(event.target.value)} />
          </Field>
          <Field label="Current lift">
            <TextInput type="number" min="1" step="0.1" value={liftWeight} onChange={(event) => setLiftWeight(event.target.value)} />
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
        <ResultCard title="Strength standards result">
          <ResultGrid>
            <ResultMetric label="Estimated level" value={result.level} />
            <ResultMetric label="Lift-to-bodyweight ratio" value={`${result.ratio}x`} />
          </ResultGrid>
          <div className="tool-subgrid">
            {Object.entries(result.standards).map(([level, target]) => (
              <div key={level} className="tool-subcard">
                <h4>{level}</h4>
                <p>
                  {target} {unit}
                </p>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function WorkoutVolumeCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sets, setSets] = useState("4");
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("185");
  const [exerciseCount, setExerciseCount] = useState("1");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateWorkoutVolume> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedSets = parseNumber(sets);
    const parsedReps = parseNumber(reps);
    const parsedWeight = parseNumber(weight);
    const parsedExerciseCount = parseNumber(exerciseCount);

    if (!isPositive(parsedSets) || !isPositive(parsedReps) || !isPositive(parsedWeight) || !isPositive(parsedExerciseCount)) {
      setError("Enter valid sets, reps, load, and exercise count before calculating volume.");
      return;
    }

    setError(null);
    setResult(
      calculateWorkoutVolume({
        sets: parsedSets,
        reps: parsedReps,
        weight: parsedWeight,
        exerciseCount: parsedExerciseCount,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Calculate total workout volume."
      description="Volume is one simple way to compare how much work a lift or training block is asking from you."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sets">
            <TextInput type="number" min="1" step="1" value={sets} onChange={(event) => setSets(event.target.value)} />
          </Field>
          <Field label="Reps">
            <TextInput type="number" min="1" step="1" value={reps} onChange={(event) => setReps(event.target.value)} />
          </Field>
          <Field label={`Weight per rep (${unit})`}>
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Exercise count">
            <TextInput type="number" min="1" step="1" value={exerciseCount} onChange={(event) => setExerciseCount(event.target.value)} />
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
        <ResultCard title="Workout volume">
          <ResultGrid>
            <ResultMetric label="Volume per set" value={`${result.volumePerSet} ${unit}`} />
            <ResultMetric label="Volume per exercise" value={`${result.volumePerExercise} ${unit}`} />
            <ResultMetric label="Total volume" value={`${result.totalVolume} ${unit}`} />
            <ResultMetric label="Total reps" value={`${result.totalReps}`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function RestTimeCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [goal, setGoal] = useState<RestGoal>("hypertrophy");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("compound");
  const [result, setResult] = useState<ReturnType<typeof calculateRestTime> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setResult(
      calculateRestTime({
        goal,
        exerciseType,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Get a rest-time recommendation."
      description="Rest periods depend on your goal and the type of exercise you are doing. This helps you start with a range that fits the session better."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Training goal">
            <SelectInput value={goal} onChange={(event) => setGoal(event.target.value as RestGoal)}>
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Exercise type">
            <SelectInput value={exerciseType} onChange={(event) => setExerciseType(event.target.value as ExerciseType)}>
              {exerciseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug} />
      </form>

      {result ? (
        <ResultCard title="Recommended rest range">
          <ResultGrid>
            <ResultMetric label="Minimum rest" value={`${result.minimumSeconds} sec`} />
            <ResultMetric label="Maximum rest" value={`${result.maximumSeconds} sec`} />
            <ResultMetric label="Recommended range" value={result.recommendation} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

export {
  DotsCalculator,
  PowerliftingMeetAttemptCalculator,
  RelativeStrengthCalculator,
  RepMaxCalculator,
  RestTimeCalculator,
  StrengthStandardsCalculator,
  TrainingMaxCalculator,
  WilksCalculator,
  WorkoutVolumeCalculator,
};
