export const TOOL_GROUPS = {
  nutrition: {
    slug: "nutrition-weight-loss",
    title: "Nutrition & Weight Loss",
    description:
      "Calories, macros, body composition, hydration, cardio, and planning tools for everyday users and athletes.",
  },
  strength: {
    slug: "strength-training",
    title: "Strength Training",
    description:
      "Rep max, meet planning, strength scoring, volume, pacing, and training structure tools.",
  },
  prep: {
    slug: "bodybuilding-contest-prep",
    title: "Bodybuilding & Contest Prep",
    description:
      "Prep countdowns, competition timelines, and show-day planning tools for physique athletes and coaches.",
  },
} as const;

export type ToolGroupKey = keyof typeof TOOL_GROUPS;

export type ToolFaq = {
  question: string;
  answer: string;
};

export type ToolDefinition = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  group: ToolGroupKey;
  relatedSlugs: readonly string[];
  explanationHeading: string;
  explanation: readonly string[];
  faqs: readonly ToolFaq[];
};

type CopySeed = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  group: ToolGroupKey;
  relatedSlugs: readonly string[];
  whyItMatters: string;
  bestFor: string;
  howToUse: string;
  whatToDoNext: string;
  accuracyNote: string;
  resultName: string;
  questionLead?: string;
};

function buildCopy(seed: CopySeed): ToolDefinition {
  const topic = seed.questionLead ?? seed.title.toLowerCase();

  return {
    slug: seed.slug,
    title: seed.title,
    metaDescription: seed.metaDescription,
    intro: seed.intro,
    group: seed.group,
    relatedSlugs: seed.relatedSlugs,
    explanationHeading: `How to use the ${seed.title.toLowerCase()}`,
    explanation: [
      `${seed.title} is built to help you ${seed.whyItMatters}. It works best for ${seed.bestFor}. Instead of guessing, you can use the result as a cleaner starting point and then adjust based on what happens in real life over the next few days or weeks.`,
      `To use this calculator well, ${seed.howToUse}. Once you have the ${seed.resultName}, compare it to your current routine, training demands, and recovery. The best number on paper is still the number you can follow consistently enough to learn from.`,
      `${seed.accuracyNote}. That does not make the tool useless. It just means the output should guide your next decision instead of replacing judgment. ${seed.whatToDoNext}`,
    ],
    faqs: [
      {
        question: `What does the ${topic} tell me?`,
        answer: `It gives you a practical estimate that can help you make a better starting decision. You can use it to reduce guessing, then refine the plan after you track your response over time.`,
      },
      {
        question: `How accurate is the ${topic}?`,
        answer: `${seed.accuracyNote} The result is most useful when you treat it as an estimate, track the outcome, and adjust based on real-world feedback.`,
      },
      {
        question: `What should I do after I get my result?`,
        answer: `${seed.whatToDoNext} When progress is not matching the estimate, make one small adjustment at a time so you can see what actually changed.`,
      },
      {
        question: `Who is this calculator best for?`,
        answer: `This calculator is best for ${seed.bestFor}. It is written for regular users first, but it can still be useful for athletes who want a simple starting point before getting more detailed.`,
      },
      {
        question: `When should I recalculate?`,
        answer: `Recalculate when one of the main inputs changes in a meaningful way, like bodyweight, training volume, pace, calories, or your goal. You can also rerun it when your progress stalls and you want a fresh checkpoint.`,
      },
    ],
  };
}

export function getCalculatorPath(slug: string) {
  return `/calculators/${slug}`;
}

export function getLegacyToolPath(slug: string) {
  return `/tools/${slug}`;
}

export const tools = [
  buildCopy({
    slug: "calorie-calculator",
    title: "Calorie Calculator",
    metaDescription:
      "Estimate maintenance calories and view practical cutting or gaining targets with the Elevare calorie calculator.",
    intro:
      "Use this calorie calculator to estimate maintenance calories first, then view practical targets for fat loss or leaner weight gain.",
    group: "nutrition",
    relatedSlugs: ["tdee-calculator", "macro-calculator", "protein-calculator", "weight-loss-calorie-calculator"],
    whyItMatters: "estimate maintenance calories and see realistic calorie targets for cutting or gaining",
    bestFor: "people who want one simple place to start before building a nutrition plan",
    howToUse: "enter your body size, age, and activity level as honestly as possible",
    whatToDoNext: "Track your intake, watch your bodyweight trend, and adjust only after you have enough consistent data to justify a change.",
    accuracyNote:
      "calorie needs can shift based on training, adherence, stress, sleep, and how active you really are outside the gym",
    resultName: "maintenance estimate and calorie targets",
  }),
  buildCopy({
    slug: "maintenance-calorie-calculator",
    title: "Maintenance Calorie Calculator",
    metaDescription:
      "Estimate your daily maintenance calories using the Mifflin-St Jeor formula and activity level.",
    intro:
      "Use this maintenance calorie calculator to estimate how many calories you may need to hold your current weight before making any cut or bulk adjustments.",
    group: "nutrition",
    relatedSlugs: ["tdee-calculator", "calorie-calculator", "calorie-deficit-calculator", "weight-gain-calculator"],
    whyItMatters: "find a reasonable maintenance calorie estimate before you decide to cut, gain, or recomposition",
    bestFor: "people who want a starting point for eating around maintenance instead of overcorrecting too early",
    howToUse: "use your current body size and choose the activity level that reflects your average week, not your best week",
    whatToDoNext: "If your weight is staying flat over time, you are probably close to maintenance. If it is drifting up or down, adjust intake in small steps.",
    accuracyNote:
      "maintenance calories are always an estimate because daily movement, workout volume, and food tracking accuracy can change",
    resultName: "maintenance calorie estimate",
  }),
  buildCopy({
    slug: "tdee-calculator",
    title: "TDEE Calculator",
    metaDescription:
      "Estimate total daily energy expenditure with a TDEE calculator based on body size, age, sex, and activity level.",
    intro:
      "Use this TDEE calculator to estimate how many calories you may burn in a full day when your BMR and activity level are combined.",
    group: "nutrition",
    relatedSlugs: ["maintenance-calorie-calculator", "bmr-calculator", "calorie-deficit-calculator", "weight-loss-calorie-calculator"],
    whyItMatters: "estimate your total daily energy expenditure instead of relying on rough calorie guesses",
    bestFor: "users who want a clearer baseline before setting weight-loss, maintenance, or weight-gain calories",
    howToUse: "enter your size, age, and activity level based on what a normal week looks like",
    whatToDoNext: "Use the TDEE result as your maintenance starting point, then create a small deficit or surplus depending on your goal.",
    accuracyNote:
      "TDEE changes with movement, recovery, training volume, and how active you are outside formal workouts",
    resultName: "TDEE estimate",
  }),
  buildCopy({
    slug: "bmr-calculator",
    title: "BMR Calculator",
    metaDescription:
      "Estimate basal metabolic rate with the Mifflin-St Jeor formula using age, sex, height, and weight.",
    intro:
      "Use this BMR calculator to estimate the calories your body may burn at rest before exercise and daily activity are added in.",
    group: "nutrition",
    relatedSlugs: ["tdee-calculator", "maintenance-calorie-calculator", "calorie-calculator"],
    whyItMatters: "understand the resting calorie side of the equation before adding daily movement and training",
    bestFor: "people who want to learn where maintenance calories start instead of only looking at final calorie targets",
    howToUse: "enter your height, weight, age, and sex, then use the BMR result as the base for broader calorie planning",
    whatToDoNext: "Do not diet from BMR directly. Use it with activity level to estimate maintenance or TDEE first.",
    accuracyNote:
      "BMR formulas estimate resting needs from population averages and do not directly measure your body composition or thyroid output",
    resultName: "BMR estimate",
  }),
  buildCopy({
    slug: "weight-loss-calorie-calculator",
    title: "Weight Loss Calorie Calculator",
    metaDescription:
      "Estimate realistic calorie targets for weight loss based on maintenance calories and common deficit ranges.",
    intro:
      "Use this weight loss calorie calculator to estimate a practical deficit instead of dropping calories too aggressively on day one.",
    group: "nutrition",
    relatedSlugs: ["calorie-calculator", "tdee-calculator", "calorie-deficit-calculator", "goal-weight-timeline-calculator"],
    whyItMatters: "choose a realistic fat-loss calorie target that is easier to follow and evaluate",
    bestFor: "people who want to lose weight without crashing calories harder than they need to",
    howToUse: "start with a maintenance estimate, then compare mild, moderate, and more aggressive deficit options",
    whatToDoNext: "Pick the lowest level of restriction that still moves progress, then give it enough time before you decide it is not working.",
    accuracyNote:
      "weight loss is influenced by adherence, water retention, step count, restaurant meals, and how accurately food is being tracked",
    resultName: "weight-loss calorie target",
  }),
  buildCopy({
    slug: "weight-gain-calculator",
    title: "Weight Gain Calculator",
    metaDescription:
      "Estimate weight-gain calories from maintenance and view practical surplus targets for leaner progress.",
    intro:
      "Use this weight gain calculator to estimate a calorie surplus that supports progress without pushing bodyweight faster than necessary.",
    group: "nutrition",
    relatedSlugs: ["calorie-calculator", "maintenance-calorie-calculator", "calorie-surplus-calculator", "macro-calculator"],
    whyItMatters: "set a calorie surplus that supports progress while keeping unnecessary fat gain more controlled",
    bestFor: "lifters and athletes who want a cleaner starting point for gaining size or pushing bodyweight up slowly",
    howToUse: "start from maintenance, then review modest and more aggressive surplus options",
    whatToDoNext: "Use the smallest surplus that still moves scale weight and gym performance in the right direction.",
    accuracyNote:
      "weight gain rate can change with appetite, training quality, stress, and how often intake drifts above the plan",
    resultName: "weight-gain calorie target",
  }),
  buildCopy({
    slug: "calorie-deficit-calculator",
    title: "Calorie Deficit Calculator",
    metaDescription:
      "Calculate your daily calorie deficit by comparing maintenance calories against your current intake.",
    intro:
      "Use this calorie deficit calculator to see how large your current deficit is instead of assuming you are eating low enough.",
    group: "nutrition",
    relatedSlugs: ["weight-loss-calorie-calculator", "calorie-calculator", "goal-weight-timeline-calculator", "reverse-diet-calculator"],
    whyItMatters: "see the actual gap between maintenance calories and intake calories",
    bestFor: "users who already know their maintenance and want to understand whether their cut is mild, moderate, or aggressive",
    howToUse: "enter estimated maintenance calories and your actual planned intake",
    whatToDoNext: "If the deficit is larger than expected and recovery is struggling, consider bringing calories up before pushing harder.",
    accuracyNote:
      "the deficit only works as well as the maintenance estimate and the food intake data you enter",
    resultName: "daily calorie deficit",
  }),
  buildCopy({
    slug: "calorie-surplus-calculator",
    title: "Calorie Surplus Calculator",
    metaDescription:
      "Calculate your daily calorie surplus by comparing intake calories against estimated maintenance.",
    intro:
      "Use this calorie surplus calculator to see whether your current intake is high enough to support gaining weight or performance.",
    group: "nutrition",
    relatedSlugs: ["weight-gain-calculator", "maintenance-calorie-calculator", "macro-calculator", "reverse-diet-calculator"],
    whyItMatters: "understand how far above maintenance your current intake really is",
    bestFor: "users who want to gain weight, improve training output, or slowly raise calories after a diet phase",
    howToUse: "enter your estimated maintenance calories and your current planned intake",
    whatToDoNext: "If your surplus is larger than expected, you may be able to reduce it and still make progress with better control.",
    accuracyNote:
      "surplus calculations are only estimates because maintenance can drift upward or downward with bodyweight and activity changes",
    resultName: "daily calorie surplus",
  }),
  buildCopy({
    slug: "calorie-burn-calculator",
    title: "Calorie Burn Calculator",
    metaDescription:
      "Estimate calories burned from walking, running, lifting, cycling, swimming, and other common activities.",
    intro:
      "Use this calorie burn calculator to estimate session energy expenditure based on your bodyweight, activity, and duration.",
    group: "nutrition",
    relatedSlugs: ["walking-calorie-calculator", "running-calorie-calculator", "step-to-calorie-calculator", "calorie-calculator"],
    whyItMatters: "estimate session energy expenditure from common activities instead of assuming every workout burns the same amount",
    bestFor: "people who want a rough exercise burn estimate for planning, comparison, or educational use",
    howToUse: "pick the activity that best matches your session and enter bodyweight plus duration",
    whatToDoNext: "Use the output as a rough reference, not permission to overeat back every calorie burned.",
    accuracyNote:
      "wearables and activity formulas often over- or under-estimate energy expenditure because intensity and movement efficiency vary",
    resultName: "calorie-burn estimate",
  }),
  buildCopy({
    slug: "walking-calorie-calculator",
    title: "Walking Calorie Calculator",
    metaDescription:
      "Estimate calories burned walking based on bodyweight, pace, and duration using a MET-based formula.",
    intro:
      "Use this walking calorie calculator to estimate calories burned from walks based on how long you walked and how fast you moved.",
    group: "nutrition",
    relatedSlugs: ["calorie-burn-calculator", "step-to-calorie-calculator", "target-heart-rate-calculator", "pace-calculator"],
    whyItMatters: "turn simple walking sessions into a more useful calorie and distance estimate",
    bestFor: "people using walking for general activity, fat loss support, or step-based cardio",
    howToUse: "enter your bodyweight, walking speed, and total duration",
    whatToDoNext: "Compare the result to your weekly routine so you can decide whether more walking time or a faster pace would be more helpful.",
    accuracyNote:
      "walking calorie estimates still vary with incline, terrain, stride efficiency, and how evenly you maintained pace",
    resultName: "walking calorie estimate",
  }),
  buildCopy({
    slug: "running-calorie-calculator",
    title: "Running Calorie Calculator",
    metaDescription:
      "Estimate calories burned running based on bodyweight, speed, and duration using a MET-based formula.",
    intro:
      "Use this running calorie calculator to estimate calories burned from a run using your bodyweight, speed, and total time.",
    group: "nutrition",
    relatedSlugs: ["calorie-burn-calculator", "pace-calculator", "target-heart-rate-calculator", "step-to-calorie-calculator"],
    whyItMatters: "get a cleaner estimate of session demand when you are using running for fitness or fat loss support",
    bestFor: "runners, lifters adding cardio, and users who want a faster way to compare different run durations or speeds",
    howToUse: "enter bodyweight, running speed, and total duration",
    whatToDoNext: "Use the estimate to compare sessions, then make training and nutrition decisions from weekly patterns instead of one run.",
    accuracyNote:
      "terrain, treadmill calibration, running economy, and pace changes all affect real calorie burn",
    resultName: "running calorie estimate",
  }),
  buildCopy({
    slug: "step-to-calorie-calculator",
    title: "Step-to-Calorie Calculator",
    metaDescription:
      "Estimate calories burned from daily steps using bodyweight, step count, and stride-length assumptions.",
    intro:
      "Use this step-to-calorie calculator to estimate how much walking your daily step count may represent in both distance and calories.",
    group: "nutrition",
    relatedSlugs: ["walking-calorie-calculator", "calorie-burn-calculator", "goal-weight-timeline-calculator", "water-intake-calculator"],
    whyItMatters: "connect step count to a rough calorie and distance estimate instead of treating steps like an abstract number",
    bestFor: "users who track steps daily and want a clearer idea of how much low-intensity movement they are actually accumulating",
    howToUse: "enter bodyweight, total steps, and height so the calculator can estimate stride length and distance",
    whatToDoNext: "If steps are a major part of your plan, track averages across the full week instead of reading too much into one day.",
    accuracyNote:
      "step-based calorie estimates depend on stride length, pace, terrain, and how much of your day is spent walking versus standing",
    resultName: "step-based calorie estimate",
  }),
  buildCopy({
    slug: "bmi-calculator",
    title: "BMI Calculator",
    metaDescription:
      "Calculate body mass index with metric or imperial inputs and view the standard BMI category range.",
    intro:
      "Use this BMI calculator to estimate body mass index from height and weight with either metric or imperial units.",
    group: "nutrition",
    relatedSlugs: ["body-fat-calculator", "lean-body-mass-calculator", "ideal-body-weight-calculator", "goal-weight-timeline-calculator"],
    whyItMatters: "get a quick size-to-height screening metric that is easy to compare over time",
    bestFor: "regular users who want a simple general health checkpoint before moving to more detailed body composition tools",
    howToUse: "enter height and weight using the unit system you already track with",
    whatToDoNext: "Use BMI as a broad screen only, then pair it with body fat, waist measurements, performance, and how you actually look and feel.",
    accuracyNote:
      "BMI does not directly measure muscle mass, fat distribution, or athletic body composition",
    resultName: "BMI estimate",
  }),
  buildCopy({
    slug: "body-fat-calculator",
    title: "Body Fat Calculator",
    metaDescription:
      "Estimate body fat percentage using the U.S. Navy formula with support for inches or centimeters.",
    intro:
      "Use this body fat calculator to estimate body fat percentage from body measurements using the U.S. Navy method.",
    group: "nutrition",
    relatedSlugs: ["lean-body-mass-calculator", "bmi-calculator", "goal-weight-timeline-calculator", "contest-prep-countdown"],
    whyItMatters: "estimate body composition from measurements when scale weight alone is not telling the full story",
    bestFor: "people who want a practical body fat checkpoint without using a lab or scan",
    howToUse: "measure the required body parts consistently and use the same unit each time",
    whatToDoNext: "Track the trend over time rather than obsessing over a single reading, especially when the measurements are self-reported.",
    accuracyNote:
      "measurement error, tape placement, posture, and hydration can all shift the estimate",
    resultName: "body fat estimate",
  }),
  buildCopy({
    slug: "lean-body-mass-calculator",
    title: "Lean Body Mass Calculator",
    metaDescription:
      "Estimate lean body mass from bodyweight and body fat percentage with support for pounds or kilograms.",
    intro:
      "Use this lean body mass calculator to estimate how much of your bodyweight is lean tissue instead of body fat.",
    group: "nutrition",
    relatedSlugs: ["body-fat-calculator", "protein-calculator", "bmi-calculator", "ideal-body-weight-calculator"],
    whyItMatters: "see how much lean tissue you may be carrying instead of only focusing on total scale weight",
    bestFor: "users who track body composition and want a better way to think about protein, dieting, and muscle retention",
    howToUse: "enter current bodyweight and a realistic body fat percentage estimate",
    whatToDoNext: "Compare lean mass across checkpoints so you can see whether bodyweight changes are coming more from fat or from lean tissue.",
    accuracyNote:
      "lean body mass is only as accurate as the body fat percentage you start with",
    resultName: "lean body mass estimate",
  }),
  buildCopy({
    slug: "water-intake-calculator",
    title: "Water Intake Calculator",
    metaDescription:
      "Estimate daily water intake in ounces, liters, and cups based on bodyweight and activity time.",
    intro:
      "Use this water intake calculator to estimate a simple daily hydration target based on bodyweight and added activity.",
    group: "nutrition",
    relatedSlugs: ["target-heart-rate-calculator", "walking-calorie-calculator", "running-calorie-calculator", "body-recomposition-calculator"],
    whyItMatters: "set a basic hydration target that is more useful than randomly drinking more water",
    bestFor: "people who want a simple daily fluid target without overcomplicating hydration",
    howToUse: "enter bodyweight and add activity minutes if you want to account for training time",
    whatToDoNext: "Use the target as a starting point, then adjust upward when you train hard, sweat heavily, or spend more time in the heat.",
    accuracyNote:
      "hydration needs vary with climate, sweat rate, sodium intake, training intensity, and total food intake",
    resultName: "water intake target",
  }),
  buildCopy({
    slug: "protein-calculator",
    title: "Protein Calculator",
    metaDescription:
      "Estimate a practical daily protein target for general health, fat loss, muscle gain, or contest prep.",
    intro:
      "Use this protein calculator to estimate a realistic daily protein range based on your bodyweight and current goal.",
    group: "nutrition",
    relatedSlugs: ["protein-per-meal-calculator", "macro-calculator", "body-recomposition-calculator", "lean-body-mass-calculator"],
    whyItMatters: "set a protein target that is appropriate for your current goal instead of copying someone else's number",
    bestFor: "users who want a practical protein range for everyday eating, dieting, or gaining",
    howToUse: "enter bodyweight and choose the goal that best matches your current phase",
    whatToDoNext: "Pick a target you can hit most days, then spread it across meals in a way that makes your diet easier to follow.",
    accuracyNote:
      "protein needs change with training age, size, dieting phase, and how lean or heavy you currently are",
    resultName: "protein range",
  }),
  buildCopy({
    slug: "protein-per-meal-calculator",
    title: "Protein Per Meal Calculator",
    metaDescription:
      "Split your daily protein target across meals to estimate a practical protein goal for each meal.",
    intro:
      "Use this protein per meal calculator to divide a daily protein target into simpler meal-by-meal goals.",
    group: "nutrition",
    relatedSlugs: ["protein-calculator", "macro-calculator", "body-recomposition-calculator", "macro-split-calculator"],
    whyItMatters: "turn a large daily protein number into meal targets that are easier to execute",
    bestFor: "people who know their protein goal but want a simpler way to distribute it across the day",
    howToUse: "enter your daily protein target and how many meals or feedings you plan to eat",
    whatToDoNext: "Use the result as a rough meal target, then adjust each meal slightly based on hunger, schedule, and food preferences.",
    accuracyNote:
      "you do not need perfect gram matching at every meal for this to be useful",
    resultName: "per-meal protein target",
  }),
  buildCopy({
    slug: "macro-calculator",
    title: "Macro Calculator",
    metaDescription:
      "Build simple macro targets from calories, bodyweight, and goal with high, moderate, or low-carb options.",
    intro:
      "Use this macro calculator to turn a calorie target into practical protein, fat, and carb ranges you can actually use.",
    group: "nutrition",
    relatedSlugs: ["macro-split-calculator", "protein-calculator", "calorie-calculator", "weight-loss-calorie-calculator"],
    whyItMatters: "translate calorie targets into macro numbers you can apply to real meals",
    bestFor: "users who want a starting macro plan without building everything manually",
    howToUse: "enter calories, bodyweight, and goal so the calculator can anchor protein first and then build fat and carb options around it",
    whatToDoNext: "Choose the option that matches your preference and adherence best instead of assuming the highest or lowest carb plan is always better.",
    accuracyNote:
      "macro plans still need real-world adjustment because training performance, hunger, digestion, and recovery all matter",
    resultName: "macro plan",
  }),
  buildCopy({
    slug: "macro-split-calculator",
    title: "Macro Split Calculator",
    metaDescription:
      "Convert macro percentages into grams using calories and a custom protein, carb, and fat split.",
    intro:
      "Use this macro split calculator to convert protein, carb, and fat percentages into actual gram targets.",
    group: "nutrition",
    relatedSlugs: ["macro-calculator", "protein-per-meal-calculator", "body-recomposition-calculator", "calorie-calculator"],
    whyItMatters: "turn percentage-based macro planning into gram numbers you can track and eat",
    bestFor: "people who already know the calorie target and want to apply a custom macro split",
    howToUse: "enter calories and make sure your protein, carb, and fat percentages add up to 100",
    whatToDoNext: "After you see the gram targets, compare them to the foods you actually eat and make sure the split is realistic for you to follow.",
    accuracyNote:
      "macro percentages are preferences and planning tools, not universal rules that work the same for every body",
    resultName: "macro gram targets",
  }),
  buildCopy({
    slug: "body-recomposition-calculator",
    title: "Body Recomposition Calculator",
    metaDescription:
      "Estimate calories and macros for slow fat loss with muscle retention during a body recomposition phase.",
    intro:
      "Use this body recomposition calculator to estimate a slower, more balanced calorie and macro setup when you want to lose fat without pushing the diet too hard.",
    group: "nutrition",
    relatedSlugs: ["macro-calculator", "protein-calculator", "calorie-deficit-calculator", "reverse-diet-calculator"],
    whyItMatters: "set a slower calorie target that prioritizes muscle retention, training quality, and better adherence",
    bestFor: "people who want to lose fat gradually while keeping performance and recovery in a better place",
    howToUse: "enter estimated maintenance calories and bodyweight, then use the result as a slower-cutting setup",
    whatToDoNext: "Give the plan enough time to work before pushing calories lower, especially if strength and recovery are still solid.",
    accuracyNote:
      "recomposition is slower than aggressive dieting and depends heavily on training quality, protein intake, and consistency",
    resultName: "recomposition calories and macros",
  }),
  buildCopy({
    slug: "goal-weight-timeline-calculator",
    title: "Goal Weight Timeline Calculator",
    metaDescription:
      "Estimate how long it may take to reach a goal weight based on your weekly rate of loss or gain.",
    intro:
      "Use this goal weight timeline calculator to estimate how many weeks your plan may take and what target date that pace points to.",
    group: "nutrition",
    relatedSlugs: ["weight-loss-calorie-calculator", "weight-gain-calculator", "calorie-deficit-calculator", "body-fat-calculator"],
    whyItMatters: "connect weekly pace with a rough timeline so your goal feels more measurable and less abstract",
    bestFor: "people who want a realistic sense of how long a cut or gain phase may take",
    howToUse: "enter current weight, goal weight, and the weekly pace you expect to hold",
    whatToDoNext: "Use the result to set expectations, then remember that real progress usually comes with weeks that are faster, slower, or flat.",
    accuracyNote:
      "goal timelines rarely play out perfectly because water retention, life schedule, and adherence all change the rate week to week",
    resultName: "goal timeline",
  }),
  buildCopy({
    slug: "ideal-body-weight-calculator",
    title: "Ideal Body Weight Calculator",
    metaDescription:
      "Estimate ideal body weight using a standard height-based formula and view the result in pounds or kilograms.",
    intro:
      "Use this ideal body weight calculator to estimate a standard reference bodyweight based on height and sex.",
    group: "nutrition",
    relatedSlugs: ["bmi-calculator", "lean-body-mass-calculator", "goal-weight-timeline-calculator", "body-fat-calculator"],
    whyItMatters: "see a reference bodyweight estimate that can help frame broader health or goal-setting conversations",
    bestFor: "users who want a general height-based benchmark instead of treating one number as the perfect goal",
    howToUse: "enter height and sex, then use the output as a reference rather than a rule",
    whatToDoNext: "Compare the estimate with your actual frame, training background, and body composition before deciding whether it has any practical value for your goal.",
    accuracyNote:
      "ideal body weight formulas are broad reference tools and do not account for muscle mass, sport demands, or personal build",
    resultName: "ideal body weight estimate",
  }),
  buildCopy({
    slug: "reverse-diet-calculator",
    title: "Reverse Diet Calculator",
    metaDescription:
      "Estimate a simple reverse-diet timeline by increasing calories gradually from current intake toward maintenance.",
    intro:
      "Use this reverse diet calculator to map out gradual calorie increases when you want to move out of a diet phase with more control.",
    group: "nutrition",
    relatedSlugs: ["calorie-surplus-calculator", "maintenance-calorie-calculator", "body-recomposition-calculator", "weight-gain-calculator"],
    whyItMatters: "build a slower calorie increase plan instead of jumping straight from low intake to full maintenance or above",
    bestFor: "dieters, competitors, and anyone coming out of a long cut who wants a structured transition",
    howToUse: "enter current intake, estimated maintenance, and how many calories you plan to add each week",
    whatToDoNext: "Use the schedule as a guide, then pause or speed up changes based on weight trend, hunger, and recovery.",
    accuracyNote:
      "reverse diet progress depends on how accurate your maintenance estimate is and how consistent your actual intake stays",
    resultName: "reverse-diet schedule",
  }),
  buildCopy({
    slug: "pace-calculator",
    title: "Pace Calculator",
    metaDescription:
      "Calculate pace, time, or distance for running and walking using miles or kilometers.",
    intro:
      "Use this pace calculator to solve for pace, finish time, or distance when you know any two of the three.",
    group: "strength",
    relatedSlugs: ["running-calorie-calculator", "walking-calorie-calculator", "target-heart-rate-calculator", "step-to-calorie-calculator"],
    whyItMatters: "convert time and distance into a usable pace target instead of estimating by feel alone",
    bestFor: "walkers, runners, and athletes who want a cleaner pace reference for cardio sessions",
    howToUse: "choose the mode that matches the number you are trying to solve for, then enter the other required values",
    whatToDoNext: "Use the result to plan future sessions, compare workouts, or set a more realistic pace target for a longer effort.",
    accuracyNote:
      "pace math is exact, but the usefulness of the result still depends on whether the pace is realistic for your current fitness",
    resultName: "pace, time, or distance result",
  }),
  buildCopy({
    slug: "target-heart-rate-calculator",
    title: "Target Heart Rate Calculator",
    metaDescription:
      "Estimate heart-rate training zones from age using a standard age-based maximum heart rate formula.",
    intro:
      "Use this target heart rate calculator to estimate training zones from an age-based maximum heart rate formula.",
    group: "nutrition",
    relatedSlugs: ["walking-calorie-calculator", "running-calorie-calculator", "pace-calculator", "water-intake-calculator"],
    whyItMatters: "turn cardio intensity into clearer zones instead of only guessing from effort",
    bestFor: "people who want a simple heart-rate starting point for cardio, conditioning, or recovery work",
    howToUse: "enter age and use the zones as a starting reference during cardio sessions",
    whatToDoNext: "Pair the zones with pace, breathing, and perceived effort so you can decide whether a session is really as easy or hard as it should be.",
    accuracyNote:
      "age-based max heart rate formulas are broad estimates and can miss your true max by a meaningful margin",
    resultName: "heart-rate zones",
  }),
  buildCopy({
    slug: "one-rep-max-calculator",
    title: "1RM Calculator",
    metaDescription:
      "Estimate your one-rep max with the Epley formula and view common training percentages.",
    intro:
      "Use this 1RM calculator to estimate your one-rep max and quickly see working weights for common training percentages.",
    group: "strength",
    relatedSlugs: ["rep-max-calculator", "training-max-calculator", "relative-strength-calculator", "workout-volume-calculator"],
    whyItMatters: "estimate top-end strength from a set you have already completed safely",
    bestFor: "lifters who want practical training percentages without maxing out constantly",
    howToUse: "enter the weight you lifted and the reps you completed with that weight",
    whatToDoNext: "Use the estimate to guide training, then compare it to how the weights actually move in real sessions.",
    accuracyNote:
      "1RM formulas become less reliable as rep count climbs and as set quality or fatigue changes",
    resultName: "estimated one-rep max",
  }),
  buildCopy({
    slug: "rep-max-calculator",
    title: "Rep Max Calculator",
    metaDescription:
      "Estimate rep max strength with multiple common formulas and compare the average projected max.",
    intro:
      "Use this rep max calculator to compare several common max-estimation formulas instead of relying on only one method.",
    group: "strength",
    relatedSlugs: ["one-rep-max-calculator", "training-max-calculator", "powerlifting-meet-attempt-calculator", "relative-strength-calculator"],
    whyItMatters: "compare multiple strength estimates when you want a broader view of your likely max",
    bestFor: "lifters who want a more conservative and balanced estimate than a single formula alone",
    howToUse: "enter the weight and reps from a recent hard set and compare the projected maxes from each formula",
    whatToDoNext: "Use the average and range to guide training decisions rather than anchoring to the highest estimate.",
    accuracyNote:
      "different rep-max formulas can disagree, especially as reps climb or set quality becomes less controlled",
    resultName: "rep-max estimate range",
  }),
  buildCopy({
    slug: "training-max-calculator",
    title: "Training Max Calculator",
    metaDescription:
      "Estimate a training max from your projected 1RM and default to 90 percent for programming.",
    intro:
      "Use this training max calculator to build a more conservative working max from an estimated 1RM.",
    group: "strength",
    relatedSlugs: ["one-rep-max-calculator", "rep-max-calculator", "powerlifting-meet-attempt-calculator", "workout-volume-calculator"],
    whyItMatters: "set working weights from a more realistic base instead of programming off your absolute best day",
    bestFor: "lifters who want a more repeatable number for percentages, top sets, and progression",
    howToUse: "enter a recent working set and let the calculator estimate 1RM first, then apply the default 90 percent training max",
    whatToDoNext: "If the resulting percentages still feel too heavy or too easy, adjust the training max instead of forcing the plan to fit the wrong number.",
    accuracyNote:
      "a training max is a programming tool, not a direct measurement of your all-time best strength",
    resultName: "training max",
  }),
  buildCopy({
    slug: "relative-strength-calculator",
    title: "Relative Strength Calculator",
    metaDescription:
      "Compare your lift to bodyweight and estimate a relative strength ratio and training level.",
    intro:
      "Use this relative strength calculator to compare your lift against your bodyweight instead of only looking at the raw load.",
    group: "strength",
    relatedSlugs: ["strength-standards-calculator", "one-rep-max-calculator", "rep-max-calculator", "dots-calculator"],
    whyItMatters: "put your lift in context by comparing it to your own size",
    bestFor: "lifters who want a simple bodyweight-adjusted strength checkpoint",
    howToUse: "enter bodyweight, the lift you are evaluating, and the weight you lifted",
    whatToDoNext: "Use the ratio as context, then pair it with technique quality, range of motion, and training goals before drawing hard conclusions.",
    accuracyNote:
      "relative strength categories are rough benchmarks and not universal truths for every lifter or sport",
    resultName: "relative strength ratio",
  }),
  buildCopy({
    slug: "dots-calculator",
    title: "DOTS Calculator",
    metaDescription:
      "Calculate a DOTS score from bodyweight, total, and sex using standard powerlifting coefficients.",
    intro:
      "Use this DOTS calculator to compare powerlifting totals across different bodyweights with a standard coefficient-based score.",
    group: "strength",
    relatedSlugs: ["wilks-calculator", "relative-strength-calculator", "powerlifting-meet-attempt-calculator", "strength-standards-calculator"],
    whyItMatters: "normalize a powerlifting total so lifters of different bodyweights can be compared more fairly",
    bestFor: "powerlifters, coaches, and meet followers who want a quick standardized score",
    howToUse: "enter bodyweight, total, and sex using kilograms or convert before entering",
    whatToDoNext: "Compare the score across meet results or training blocks, but keep in mind that score systems are only one way to view performance.",
    accuracyNote:
      "DOTS is a standard scoring model, but it still simplifies complex differences between body sizes and lifter profiles",
    resultName: "DOTS score",
  }),
  buildCopy({
    slug: "wilks-calculator",
    title: "Wilks Calculator",
    metaDescription:
      "Calculate a Wilks score from bodyweight, total, and sex using the published coefficient formula.",
    intro:
      "Use this Wilks calculator to estimate a bodyweight-adjusted powerlifting score from your total and bodyweight.",
    group: "strength",
    relatedSlugs: ["dots-calculator", "relative-strength-calculator", "powerlifting-meet-attempt-calculator", "strength-standards-calculator"],
    whyItMatters: "compare totals across bodyweights with a familiar powerlifting scoring system",
    bestFor: "lifters and coaches who still use Wilks as a quick point of reference",
    howToUse: "enter total, bodyweight, and sex to estimate the score from the standard formula",
    whatToDoNext: "Use the score to compare progress or meet results, but do not let it replace good programming and lift-by-lift analysis.",
    accuracyNote:
      "Wilks is a legacy scoring system and should be treated as a comparison tool rather than a complete description of performance",
    resultName: "Wilks score",
  }),
  buildCopy({
    slug: "powerlifting-meet-attempt-calculator",
    title: "Powerlifting Meet Attempt Calculator",
    metaDescription:
      "Estimate conservative opener, second, and third attempts from a recent max for a powerlifting meet.",
    intro:
      "Use this powerlifting meet attempt calculator to build safer opener, second, and third attempt suggestions from a recent max.",
    group: "strength",
    relatedSlugs: ["training-max-calculator", "one-rep-max-calculator", "dots-calculator", "wilks-calculator"],
    whyItMatters: "set more realistic meet attempts instead of letting nerves or ego write the plan on meet day",
    bestFor: "powerlifters who want a cleaner starting point for meet strategy",
    howToUse: "enter a realistic recent max, not a fantasy number you hope to hit on your best day",
    whatToDoNext: "Use the suggestions as a base plan, then adjust with your coach or based on how the opener moves that day.",
    accuracyNote:
      "meet attempts always depend on judging, travel, nerves, commands, and how you are actually performing on the platform",
    resultName: "meet attempt suggestion",
  }),
  buildCopy({
    slug: "strength-standards-calculator",
    title: "Strength Standards Calculator",
    metaDescription:
      "Compare your lift to simple strength standards by sex, lift type, and bodyweight.",
    intro:
      "Use this strength standards calculator to compare a current lift against simple bodyweight-based milestone levels.",
    group: "strength",
    relatedSlugs: ["relative-strength-calculator", "one-rep-max-calculator", "rep-max-calculator", "training-max-calculator"],
    whyItMatters: "see where a lift roughly falls on the spectrum from beginner to advanced relative to your size",
    bestFor: "lifters who want simple milestone targets without digging through spreadsheets or tables",
    howToUse: "enter bodyweight, choose the lift, and compare your current number to the level cutoffs shown",
    whatToDoNext: "Use the milestone weights as broad checkpoints, then make your next programming decision based on your actual weak points.",
    accuracyNote:
      "strength standards vary between systems, sports, and coaching models, so these levels should stay broad and practical",
    resultName: "strength level and milestone targets",
  }),
  buildCopy({
    slug: "workout-volume-calculator",
    title: "Workout Volume Calculator",
    metaDescription:
      "Calculate workout volume from sets, reps, weight, and exercise count to estimate total tonnage.",
    intro:
      "Use this workout volume calculator to estimate total tonnage from sets, reps, and load for a lift or full workout block.",
    group: "strength",
    relatedSlugs: ["training-max-calculator", "rest-time-calculator", "one-rep-max-calculator", "macro-calculator"],
    whyItMatters: "quantify how much work you are doing instead of only remembering how hard a session felt",
    bestFor: "lifters and coaches who want a simple volume checkpoint for comparison across sessions",
    howToUse: "enter the average sets, reps, and weight used for the movement or block you want to review",
    whatToDoNext: "Use the output alongside recovery, soreness, and performance so you can see whether volume is helping or just accumulating fatigue.",
    accuracyNote:
      "tonnage is useful, but it does not capture effort, range of motion, tempo, or exercise difficulty by itself",
    resultName: "workout volume",
  }),
  buildCopy({
    slug: "rest-time-calculator",
    title: "Rest Time Calculator",
    metaDescription:
      "Get recommended rest time ranges by goal and exercise type for strength, hypertrophy, endurance, or fat loss.",
    intro:
      "Use this rest time calculator to estimate a useful rest range based on your training goal and the type of exercise you are doing.",
    group: "strength",
    relatedSlugs: ["workout-volume-calculator", "training-max-calculator", "macro-calculator", "body-recomposition-calculator"],
    whyItMatters: "match rest periods to the goal of the session instead of using the same break length for everything",
    bestFor: "lifters who want to structure sessions better without overcomplicating programming",
    howToUse: "choose the main goal of the session and the type of movement you are resting between",
    whatToDoNext: "Start inside the recommended range, then move toward the higher or lower end depending on performance and fatigue.",
    accuracyNote:
      "rest times are guidelines because exercise difficulty, conditioning level, and intent can all change what is appropriate",
    resultName: "rest time recommendation",
  }),
  buildCopy({
    slug: "contest-prep-countdown",
    title: "Contest Prep Countdown",
    metaDescription:
      "See how many days and weeks out you are from show day and which prep phase you are currently in.",
    intro:
      "Use this contest prep countdown to see how far out your show is and where you are in the overall prep timeline.",
    group: "prep",
    relatedSlugs: ["competition-timeline-generator", "show-day-checklist-generator", "goal-weight-timeline-calculator", "body-fat-calculator"],
    whyItMatters: "see your current prep phase and timeline without doing the date math manually every week",
    bestFor: "physique athletes and coaches who want a simple countdown reference for planning",
    howToUse: "enter your show date and compare it against today's date or a custom current date",
    whatToDoNext: "Use the phase label as context, then match your decisions to where you really are instead of where you wish you were.",
    accuracyNote:
      "prep phase labels are still broad planning buckets and do not replace individual coaching judgment",
    resultName: "contest countdown",
  }),
  buildCopy({
    slug: "competition-timeline-generator",
    title: "Competition Timeline Generator",
    metaDescription:
      "Generate a simple contest prep milestone timeline based on your show date, experience level, and division.",
    intro:
      "Use this competition timeline generator to map out the major milestones between now and show day.",
    group: "prep",
    relatedSlugs: ["contest-prep-countdown", "show-day-checklist-generator", "goal-weight-timeline-calculator", "body-fat-calculator"],
    whyItMatters: "organize contest prep milestones so important steps do not pile up at the last minute",
    bestFor: "competitors and coaches who want a cleaner prep calendar without building one from scratch",
    howToUse: "enter your show date, division, and experience level so the timeline can place major milestones in context",
    whatToDoNext: "Use the timeline as a planning checklist, then adjust each date based on your actual prep needs and deadlines.",
    accuracyNote:
      "contest timelines vary based on federation, travel, posing needs, and how early you like to prepare",
    resultName: "competition timeline",
  }),
  buildCopy({
    slug: "show-day-checklist-generator",
    title: "Show Day Checklist Generator",
    metaDescription:
      "Generate a contest day checklist for documents, clothing, food, pump-up gear, grooming, and travel.",
    intro:
      "Use this show day checklist generator to create a cleaner packing list and reduce last-minute stress before stepping on stage.",
    group: "prep",
    relatedSlugs: ["competition-timeline-generator", "contest-prep-countdown", "body-fat-calculator", "rest-time-calculator"],
    whyItMatters: "reduce show-day chaos by organizing the basics before the week gets busy",
    bestFor: "competitors who want a repeatable packing checklist for local or travel shows",
    howToUse: "choose your division and whether travel is part of the plan",
    whatToDoNext: "Review the list early, customize it for your federation and preferences, and pack before peak week gets hectic.",
    accuracyNote:
      "every show has its own rules and backstage setup, so the list should always be reviewed against the event details",
    resultName: "show-day checklist",
  }),
] as const satisfies readonly ToolDefinition[];

export type ToolSlug = (typeof tools)[number]["slug"];
export type ToolRecord = (typeof tools)[number];

export const toolMap: Record<ToolSlug, ToolRecord> = Object.fromEntries(
  tools.map((tool) => [tool.slug, tool]),
) as Record<ToolSlug, ToolRecord>;

export function getTool(slug: string): ToolRecord | null {
  return toolMap[slug as ToolSlug] ?? null;
}

export function getToolsByGroup(group: ToolGroupKey) {
  return tools.filter((tool) => tool.group === group);
}
