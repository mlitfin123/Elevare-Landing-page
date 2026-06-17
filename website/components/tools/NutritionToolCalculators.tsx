"use client";

import { useState } from "react";
import {
  ACTIVITY_FACTORS,
  calculateBmi,
  calculateBodyRecomposition,
  calculateCalorieDifference,
  calculateCalorieTargets,
  calculateIdealBodyWeight,
  calculateLeanBodyMass,
  calculateMacroSplit,
  calculatePace,
  calculateProteinPerMeal,
  calculateReverseDiet,
  calculateStepsToCalories,
  calculateTargetHeartRate,
  calculateTdee,
  calculateWaterIntake,
  calculateWalkingCalories,
  calculateRunningCalories,
  calculateBmr,
  inchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
  type ActivityLevel,
  type LengthUnit,
  type MeasurementUnit,
  type PaceMode,
  type PaceUnit,
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

const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light activity" },
  { value: "moderate", label: "Moderate activity" },
  { value: "veryActive", label: "Very active" },
  { value: "athlete", label: "Athlete" },
];

function EnergyProfileFields({
  sex,
  setSex,
  age,
  setAge,
  weight,
  setWeight,
  weightUnit,
  setWeightUnit,
  height,
  setHeight,
  heightUnit,
  setHeightUnit,
  activity,
  setActivity,
  includeActivity = true,
}: {
  sex: Sex;
  setSex: (value: Sex) => void;
  age: string;
  setAge: (value: string) => void;
  weight: string;
  setWeight: (value: string) => void;
  weightUnit: MeasurementUnit;
  setWeightUnit: (value: MeasurementUnit) => void;
  height: string;
  setHeight: (value: string) => void;
  heightUnit: LengthUnit;
  setHeightUnit: (value: LengthUnit) => void;
  activity: ActivityLevel;
  setActivity: (value: ActivityLevel) => void;
  includeActivity?: boolean;
}) {
  return (
    <div className="tool-form-grid">
      <Field label="Sex">
        <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </SelectInput>
      </Field>
      <Field label="Age">
        <TextInput type="number" min="18" max="100" value={age} onChange={(event) => setAge(event.target.value)} />
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
      {includeActivity ? (
        <Field label="Activity level">
          <SelectInput value={activity} onChange={(event) => setActivity(event.target.value as ActivityLevel)}>
            {activityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}
    </div>
  );
}

function parseEnergyProfile({
  age,
  weight,
  weightUnit,
  height,
  heightUnit,
}: {
  age: string;
  weight: string;
  weightUnit: MeasurementUnit;
  height: string;
  heightUnit: LengthUnit;
}) {
  const parsedAge = parseNumber(age);
  const parsedWeight = parseNumber(weight);
  const parsedHeight = parseNumber(height);

  if (!isPositive(parsedAge) || !isPositive(parsedWeight) || !isPositive(parsedHeight)) {
    return null;
  }

  return {
    age: parsedAge,
    weightKg: weightUnit === "lb" ? poundsToKilograms(parsedWeight) : parsedWeight,
    heightCm: heightUnit === "in" ? inchesToCentimeters(parsedHeight) : parsedHeight,
  };
}

function formatWeeklyDelta(calorieDifference: number) {
  const estimatedWeeklyChange = (Math.abs(calorieDifference) * 7) / 3500;
  return estimatedWeeklyChange.toFixed(1);
}

function BmrCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("180");
  const [weightUnit, setWeightUnit] = useState<MeasurementUnit>("lb");
  const [height, setHeight] = useState("70");
  const [heightUnit, setHeightUnit] = useState<LengthUnit>("in");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const profile = parseEnergyProfile({ age, weight, weightUnit, height, heightUnit });

    if (!profile) {
      setError("Enter a valid age, height, and weight before calculating BMR.");
      return;
    }

    setError(null);
    setResult(
      Math.round(
        calculateBmr({
          sex,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
        }),
      ),
    );
  };

  return (
    <ToolFormCard
      title="Estimate calories burned at rest."
      description="BMR is the approximate number of calories your body uses at rest before training and daily activity are added in."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <EnergyProfileFields
          sex={sex}
          setSex={setSex}
          age={age}
          setAge={setAge}
          weight={weight}
          setWeight={setWeight}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          height={height}
          setHeight={setHeight}
          heightUnit={heightUnit}
          setHeightUnit={setHeightUnit}
          activity={activity}
          setActivity={setActivity}
          includeActivity={false}
        />

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result !== null ? (
        <ResultCard title="Estimated BMR">
          <ResultGrid>
            <ResultMetric label="Basal metabolic rate" value={`${result} cal`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function TdeeCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("180");
  const [weightUnit, setWeightUnit] = useState<MeasurementUnit>("lb");
  const [height, setHeight] = useState("70");
  const [heightUnit, setHeightUnit] = useState<LengthUnit>("in");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateTdee> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const profile = parseEnergyProfile({ age, weight, weightUnit, height, heightUnit });

    if (!profile) {
      setError("Enter a valid age, height, and weight before calculating TDEE.");
      return;
    }

    setError(null);
    setResult(
      calculateTdee({
        sex,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        activityLevel: activity,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate total daily energy expenditure."
      description="TDEE combines your estimated resting calorie needs with your average activity level to estimate daily maintenance calories."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <EnergyProfileFields
          sex={sex}
          setSex={setSex}
          age={age}
          setAge={setAge}
          weight={weight}
          setWeight={setWeight}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          height={height}
          setHeight={setHeight}
          heightUnit={heightUnit}
          setHeightUnit={setHeightUnit}
          activity={activity}
          setActivity={setActivity}
        />

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated TDEE">
          <ResultGrid>
            <ResultMetric label="Estimated BMR" value={`${result.bmr} cal`} />
            <ResultMetric label="Activity factor" value={ACTIVITY_FACTORS[activity].toFixed(3)} />
            <ResultMetric label="Estimated TDEE" value={`${result.tdee} cal`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function WeightChangeCalculator({
  toolSlug,
  mode,
}: {
  toolSlug: ToolSlug;
  mode: "loss" | "gain";
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
    tdee: ReturnType<typeof calculateTdee>;
    targets: ReturnType<typeof calculateCalorieTargets>;
  } | null>(null);

  const isLoss = mode === "loss";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const profile = parseEnergyProfile({ age, weight, weightUnit, height, heightUnit });

    if (!profile) {
      setError(`Enter a valid age, height, and weight before calculating ${isLoss ? "weight-loss" : "weight-gain"} calories.`);
      return;
    }

    const tdee = calculateTdee({
      sex,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      activityLevel: activity,
    });

    setError(null);
    setResult({
      tdee,
      targets: calculateCalorieTargets(tdee.tdee),
    });
  };

  return (
    <ToolFormCard
      title={isLoss ? "Estimate a realistic fat-loss calorie target." : "Estimate a practical weight-gain calorie target."}
      description={
        isLoss
          ? "Use your maintenance estimate to compare mild, moderate, and aggressive deficit options."
          : "Use your maintenance estimate to compare smaller and larger calorie surplus options."
      }
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <EnergyProfileFields
          sex={sex}
          setSex={setSex}
          age={age}
          setAge={setAge}
          weight={weight}
          setWeight={setWeight}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          height={height}
          setHeight={setHeight}
          heightUnit={heightUnit}
          setHeightUnit={setHeightUnit}
          activity={activity}
          setActivity={setActivity}
        />

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title={isLoss ? "Weight-loss calorie targets" : "Weight-gain calorie targets"}>
          <ResultGrid>
            <ResultMetric label="Estimated maintenance" value={`${result.targets.maintenance} cal`} />
            <ResultMetric label="Estimated BMR" value={`${result.tdee.bmr} cal`} />
            <ResultMetric label="Activity factor" value={result.tdee.activityFactor.toFixed(3)} />
          </ResultGrid>

          {isLoss ? (
            <div className="tool-subgrid">
              <div className="tool-subcard">
                <h4>Mild deficit</h4>
                <p>{result.targets.mildCut} cal</p>
                <p className="tool-warning">Rough weekly pace: {formatWeeklyDelta(result.targets.maintenance - result.targets.mildCut)} lb</p>
              </div>
              <div className="tool-subcard">
                <h4>Moderate deficit</h4>
                <p>{result.targets.moderateCut} cal</p>
                <p className="tool-warning">Rough weekly pace: {formatWeeklyDelta(result.targets.maintenance - result.targets.moderateCut)} lb</p>
              </div>
              <div className="tool-subcard">
                <h4>Aggressive deficit</h4>
                <p>{result.targets.aggressiveCut} cal</p>
                <p className="tool-warning">Rough weekly pace: {formatWeeklyDelta(result.targets.maintenance - result.targets.aggressiveCut)} lb</p>
              </div>
            </div>
          ) : (
            <div className="tool-subgrid">
              <div className="tool-subcard">
                <h4>Lean gain</h4>
                <p>{result.targets.leanGain} cal</p>
                <p className="tool-warning">Rough weekly pace: {formatWeeklyDelta(result.targets.leanGain - result.targets.maintenance)} lb</p>
              </div>
              <div className="tool-subcard">
                <h4>Higher surplus</h4>
                <p>{result.targets.surplus} cal</p>
                <p className="tool-warning">Rough weekly pace: {formatWeeklyDelta(result.targets.surplus - result.targets.maintenance)} lb</p>
              </div>
            </div>
          )}
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function BmiCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [weight, setWeight] = useState("180");
  const [weightUnit, setWeightUnit] = useState<MeasurementUnit>("lb");
  const [height, setHeight] = useState("70");
  const [heightUnit, setHeightUnit] = useState<LengthUnit>("in");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateBmi> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(weight);
    const parsedHeight = parseNumber(height);

    if (!isPositive(parsedWeight) || !isPositive(parsedHeight)) {
      setError("Enter a valid height and weight before calculating BMI.");
      return;
    }

    setError(null);
    setResult(
      calculateBmi({
        weight: parsedWeight,
        height: parsedHeight,
        weightUnit,
        heightUnit,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Calculate body mass index."
      description="BMI gives you a quick height-to-weight screening metric. It is broad, but it can still be a useful starting checkpoint."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
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
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated BMI">
          <ResultGrid>
            <ResultMetric label="BMI" value={`${result.bmi}`} />
            <ResultMetric label="Category" value={result.category} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function LeanBodyMassCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [weight, setWeight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [bodyFat, setBodyFat] = useState("18");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateLeanBodyMass> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeight = parseNumber(weight);
    const parsedBodyFat = parseNumber(bodyFat);

    if (!isPositive(parsedWeight) || parsedBodyFat <= 0 || parsedBodyFat >= 100) {
      setError("Enter a valid bodyweight and a body fat percentage between 1 and 99.");
      return;
    }

    setError(null);
    setResult(
      calculateLeanBodyMass({
        weight: parsedWeight,
        bodyFatPercentage: parsedBodyFat,
        unit,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate lean body mass."
      description="Lean body mass is your bodyweight after estimated fat mass is removed, which can help frame protein, performance, and size goals."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Bodyweight">
            <TextInput type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </SelectInput>
          </Field>
          <Field label="Body fat percentage">
            <TextInput type="number" min="1" max="99" step="0.1" value={bodyFat} onChange={(event) => setBodyFat(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated body composition">
          <ResultGrid>
            <ResultMetric label="Lean body mass" value={`${result.leanBodyMassLb} lb`} />
            <ResultMetric label="Lean body mass" value={`${result.leanBodyMassKg} kg`} />
            <ResultMetric label="Fat mass" value={`${result.fatMassLb} lb`} />
            <ResultMetric label="Fat mass" value={`${result.fatMassKg} kg`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function WaterIntakeCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [activityMinutes, setActivityMinutes] = useState("45");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateWaterIntake> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedActivityMinutes = parseNumber(activityMinutes);

    if (!isPositive(parsedBodyweight) || parsedActivityMinutes < 0) {
      setError("Enter a valid bodyweight and activity duration before calculating hydration.");
      return;
    }

    setError(null);
    setResult(
      calculateWaterIntake({
        bodyweight: parsedBodyweight,
        unit,
        activityMinutes: parsedActivityMinutes,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate daily water intake."
      description="This gives you a simple hydration target based on bodyweight, with extra fluid added for training time."
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
          <Field label="Training minutes">
            <TextInput type="number" min="0" step="1" value={activityMinutes} onChange={(event) => setActivityMinutes(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated hydration targets">
          <ResultGrid>
            <ResultMetric label="Baseline target" value={`${result.baselineLiters} L`} />
            <ResultMetric label="Daily target" value={`${result.targetLiters} L`} />
            <ResultMetric label="Higher target" value={`${result.higherTargetLiters} L`} />
            <ResultMetric label="Daily cups" value={`${result.cups} cups`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function CalorieDifferenceCalculator({
  toolSlug,
  mode,
}: {
  toolSlug: ToolSlug;
  mode: "deficit" | "surplus";
}) {
  const [maintenanceCalories, setMaintenanceCalories] = useState("2600");
  const [intakeCalories, setIntakeCalories] = useState(mode === "deficit" ? "2100" : "2900");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateCalorieDifference> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedMaintenance = parseNumber(maintenanceCalories);
    const parsedIntake = parseNumber(intakeCalories);

    if (!isPositive(parsedMaintenance) || !isPositive(parsedIntake)) {
      setError("Enter valid maintenance and intake calories before calculating.");
      return;
    }

    const difference = calculateCalorieDifference({
      maintenanceCalories: parsedMaintenance,
      intakeCalories: parsedIntake,
    });

    if (mode === "deficit" && difference.status !== "deficit") {
      setError("For a deficit, intake calories need to be lower than maintenance calories.");
      return;
    }

    if (mode === "surplus" && difference.status !== "surplus") {
      setError("For a surplus, intake calories need to be higher than maintenance calories.");
      return;
    }

    setError(null);
    setResult(difference);
  };

  return (
    <ToolFormCard
      title={mode === "deficit" ? "Measure your current calorie deficit." : "Measure your current calorie surplus."}
      description={
        mode === "deficit"
          ? "Compare your estimated maintenance calories to your current intake to see how large your deficit really is."
          : "Compare your estimated maintenance calories to your current intake to see how large your surplus really is."
      }
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Maintenance calories">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={maintenanceCalories}
              onChange={(event) => setMaintenanceCalories(event.target.value)}
            />
          </Field>
          <Field label="Current intake calories">
            <TextInput type="number" min="1" step="1" value={intakeCalories} onChange={(event) => setIntakeCalories(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title={mode === "deficit" ? "Estimated calorie deficit" : "Estimated calorie surplus"}>
          <ResultGrid>
            <ResultMetric label="Daily difference" value={`${Math.abs(result.difference)} cal`} />
            <ResultMetric label="Weekly equivalent" value={`${Math.abs(result.weeklyEquivalent)} cal`} />
            <ResultMetric label="Status" value={result.status} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function IdealBodyWeightCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [sex, setSex] = useState<Sex>("male");
  const [height, setHeight] = useState("70");
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateIdealBodyWeight> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedHeight = parseNumber(height);

    if (!isPositive(parsedHeight)) {
      setError("Enter a valid height before calculating ideal body weight.");
      return;
    }

    setError(null);
    setResult(
      calculateIdealBodyWeight({
        sex,
        height: parsedHeight,
        unit,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate a reference bodyweight from height."
      description="This uses a simple height-based formula. It is best treated as a reference point, not a perfect goal."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Sex">
            <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectInput>
          </Field>
          <Field label="Height">
            <TextInput type="number" min="1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Field>
          <Field label="Height unit">
            <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as LengthUnit)}>
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated ideal body weight">
          <ResultGrid>
            <ResultMetric label="Ideal body weight" value={`${result.idealWeightLb} lb`} />
            <ResultMetric label="Ideal body weight" value={`${result.idealWeightKg} kg`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function CardioCaloriesCalculator({
  toolSlug,
  mode,
}: {
  toolSlug: ToolSlug;
  mode: "walking" | "running";
}) {
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [duration, setDuration] = useState(mode === "walking" ? "45" : "30");
  const [speed, setSpeed] = useState(mode === "walking" ? "3.2" : "6");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateWalkingCalories> | ReturnType<typeof calculateRunningCalories> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBodyweight = parseNumber(bodyweight);
    const parsedDuration = parseNumber(duration);
    const parsedSpeed = parseNumber(speed);

    if (!isPositive(parsedBodyweight) || !isPositive(parsedDuration) || !isPositive(parsedSpeed)) {
      setError(`Enter a valid bodyweight, duration, and ${mode === "walking" ? "walking" : "running"} speed.`);
      return;
    }

    const bodyweightKg = unit === "lb" ? poundsToKilograms(parsedBodyweight) : parsedBodyweight;

    setError(null);
    setResult(
      mode === "walking"
        ? calculateWalkingCalories({
            bodyweightKg,
            durationMinutes: parsedDuration,
            speedMph: parsedSpeed,
          })
        : calculateRunningCalories({
            bodyweightKg,
            durationMinutes: parsedDuration,
            speedMph: parsedSpeed,
          }),
    );
  };

  return (
    <ToolFormCard
      title={mode === "walking" ? "Estimate calories burned while walking." : "Estimate calories burned while running."}
      description={
        mode === "walking"
          ? "Use your bodyweight, pace, and duration to estimate the calorie cost of a walking session."
          : "Use your bodyweight, pace, and duration to estimate the calorie cost of a run."
      }
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
          <Field label="Duration in minutes">
            <TextInput type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
          <Field label={mode === "walking" ? "Speed in mph" : "Pace in mph"}>
            <TextInput type="number" min="1" step="0.1" value={speed} onChange={(event) => setSpeed(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title={mode === "walking" ? "Estimated walking session" : "Estimated running session"}>
          <ResultGrid>
            <ResultMetric label="Calories burned" value={`${result.calories} cal`} />
            <ResultMetric label="Estimated distance" value={`${result.distanceMiles} mi`} />
            <ResultMetric label="Calories per mile" value={`${result.caloriesPerMile} cal`} />
            <ResultMetric label="MET value" value={`${result.met}`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function StepToCalorieCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [steps, setSteps] = useState("10000");
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [height, setHeight] = useState("70");
  const [heightUnit, setHeightUnit] = useState<LengthUnit>("in");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateStepsToCalories> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedSteps = parseNumber(steps);
    const parsedBodyweight = parseNumber(bodyweight);
    const parsedHeight = parseNumber(height);

    if (!isPositive(parsedSteps) || !isPositive(parsedBodyweight) || !isPositive(parsedHeight)) {
      setError("Enter valid steps, bodyweight, and height before calculating.");
      return;
    }

    setError(null);
    setResult(
      calculateStepsToCalories({
        steps: parsedSteps,
        bodyweight: parsedBodyweight,
        unit,
        height: parsedHeight,
        heightUnit,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate calories burned from steps."
      description="This turns your daily step count into a rough distance and calorie estimate using your height and bodyweight."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Step count">
            <TextInput type="number" min="1" step="1" value={steps} onChange={(event) => setSteps(event.target.value)} />
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
          <Field label="Height">
            <TextInput type="number" min="1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Field>
          <Field label="Height unit">
            <SelectInput value={heightUnit} onChange={(event) => setHeightUnit(event.target.value as LengthUnit)}>
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </SelectInput>
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated step activity">
          <ResultGrid>
            <ResultMetric label="Distance" value={`${result.distanceMiles} mi`} />
            <ResultMetric label="Distance" value={`${result.distanceKm} km`} />
            <ResultMetric label="Calories burned" value={`${result.calories} cal`} />
            <ResultMetric label="Estimated stride" value={`${result.strideLengthInches} in`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function TargetHeartRateCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [age, setAge] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateTargetHeartRate> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAge = parseNumber(age);

    if (!isPositive(parsedAge) || parsedAge > 100) {
      setError("Enter a realistic age before calculating heart-rate zones.");
      return;
    }

    setError(null);
    setResult(calculateTargetHeartRate(parsedAge));
  };

  return (
    <ToolFormCard
      title="Estimate target heart-rate zones."
      description="This calculator uses a simple age-based max heart-rate formula and then maps common training zones from that estimate."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Age">
            <TextInput type="number" min="18" max="100" value={age} onChange={(event) => setAge(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Estimated heart-rate zones">
          <ResultGrid>
            <ResultMetric label="Estimated max heart rate" value={`${result.maxHeartRate} bpm`} />
          </ResultGrid>
          <div className="tool-subgrid">
            {result.zones.map((zone) => (
              <div key={zone.name} className="tool-subcard">
                <h4>{zone.name}</h4>
                <p>
                  {zone.lowerBpm} to {zone.upperBpm} bpm
                </p>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function PaceCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [mode, setMode] = useState<PaceMode>("pace");
  const [distanceUnit, setDistanceUnit] = useState<PaceUnit>("mi");
  const [distance, setDistance] = useState("3");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("24");
  const [seconds, setSeconds] = useState("0");
  const [paceMinutes, setPaceMinutes] = useState("8");
  const [paceSeconds, setPaceSeconds] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculatePace> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDistance = parseNumber(distance);
    const parsedHours = parseNumber(hours);
    const parsedMinutes = parseNumber(minutes);
    const parsedSeconds = parseNumber(seconds);
    const parsedPaceMinutes = parseNumber(paceMinutes);
    const parsedPaceSeconds = parseNumber(paceSeconds);
    const totalTimeSeconds = parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds;
    const totalPaceSeconds = parsedPaceMinutes * 60 + parsedPaceSeconds;

    if (mode !== "distance" && !isPositive(parsedDistance)) {
      setError("Enter a valid distance before calculating pace or finish time.");
      return;
    }

    if ((mode === "time" || mode === "distance") && totalPaceSeconds <= 0) {
      setError("Enter a valid pace before calculating.");
      return;
    }

    if (parsedPaceMinutes < 0 || parsedPaceSeconds < 0) {
      setError("Enter a valid pace before calculating.");
      return;
    }

    if ((mode === "pace" || mode === "distance") && totalTimeSeconds <= 0) {
      setError("Enter a valid time before calculating.");
      return;
    }

    setError(null);
    setResult(
      calculatePace({
        mode,
        distance: parsedDistance,
        distanceUnit,
        hours: parsedHours,
        minutes: parsedMinutes,
        seconds: parsedSeconds,
        paceMinutes: parsedPaceMinutes,
        paceSeconds: parsedPaceSeconds,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Calculate pace, time, or distance."
      description="Choose the value you want to solve for, then enter the other two. This works for both miles and kilometers."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Calculate">
            <SelectInput value={mode} onChange={(event) => setMode(event.target.value as PaceMode)}>
              <option value="pace">Pace</option>
              <option value="time">Time</option>
              <option value="distance">Distance</option>
            </SelectInput>
          </Field>
          <Field label="Distance unit">
            <SelectInput value={distanceUnit} onChange={(event) => setDistanceUnit(event.target.value as PaceUnit)}>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </SelectInput>
          </Field>
          {mode !== "distance" ? (
            <Field label={`Distance in ${distanceUnit}`}>
              <TextInput type="number" min="0.1" step="0.01" value={distance} onChange={(event) => setDistance(event.target.value)} />
            </Field>
          ) : null}
          {mode !== "time" ? (
            <>
              <Field label="Hours">
                <TextInput type="number" min="0" step="1" value={hours} onChange={(event) => setHours(event.target.value)} />
              </Field>
              <Field label="Minutes">
                <TextInput type="number" min="0" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
              </Field>
              <Field label="Seconds">
                <TextInput type="number" min="0" step="1" value={seconds} onChange={(event) => setSeconds(event.target.value)} />
              </Field>
            </>
          ) : null}
          {mode !== "pace" ? (
            <>
              <Field label={`Pace minutes per ${distanceUnit}`}>
                <TextInput type="number" min="0" step="1" value={paceMinutes} onChange={(event) => setPaceMinutes(event.target.value)} />
              </Field>
              <Field label={`Pace seconds per ${distanceUnit}`}>
                <TextInput type="number" min="0" step="1" value={paceSeconds} onChange={(event) => setPaceSeconds(event.target.value)} />
              </Field>
            </>
          ) : null}
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Pace calculation">
          <ResultGrid>
            {result.mode === "pace" ? (
              <>
                <ResultMetric label={`Pace per ${result.distanceUnit}`} value={result.pacePerSelectedUnit} />
                <ResultMetric label="Pace per mile" value={result.pacePerMile} />
                <ResultMetric label="Pace per kilometer" value={result.pacePerKilometer} />
                <ResultMetric label="Total time" value={result.totalTime.label} />
              </>
            ) : null}
            {result.mode === "time" ? (
              <>
                <ResultMetric label="Estimated finish time" value={result.totalTime.label} />
                <ResultMetric label={`Pace per ${result.distanceUnit}`} value={result.pacePerSelectedUnit} />
              </>
            ) : null}
            {result.mode === "distance" ? (
              <>
                <ResultMetric label={`Distance in ${result.distanceUnit}`} value={`${result.distance}`} />
                <ResultMetric label="Distance in miles" value={`${result.distanceMiles} mi`} />
                <ResultMetric label="Distance in kilometers" value={`${result.distanceKilometers} km`} />
                <ResultMetric label="Total time" value={result.totalTime.label} />
              </>
            ) : null}
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function ReverseDietCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [currentCalories, setCurrentCalories] = useState("1900");
  const [targetCalories, setTargetCalories] = useState("2500");
  const [weeklyIncrease, setWeeklyIncrease] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateReverseDiet> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCurrent = parseNumber(currentCalories);
    const parsedTarget = parseNumber(targetCalories);
    const parsedIncrease = parseNumber(weeklyIncrease);

    if (!isPositive(parsedCurrent) || !isPositive(parsedTarget) || !isPositive(parsedIncrease)) {
      setError("Enter valid calorie values before calculating your reverse-diet timeline.");
      return;
    }

    if (parsedTarget <= parsedCurrent) {
      setError("Target calories should be higher than current calories for a reverse diet.");
      return;
    }

    setError(null);
    setResult(
      calculateReverseDiet({
        currentCalories: parsedCurrent,
        targetCalories: parsedTarget,
        weeklyIncrease: parsedIncrease,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Map out a simple reverse diet."
      description="Use your current intake, estimated maintenance, and planned weekly calorie bump to build a gradual increase schedule."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Current calories">
            <TextInput type="number" min="1" step="1" value={currentCalories} onChange={(event) => setCurrentCalories(event.target.value)} />
          </Field>
          <Field label="Target calories">
            <TextInput type="number" min="1" step="1" value={targetCalories} onChange={(event) => setTargetCalories(event.target.value)} />
          </Field>
          <Field label="Weekly increase">
            <TextInput type="number" min="1" step="1" value={weeklyIncrease} onChange={(event) => setWeeklyIncrease(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Reverse-diet schedule">
          <ResultGrid>
            <ResultMetric label="Total increase" value={`${result.totalIncrease} cal`} />
            <ResultMetric label="Estimated weeks" value={`${result.weeks}`} />
          </ResultGrid>
          <div className="tool-subgrid">
            {result.milestones.map((milestone) => (
              <div key={milestone.week} className="tool-subcard">
                <h4>Week {milestone.week}</h4>
                <p>{milestone.calories} cal</p>
              </div>
            ))}
          </div>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function BodyRecompositionCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [maintenanceCalories, setMaintenanceCalories] = useState("2500");
  const [bodyweight, setBodyweight] = useState("180");
  const [unit, setUnit] = useState<MeasurementUnit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateBodyRecomposition> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedMaintenance = parseNumber(maintenanceCalories);
    const parsedBodyweight = parseNumber(bodyweight);

    if (!isPositive(parsedMaintenance) || !isPositive(parsedBodyweight)) {
      setError("Enter valid maintenance calories and bodyweight before calculating.");
      return;
    }

    setError(null);
    setResult(
      calculateBodyRecomposition({
        maintenanceCalories: parsedMaintenance,
        bodyweightLb: unit === "kg" ? kilogramsToPounds(parsedBodyweight) : parsedBodyweight,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Estimate a simple recomposition starting point."
      description="This creates a small calorie deficit with a higher protein target to support slower fat loss while trying to preserve muscle."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Estimated maintenance calories">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={maintenanceCalories}
              onChange={(event) => setMaintenanceCalories(event.target.value)}
            />
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
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Suggested recomposition target">
          <ResultGrid>
            <ResultMetric label="Calories" value={`${result.targetCalories} cal`} />
            <ResultMetric label="Protein" value={`${result.proteinGrams} g`} />
            <ResultMetric label="Carbs" value={`${result.carbGrams} g`} />
            <ResultMetric label="Fat" value={`${result.fatGrams} g`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function ProteinPerMealCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [dailyProtein, setDailyProtein] = useState("180");
  const [meals, setMeals] = useState("4");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateProteinPerMeal> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDailyProtein = parseNumber(dailyProtein);
    const parsedMeals = parseNumber(meals);

    if (!isPositive(parsedDailyProtein) || !isPositive(parsedMeals)) {
      setError("Enter a valid daily protein target and meal count before calculating.");
      return;
    }

    setError(null);
    setResult(
      calculateProteinPerMeal({
        dailyProtein: parsedDailyProtein,
        meals: parsedMeals,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Split daily protein across meals."
      description="If you already know your daily protein target, this calculator helps you break it into a simpler per-meal range."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Daily protein target">
            <TextInput type="number" min="1" step="1" value={dailyProtein} onChange={(event) => setDailyProtein(event.target.value)} />
          </Field>
          <Field label="Meals per day">
            <TextInput type="number" min="1" step="1" value={meals} onChange={(event) => setMeals(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Protein per meal">
          <ResultGrid>
            <ResultMetric label="Per meal target" value={`${result.perMeal} g`} />
            <ResultMetric label="Lower range" value={`${result.minimumTarget} g`} />
            <ResultMetric label="Higher range" value={`${result.higherTarget} g`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

function MacroSplitCalculator({ toolSlug }: { toolSlug: ToolSlug }) {
  const [calories, setCalories] = useState("2400");
  const [proteinPercentage, setProteinPercentage] = useState("30");
  const [carbPercentage, setCarbPercentage] = useState("40");
  const [fatPercentage, setFatPercentage] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calculateMacroSplit> | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCalories = parseNumber(calories);
    const parsedProteinPercentage = parseNumber(proteinPercentage);
    const parsedCarbPercentage = parseNumber(carbPercentage);
    const parsedFatPercentage = parseNumber(fatPercentage);

    if (!isPositive(parsedCalories)) {
      setError("Enter a valid calorie target before calculating your macro split.");
      return;
    }

    if (Math.abs(parsedProteinPercentage + parsedCarbPercentage + parsedFatPercentage - 100) > 0.1) {
      setError("Protein, carbs, and fat percentages need to add up to 100.");
      return;
    }

    setError(null);
    setResult(
      calculateMacroSplit({
        calories: parsedCalories,
        proteinPercentage: parsedProteinPercentage,
        carbPercentage: parsedCarbPercentage,
        fatPercentage: parsedFatPercentage,
      }),
    );
  };

  return (
    <ToolFormCard
      title="Turn macro percentages into grams."
      description="If you already know the calorie target and split you want to use, this converts the percentages into daily grams."
    >
      <form className="tool-form" onSubmit={handleSubmit}>
        <div className="tool-form-grid">
          <Field label="Calories">
            <TextInput type="number" min="1" step="1" value={calories} onChange={(event) => setCalories(event.target.value)} />
          </Field>
          <Field label="Protein percentage">
            <TextInput type="number" min="0" max="100" step="1" value={proteinPercentage} onChange={(event) => setProteinPercentage(event.target.value)} />
          </Field>
          <Field label="Carb percentage">
            <TextInput type="number" min="0" max="100" step="1" value={carbPercentage} onChange={(event) => setCarbPercentage(event.target.value)} />
          </Field>
          <Field label="Fat percentage">
            <TextInput type="number" min="0" max="100" step="1" value={fatPercentage} onChange={(event) => setFatPercentage(event.target.value)} />
          </Field>
        </div>

        <FormActions toolSlug={toolSlug}>
          <FormError message={error} />
        </FormActions>
      </form>

      {result ? (
        <ResultCard title="Macro split in grams">
          <ResultGrid>
            <ResultMetric label="Protein" value={`${result.proteinGrams} g`} />
            <ResultMetric label="Carbs" value={`${result.carbGrams} g`} />
            <ResultMetric label="Fat" value={`${result.fatGrams} g`} />
            <ResultMetric label="Protein calories" value={`${result.proteinCalories} cal`} />
            <ResultMetric label="Carb calories" value={`${result.carbCalories} cal`} />
            <ResultMetric label="Fat calories" value={`${result.fatCalories} cal`} />
          </ResultGrid>
        </ResultCard>
      ) : null}
    </ToolFormCard>
  );
}

export {
  BmiCalculator,
  BmrCalculator,
  BodyRecompositionCalculator,
  CalorieDifferenceCalculator,
  IdealBodyWeightCalculator,
  LeanBodyMassCalculator,
  MacroSplitCalculator,
  PaceCalculator,
  ProteinPerMealCalculator,
  ReverseDietCalculator,
  StepToCalorieCalculator,
  TargetHeartRateCalculator,
  TdeeCalculator,
  WaterIntakeCalculator,
  WeightChangeCalculator,
  CardioCaloriesCalculator,
};
