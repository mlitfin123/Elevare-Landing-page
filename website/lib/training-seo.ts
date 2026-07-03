import type { ExerciseFaq, ExerciseRecord, ExerciseCategoryInfo, WorkoutTemplateRecord } from "./training-data.ts";
import { toolMap, type ToolSlug } from "./tools.ts";

export type IndexPriority = "priority_index" | "standard_index" | "low_priority";

type ExerciseCategoryContent = {
  introParagraphs: string[];
  faqs: ExerciseFaq[];
  relatedToolSlugs: ToolSlug[];
  featuredExerciseSlugs: string[];
};

const COMMON_EXERCISE_PATTERN =
  /\b(bench press|dumbbell bench press|barbell squat|squat|deadlift|romanian deadlift|leg press|lat pulldown|row|shoulder press|lateral raise|bicep curl|triceps pushdown|plank|hip thrust|pushups?)\b/i;

const LOW_PRIORITY_EXERCISE_PATTERN =
  /\b(with chains|with bands|reverse band|guillotine|medium grip|from deficit|to a bench|plate movers|behind the head|lying against an incline|palms-down|palms-up)\b/i;

export const POPULAR_EXERCISE_SLUGS = [
  "barbell-bench-press-medium-grip",
  "dumbbell-bench-press",
  "barbell-squat",
  "barbell-deadlift",
  "romanian-deadlift",
  "leg-press",
  "wide-grip-lat-pulldown",
  "one-arm-dumbbell-row",
  "dumbbell-shoulder-press",
  "side-lateral-raise",
  "dumbbell-bicep-curl",
  "reverse-grip-triceps-pushdown",
  "plank",
  "barbell-hip-thrust",
] as const;

export const POPULAR_WORKOUT_SLUGS = [
  "beginner-full-body-workout",
  "beginner-gym-workout",
  "3-day-full-body-split",
  "4-day-upper-lower-split",
  "5-day-bodybuilding-split",
  "beginner-strength-program",
  "strength-and-hypertrophy-workout",
  "beginner-weight-loss-workout",
  "30-minute-fat-loss-workout",
] as const;

const CATEGORY_CONTENT: Record<string, ExerciseCategoryContent> = {
  chest: {
    introParagraphs: [
      "Chest training is usually where people start when they want to build pressing strength, improve upper-body size, or simply feel more comfortable with common gym lifts. The problem is that a lot of chest sessions end up being random. One week it is flat bench only. The next week it is whatever machine happens to be open. A better approach is to understand the small group of pressing and fly patterns that actually matter, then repeat them long enough to see progress.",
      "A good chest page should help you separate big compound presses from lighter accessory work. Barbell and dumbbell presses are often the backbone because they are easier to load and compare over time. Fly variations, push-ups, and machine work can still be useful, but they usually work best when they support the main pressing pattern rather than replace it. That is especially true if your goal is strength, hypertrophy, or long-term progress you can measure.",
      "Use this category to find the chest exercises you are most likely to keep using, not just the ones that look different. Start with the highest-value presses, learn the setup well, and pay attention to whether the exercise lets you feel your chest working without irritating your shoulders. Once you find movements that fit your structure and equipment, track them consistently in Logbook so the page becomes a training decision tool instead of a list you browse once.",
    ],
    faqs: [
      {
        question: "What are the best chest exercises for most people?",
        answer: "Most people do well starting with one main press, one secondary press, and one lighter chest accessory. Bench press, dumbbell bench press, incline pressing, push-ups, and simple fly variations usually cover the most useful ground.",
      },
      {
        question: "Should chest day be all pressing?",
        answer: "Not necessarily. Pressing should usually do most of the work, but a lighter fly or machine movement can help you add volume without turning every set into a heavy compound effort.",
      },
      {
        question: "Why does chest training sometimes feel more like shoulders or triceps?",
        answer: "That often happens when setup, elbow path, range of motion, or exercise selection is off. A better chest exercise usually lets you keep tension where you want it without forcing your shoulders to dominate the movement.",
      },
      {
        question: "How many chest exercises do I need in one workout?",
        answer: "For many people, two to four chest movements is enough. The bigger win is picking exercises you can repeat and progress instead of adding more variety than you can recover from.",
      },
    ],
    relatedToolSlugs: ["one-rep-max-calculator", "protein-calculator", "macro-calculator", "workout-volume-calculator"],
    featuredExerciseSlugs: [
      "barbell-bench-press-medium-grip",
      "dumbbell-bench-press",
      "barbell-incline-bench-press-medium-grip",
      "decline-dumbbell-bench-press",
      "pushups",
      "cable-chest-press",
      "one-arm-dumbbell-bench-press",
      "hammer-grip-incline-db-bench-press",
      "barbell-guillotine-bench-press",
      "decline-barbell-bench-press",
    ],
  },
  back: {
    introParagraphs: [
      "Back training gets messy quickly because the category covers multiple jobs at once. Some exercises are built around vertical pulling, some around rowing, and some around upper-back support or posture. If you treat all of them like the same thing, your sessions usually end up unbalanced. The simplest fix is to think in patterns first: pulldowns or pull-up style work for lats, rows for thickness and control, and supporting movements for areas that need more focused volume.",
      "For most people, the highest-value back exercises are the ones that are easy to repeat and easy to load without turning the whole set into momentum. Rows, pulldowns, cable pulls, and supported variations are often more productive than constantly switching to odd angles. That does not mean variety is bad. It just means variety works best after you have a few core back movements that already give you a clear signal about strength, control, and progression.",
      "Use this category to build a cleaner back exercise shortlist. Look for one or two main pulling patterns that feel stable, then add accessories that fill in what the bigger lifts miss. If a movement is hard to feel in the right area or impossible to standardize, it is usually a weaker long-term choice. The goal here is to help you find back exercises you can understand, progress, and track instead of collecting rows and pulldowns that all blur together.",
    ],
    faqs: [
      {
        question: "What back exercises should beginners start with?",
        answer: "Beginners usually do well with one row, one pulldown, and a simple machine or cable variation they can repeat. Supported rows and pulldowns are often easier to learn than highly technical pulls.",
      },
      {
        question: "Do I need both rows and pulldowns?",
        answer: "Usually yes. Rows and pulldowns challenge the back from different angles, so using both gives most people a more complete and balanced training setup.",
      },
      {
        question: "Why is the back category better when deadlift-like lifts are not doing all the work?",
        answer: "Back pages are more useful when they focus on direct back training first. Pulling from the floor can still matter, but rows and pulldowns are usually clearer choices when someone specifically wants back exercise options.",
      },
      {
        question: "How many back exercises belong in one session?",
        answer: "A lot of people do well with two to four back movements depending on training age, recovery, and the rest of the split. Quality and repeatability matter more than filling the workout with every possible row variation.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "relative-strength-calculator"],
    featuredExerciseSlugs: [
      "wide-grip-lat-pulldown",
      "close-grip-front-lat-pulldown",
      "one-arm-dumbbell-row",
      "bent-over-two-dumbbell-row",
      "seated-one-arm-cable-pulley-rows",
      "underhand-cable-pulldowns",
      "v-bar-pulldown",
      "straight-arm-pulldown",
      "incline-bench-pull",
      "one-arm-lat-pulldown",
    ],
  },
  legs: {
    introParagraphs: [
      "Leg training covers a lot of territory. Squats, hinges, lunges, presses, curls, and calf work all matter, but not in the same way. If you are trying to build stronger lower-body sessions, the first step is to separate the big patterns that drive most of the progress from the smaller movements that clean things up around the edges. That usually means one squat or leg press pattern, one hinge pattern, and then more specific work for quads, hamstrings, glutes, or calves as needed.",
      "The best leg exercises are usually the ones you can standardize well enough to compare week to week. Squats, Romanian deadlifts, leg presses, lunges, and machine leg work tend to be useful because they create a clear signal. You can tell when they are improving, when they are stalling, and when they are beating up recovery more than they should. That is harder to do when every lower-body day turns into a different collection of variations.",
      "Use this category to build better lower-body structure, not just more fatigue. Start with the movements that match your goal, available equipment, and comfort level. If you are new, simple and repeatable often wins. If you are more advanced, the page becomes a way to organize patterns and avoid overlap. Either way, the point is to leave with a small set of leg exercises you can actually progress and track instead of an endless rotation of options.",
    ],
    faqs: [
      {
        question: "What leg exercises should most people prioritize?",
        answer: "Most people are well served by a squat or leg press, a hinge like a Romanian deadlift, and one or two simpler accessory movements for quads, hamstrings, or calves.",
      },
      {
        question: "Do I need both squat and hinge patterns?",
        answer: "In most cases, yes. Those patterns train the lower body differently and help balance the session better than relying on only one style of lift.",
      },
      {
        question: "How many leg exercises belong in one workout?",
        answer: "A lot of lifters do well with three to six lower-body movements depending on how demanding the main lift is and how often they train legs during the week.",
      },
      {
        question: "Why do leg pages need clearer filtering than just 'all lower body'?",
        answer: "Because not every lower-body exercise solves the same problem. A better category helps you separate knee-dominant work, hinge work, unilateral work, and accessory work so your session stays balanced.",
      },
    ],
    relatedToolSlugs: ["calorie-calculator", "protein-calculator", "macro-calculator", "goal-weight-timeline-calculator"],
    featuredExerciseSlugs: [
      "barbell-squat",
      "romanian-deadlift",
      "leg-press",
      "barbell-deadlift",
      "barbell-full-squat",
      "front-barbell-squat",
      "barbell-lunge",
      "dumbbell-lunges",
      "bodyweight-squat",
      "lying-leg-curls",
    ],
  },
  shoulders: {
    introParagraphs: [
      "Shoulder training works best when it is simple enough to recover from and specific enough to be felt in the right place. A lot of people turn shoulder work into a collection of random raises and presses that all blur together. The better approach is to choose one main overhead or shoulder press pattern, then add a small number of lateral or rear-delt focused movements that fill in what the press does not cover well on its own.",
      "This category is more useful when it stays focused on true shoulder-dominant exercises. That means presses, lateral raise patterns, rear-delt work, and other movements that actually target the delts as the main area of work. It is less useful when upper-back pulling or general arm work gets mixed in just because the shoulders assist. Clearer category boundaries make the page easier to trust and the related links more useful.",
      "Use this page to build cleaner upper-body accessory work around your main presses, chest training, and back training. If you are trying to bring up shoulder size, look for exercises you can control and standardize instead of chasing constant novelty. If your goal is general fitness, simpler shoulder presses and raises are usually enough. The point is to leave with shoulder movements you can repeat, recover from, and log accurately in the rest of your program.",
    ],
    faqs: [
      {
        question: "What shoulder exercises are most useful for beginners?",
        answer: "Most beginners do well with one simple shoulder press and one lateral raise pattern they can control. That is usually enough to learn the category without overcomplicating it.",
      },
      {
        question: "Do I need front raises if I already press a lot?",
        answer: "Not always. Many people get plenty of front-delt work from pressing, so lateral and rear-delt work often adds more value.",
      },
      {
        question: "Why are upright rows or rear-delt rows handled carefully on shoulder pages?",
        answer: "They can still be relevant, but they should only stay in the shoulder category when the movement is clearly shoulder-dominant rather than acting like a general back row.",
      },
      {
        question: "How much shoulder work should I do each week?",
        answer: "That depends on the rest of your upper-body training, but a lot of people do well with a few focused shoulder movements spread across the week instead of cramming everything into one day.",
      },
    ],
    relatedToolSlugs: ["one-rep-max-calculator", "protein-calculator", "macro-calculator", "workout-volume-calculator"],
    featuredExerciseSlugs: [
      "dumbbell-shoulder-press",
      "barbell-shoulder-press",
      "side-lateral-raise",
      "seated-side-lateral-raise",
      "one-arm-incline-lateral-raise",
      "alternating-cable-shoulder-press",
      "cable-shoulder-press",
      "dumbbell-lying-rear-lateral-raise",
      "one-arm-side-laterals",
      "seated-cable-shoulder-press",
    ],
  },
  arms: {
    introParagraphs: [
      "Arm training is one of the easiest categories to overdo and one of the easiest to clean up. Biceps and triceps usually respond well when the exercise list is simple, the setup is repeatable, and the rest of the program is already doing the bigger compound work. The problem is that arm pages often get polluted by every pressing and pulling exercise where the arms happen to assist. That makes it harder to find true arm movements and less useful to compare them.",
      "A stronger arm category focuses on exercises where the arms are actually the main target. Curls, pushdowns, extensions, dips with an arm emphasis, and simpler isolation patterns are what most people are looking for here. Those exercises are helpful because they are easier to standardize, easier to feel in the target area, and easier to plug into a workout as accessory work without rebuilding the whole session around them.",
      "Use this category when you want clearer options for direct biceps or triceps work. If you are newer, one curl and one extension pattern is usually enough. If you are more advanced, the value comes from finding small variations that still fit the same basic role instead of treating every arm day like a brand-new program. The goal is not to collect endless curl and extension pages. It is to find direct arm work you can actually repeat, progress, and keep in the plan.",
    ],
    faqs: [
      {
        question: "What counts as a true arm exercise?",
        answer: "A true arm exercise is one where biceps or triceps are the primary target, not just assisting the lift. That usually means curls, extensions, pushdowns, and other direct arm-focused movements.",
      },
      {
        question: "Why are bench press variations not filling the arms category anymore?",
        answer: "Because the page is more useful when it stays focused on direct arm work. Pressing exercises can involve the triceps, but they are not always the best answer when someone is specifically looking for arm exercises.",
      },
      {
        question: "How many arm exercises do I need?",
        answer: "Many people get plenty from one or two direct biceps movements and one or two direct triceps movements, especially if their main program already includes pressing and pulling.",
      },
      {
        question: "Should beginners train arms directly?",
        answer: "Yes, but they usually do not need much. A small amount of direct arm work can be useful as long as it does not crowd out the bigger movements the rest of the program depends on.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "relative-strength-calculator"],
    featuredExerciseSlugs: [
      "dumbbell-bicep-curl",
      "dumbbell-alternate-bicep-curl",
      "hammer-curls",
      "barbell-curl",
      "ez-bar-curl",
      "reverse-grip-triceps-pushdown",
      "dumbbell-one-arm-triceps-extension",
      "cable-rope-overhead-triceps-extension",
      "standing-overhead-barbell-triceps-extension",
      "concentration-curls",
    ],
  },
  core: {
    introParagraphs: [
      "Core pages are most useful when they focus on bracing, trunk control, flexion, and anti-extension patterns instead of pretending every exercise with a stable torso belongs in the same bucket. A better core category helps you compare movements that actually train the midsection directly, whether you are building better general fitness, trying to support heavier lifting, or simply looking for a few exercises you can do consistently without overthinking them.",
      "For most people, the best core setup is not complicated. One flexion pattern, one bracing pattern, and maybe one movement that challenges control through a longer range is often enough. Sit-up variations, planks, rollouts, crunches, and machine or cable abdominal work can all fit, but the right choice depends on what you can feel, what you can repeat safely, and what actually belongs in the plan. More core exercises do not automatically mean better results.",
      "Use this page to narrow the list down to movements that fit your goal and experience level. If you need something simple, start with stable bodyweight or cable options. If you want more challenge, use the page to compare rollouts, hanging work, or more demanding bracing movements. The best core category is one that helps you find a small number of repeatable exercises you can progress and recover from, not one that pushes every press and carry into the same list.",
    ],
    faqs: [
      {
        question: "What are the best core exercises for beginners?",
        answer: "Planks, simpler sit-up or crunch variations, and stable machine or cable options are often easier for beginners to learn and repeat well.",
      },
      {
        question: "Do I need a lot of direct core work?",
        answer: "Usually not. A small amount of focused core work can go a long way when the exercises are chosen well and repeated consistently.",
      },
      {
        question: "Why are pressing exercises not showing up in core now?",
        answer: "Because core pages are more useful when they stay focused on movements that directly train the trunk. Assistance from the core during another lift is not the same as a core-dominant exercise.",
      },
      {
        question: "How should I progress core training?",
        answer: "Progress the same way you would any other exercise category: cleaner reps, longer holds, tougher leverage, or slightly more load once the movement is consistent.",
      },
    ],
    relatedToolSlugs: ["body-fat-calculator", "protein-calculator", "macro-calculator", "calorie-calculator"],
    featuredExerciseSlugs: [
      "plank",
      "3-4-sit-up",
      "press-sit-up",
      "barbell-ab-rollout",
      "barbell-ab-rollout-on-knees",
      "ab-crunch-machine",
      "ab-roller",
      "cable-crunch",
      "hanging-leg-raise",
      "landmine-180-s",
    ],
  },
  glutes: {
    introParagraphs: [
      "Glute training sits in an awkward spot on a lot of exercise sites because some of the best glute movements are also clearly lower-body patterns. That means a useful glute category cannot be too loose, but it also cannot be so narrow that it only shows a couple of bridge variations. The middle ground is to prioritize true glute-dominant movements first, then include only the leg exercises that are clearly relevant to glute development and hip extension.",
      "For many people, the most valuable glute exercises are hip thrusts, glute bridges, pull-through style movements, and a small number of lower-body patterns where glute involvement is obvious and meaningful. Not every squat or deadlift belongs here just because the glutes help. But some hinges, lunges, and split-stance patterns are still useful because they train the glutes hard enough to matter in a glute-focused plan. Clearer filtering makes this page much more trustworthy.",
      "Use this category when you want better glute exercise choices without sorting through the whole lower-body library again. Start with the direct glute movements first, then add the clearly relevant leg patterns that fit your equipment and goals. If the movement does not give you a reliable glute stimulus or is hard to standardize, it probably belongs somewhere else. The best glute category helps you build a short list of movements you can actually feel, repeat, and progress over time.",
    ],
    faqs: [
      {
        question: "What are the best glute exercises for most people?",
        answer: "Hip thrusts, glute bridges, pull-throughs, and a few well-chosen hinge or split-stance leg exercises are usually the best place to start.",
      },
      {
        question: "Why are only clearly relevant leg exercises included here?",
        answer: "Because a glute page is more useful when it stays focused. If every squat and deadlift variation shows up, the category becomes too broad to trust.",
      },
      {
        question: "Do I need machines to train glutes well?",
        answer: "No. Barbells, cables, dumbbells, and even bodyweight can be enough as long as the exercise is stable, repeatable, and actually gives you the stimulus you want.",
      },
      {
        question: "Can glute training live inside a regular leg day?",
        answer: "Yes. A lot of people make better progress by choosing one or two true glute-focused movements and layering them into lower-body sessions instead of treating glute work like a completely separate universe.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "calorie-surplus-calculator"],
    featuredExerciseSlugs: [
      "barbell-hip-thrust",
      "barbell-glute-bridge",
      "pull-through",
      "barbell-lunge",
      "barbell-walking-lunge",
      "dumbbell-lunges",
      "dumbbell-rear-lunge",
      "romanian-deadlift",
      "barbell-squat",
      "leg-press",
    ],
  },
  barbell: {
    introParagraphs: [
      "Barbell exercises are useful because they are easy to load, easy to compare over time, and often central to strength or hypertrophy training. They are not automatically better than every other setup, but they tend to give a clear signal. If you are trying to build a program around repeatable progress, barbell work is often where the main lifts live.",
      "Use this category when you want exercises that fit a barbell-based setup. That could mean squats, deadlifts, presses, rows, hinges, or accessory work that benefits from simple load progression. The page is most useful when it helps you find a few lifts worth tracking consistently, not when it turns every barbell variation into a must-use movement.",
    ],
    faqs: [
      {
        question: "What are the most important barbell exercises?",
        answer: "For most lifters, squats, deadlifts, presses, rows, and hip hinges are the main barbell patterns worth learning first.",
      },
      {
        question: "Are barbell exercises better than dumbbells?",
        answer: "Not always. Barbells are often better for load progression and standardization, while dumbbells can be better for unilateral work, comfort, or equipment access.",
      },
      {
        question: "Who benefits most from barbell training?",
        answer: "People who want measurable progression, gym-based training, and a straightforward way to compare performance over time usually benefit the most.",
      },
      {
        question: "Can beginners use barbells?",
        answer: "Yes, as long as the exercise choice and setup are manageable. Many beginners do well with a small number of barbell lifts plus simpler accessories.",
      },
    ],
    relatedToolSlugs: ["one-rep-max-calculator", "training-max-calculator", "workout-volume-calculator", "relative-strength-calculator"],
    featuredExerciseSlugs: [
      "barbell-bench-press-medium-grip",
      "barbell-squat",
      "barbell-deadlift",
      "romanian-deadlift",
      "barbell-shoulder-press",
      "barbell-hip-thrust",
      "barbell-full-squat",
      "barbell-lunge",
      "barbell-glute-bridge",
      "barbell-curl",
    ],
  },
  dumbbell: {
    introParagraphs: [
      "Dumbbell exercises are some of the most flexible options in the whole training library. They work well in commercial gyms, small apartment setups, and hotel gyms, and they make unilateral training easier without changing the whole session structure. That is why dumbbells are often the fastest way to keep a plan moving when equipment is limited.",
      "Use this category when you want movements that fit a simpler setup without giving up useful progression. Dumbbell presses, rows, lunges, curls, shoulder work, and split-stance patterns are common starting points because they are practical and easy to repeat. The goal is not to make every workout dumbbell-only. It is to find the dumbbell exercises that solve real program needs.",
    ],
    faqs: [
      {
        question: "What are the best dumbbell exercises to start with?",
        answer: "Dumbbell bench presses, rows, lunges, shoulder presses, curls, and goblet-style lower-body work are common starting points because they are simple and useful.",
      },
      {
        question: "Are dumbbells enough to build muscle?",
        answer: "Yes. Dumbbells can be enough for very effective training as long as the load range and exercise selection fit your current level and goals.",
      },
      {
        question: "Why do people use dumbbells instead of barbells?",
        answer: "Dumbbells are easier to use in smaller spaces, better for unilateral work, and often more comfortable for people who do not love fixed bar paths.",
      },
      {
        question: "Are dumbbells beginner-friendly?",
        answer: "Usually yes. Many dumbbell exercises are easier to learn and set up than more technical barbell lifts.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "calorie-calculator"],
    featuredExerciseSlugs: [
      "dumbbell-bench-press",
      "one-arm-dumbbell-row",
      "dumbbell-shoulder-press",
      "dumbbell-lunges",
      "dumbbell-bicep-curl",
      "dumbbell-squat",
      "dumbbell-rear-lunge",
      "hammer-curls",
      "decline-dumbbell-bench-press",
      "one-arm-dumbbell-bench-press",
    ],
  },
  cable: {
    introParagraphs: [
      "Cable exercises are valuable because they are easy to adjust, easy to control, and useful for adding focused volume without as much setup friction. They are especially helpful when you want accessory work that stays smooth, repeatable, and a little easier on the joints than some free-weight alternatives.",
      "Use this category when you want controlled tension, simpler adjustments, and more flexible upper- or lower-body accessory options. Cable presses, pulldowns, rows, crunches, raises, pushdowns, and pull-throughs can all fit here. The best cable exercises are usually the ones that solve a clear problem in the program instead of just adding more movement for the sake of variety.",
    ],
    faqs: [
      {
        question: "Why use cable exercises?",
        answer: "Cables are useful for controlled tension, easy setup changes, and accessory work that is often smoother and easier to standardize.",
      },
      {
        question: "Are cable exercises only for beginners?",
        answer: "No. Cables can be useful for beginners and advanced lifters alike, especially when the goal is stable volume or accessory work.",
      },
      {
        question: "What are the best cable exercise categories?",
        answer: "Rows, pulldowns, chest pressing, crunches, raises, extensions, and pull-through style movements are some of the most useful starting points.",
      },
      {
        question: "Do cable exercises replace compounds?",
        answer: "Usually not. They often work best as supporting movements alongside bigger barbell or dumbbell lifts.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "body-fat-calculator"],
    featuredExerciseSlugs: [
      "close-grip-front-lat-pulldown",
      "wide-grip-lat-pulldown",
      "straight-arm-pulldown",
      "alternating-cable-shoulder-press",
      "cable-shoulder-press",
      "seated-one-arm-cable-pulley-rows",
      "cable-crunch",
      "reverse-grip-triceps-pushdown",
      "pull-through",
      "cable-chest-press",
    ],
  },
  machine: {
    introParagraphs: [
      "Machine exercises are often underrated because they look less impressive than free weights, but they can be extremely useful for stability, learning, and accumulating volume with less setup stress. That makes them valuable for beginners, fatigued lifters, rehab-minded phases, and anyone who wants a cleaner way to target a muscle without spending half the session getting into position.",
      "Use this category when you want predictable setup, simpler execution, or an easier way to add more work around your main lifts. Leg press, ab machines, cable-based machines, and other guided movements can all help when you need stable output instead of endless coordination demands. The page is strongest when it helps you find machine movements that complement the rest of your training rather than compete with it.",
    ],
    faqs: [
      {
        question: "Are machine exercises effective?",
        answer: "Yes. Machine exercises can be very effective for hypertrophy, learning, and adding stable volume around your main lifts.",
      },
      {
        question: "Should beginners use machines?",
        answer: "Often yes. Machines can reduce setup complexity and help beginners learn effort and control before worrying about more technical free-weight patterns.",
      },
      {
        question: "Do machines replace free weights?",
        answer: "Not always. Many people use both. Machines often support a program best when they make the accessories easier to recover from and easier to standardize.",
      },
      {
        question: "What is the biggest benefit of machine training?",
        answer: "Stability. A machine can make it easier to focus on the target area instead of spending every rep solving a balance or coordination problem.",
      },
    ],
    relatedToolSlugs: ["protein-calculator", "macro-calculator", "workout-volume-calculator", "goal-weight-timeline-calculator"],
    featuredExerciseSlugs: [
      "leg-press",
      "ab-crunch-machine",
      "calf-press-on-the-leg-press-machine",
      "seated-cable-shoulder-press",
      "close-grip-front-lat-pulldown",
      "wide-grip-lat-pulldown",
      "v-bar-pulldown",
      "underhand-cable-pulldowns",
      "cable-chest-press",
      "cable-crunch",
    ],
  },
  bodyweight: {
    introParagraphs: [
      "Bodyweight exercises matter because they remove one of the biggest excuses in training: needing a full gym to get started. They are also useful for warm-ups, hotel workouts, conditioning, beginner plans, and building basic movement control. A good bodyweight category should make those uses easier by surfacing the movements that are practical, repeatable, and easy to plug into a real routine.",
      "Use this page when you want low-equipment exercise options that still have a clear training role. Push-ups, planks, squats, lunges, and simpler abdominal movements are often the most useful starting points because they are accessible and easy to repeat. Bodyweight work is not automatically easy, and it is not automatically inferior. It is simply a different tool that works best when the exercise choice matches the goal.",
    ],
    faqs: [
      {
        question: "Are bodyweight exercises enough to get in shape?",
        answer: "Yes, especially for beginners or people training at home. The key is choosing movements you can progress and organizing them into a repeatable plan.",
      },
      {
        question: "What bodyweight exercises are most useful?",
        answer: "Push-ups, squats, lunges, planks, and simple core movements are usually the most practical starting points.",
      },
      {
        question: "Who benefits most from bodyweight training?",
        answer: "Beginners, home trainees, travelers, and anyone who needs simple low-equipment options often benefit the most.",
      },
      {
        question: "Can bodyweight exercises support muscle gain?",
        answer: "They can, especially early on, but long-term progress often improves when you add ways to make the movements harder or combine them with external load.",
      },
    ],
    relatedToolSlugs: ["calorie-calculator", "protein-calculator", "goal-weight-timeline-calculator", "body-fat-calculator"],
    featuredExerciseSlugs: [
      "pushups",
      "bodyweight-squat",
      "bodyweight-walking-lunge",
      "plank",
      "3-4-sit-up",
      "chair-squat",
      "elevated-back-lunge",
      "ab-roller",
      "hanging-leg-raise",
      "bench-dips",
    ],
  },
  kettlebell: {
    introParagraphs: [
      "Kettlebell exercises are useful when you want full-body training, conditioning options, and movements that blend strength with rhythm and control. They are not necessary for everyone, but they can add variety and athletic demand when the setup makes sense. A better kettlebell category helps you find the movements that are actually repeatable instead of treating every kettlebell drill like a separate sport.",
      "Use this category when you want kettlebell-specific options that fit a real training plan. The strongest picks are usually the ones that are easy to standardize, easy to recover from, and clear about what they are supposed to train. That matters more than how creative the movement looks. If a kettlebell exercise cannot be repeated consistently, it is harder to evaluate and harder to keep in the program.",
    ],
    faqs: [
      {
        question: "What are kettlebell exercises best for?",
        answer: "Kettlebell exercises are often useful for full-body training, conditioning, hinges, carries, and simpler strength-endurance work.",
      },
      {
        question: "Are kettlebells good for beginners?",
        answer: "They can be, as long as the movement choice is simple and the setup is not overly technical for the person's current experience level.",
      },
      {
        question: "Do kettlebells replace barbells and dumbbells?",
        answer: "Usually no. They are best treated as another tool that can support conditioning, hinges, carries, and variety where it makes sense.",
      },
      {
        question: "How should I choose kettlebell exercises?",
        answer: "Choose kettlebell movements that fit your goal, match your current skill level, and are easy enough to repeat consistently from week to week.",
      },
    ],
    relatedToolSlugs: ["calorie-burn-calculator", "protein-calculator", "workout-volume-calculator", "pace-calculator"],
    featuredExerciseSlugs: [
      "kettlebell-sumo-high-pull",
      "kettlebell-dead-clean",
      "one-arm-kettlebell-split-snatch",
      "kettlebell-hang-clean",
      "kettlebell-pass-between-the-legs",
      "single-arm-kettlebell-snatch",
      "two-arm-kettlebell-clean",
      "two-arm-kettlebell-jerk",
      "one-arm-kettlebell-jerk",
      "one-arm-kettlebell-clean",
    ],
  },
};

export function getExerciseCategoryContent(category: ExerciseCategoryInfo): ExerciseCategoryContent {
  return CATEGORY_CONTENT[category.slug] ?? {
    introParagraphs: [category.description],
    faqs: [],
    relatedToolSlugs: ["calorie-calculator", "protein-calculator", "macro-calculator"],
    featuredExerciseSlugs: [],
  };
}

export function getExerciseContentScore(exercise: ExerciseRecord) {
  return (
    exercise.instructions.length * 3
    + exercise.benefits.length * 2
    + exercise.commonMistakes.length * 2
    + exercise.alternatives.length
    + exercise.variations.length
    + (exercise.seoDescription ? 2 : 0)
    + (exercise.isCompound ? 1 : 0)
  );
}

export function getExerciseIndexPriority(exercise: ExerciseRecord): IndexPriority {
  if (POPULAR_EXERCISE_SLUGS.includes(exercise.slug as (typeof POPULAR_EXERCISE_SLUGS)[number])) {
    return "priority_index";
  }

  const contentScore = getExerciseContentScore(exercise);
  const looksCommon = COMMON_EXERCISE_PATTERN.test(exercise.name);
  const looksObscure = LOW_PRIORITY_EXERCISE_PATTERN.test(exercise.name);

  if (contentScore < 10 || (looksObscure && !looksCommon)) {
    return "low_priority";
  }

  return "standard_index";
}

export function getWorkoutIndexPriority(template: WorkoutTemplateRecord): IndexPriority {
  if (POPULAR_WORKOUT_SLUGS.includes(template.slug as (typeof POPULAR_WORKOUT_SLUGS)[number])) {
    return "priority_index";
  }

  return "standard_index";
}

export function getExercisePriorityRank(exercise: ExerciseRecord) {
  if (POPULAR_EXERCISE_SLUGS.includes(exercise.slug as (typeof POPULAR_EXERCISE_SLUGS)[number])) {
    return 100;
  }

  let score = getExerciseContentScore(exercise);

  if (COMMON_EXERCISE_PATTERN.test(exercise.name)) score += 8;
  if (exercise.difficulty === "beginner") score += 3;
  if (exercise.isCompound) score += 2;
  if (exercise.equipment.includes("bodyweight") || exercise.equipment.includes("dumbbell") || exercise.equipment.includes("barbell")) {
    score += 2;
  }

  return score;
}

export function getWorkoutPriorityRank(template: WorkoutTemplateRecord) {
  if (POPULAR_WORKOUT_SLUGS.includes(template.slug as (typeof POPULAR_WORKOUT_SLUGS)[number])) {
    return 100;
  }

  let score = 20;
  if (template.trainingDaysPerWeek != null) score += 3;
  if (template.estimatedDurationMinutes != null) score += 2;
  if (template.experienceLevel === "beginner") score += 3;
  if (template.equipment.length <= 2) score += 1;

  return score;
}

export function getPopularExercises(exercises: ExerciseRecord[], limit: number = POPULAR_EXERCISE_SLUGS.length) {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));
  const selected = POPULAR_EXERCISE_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (exercise): exercise is ExerciseRecord => exercise != null,
  );

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  const seen = new Set(selected.map((exercise) => exercise.slug));
  const fallbacks = exercises
    .filter((exercise) => !seen.has(exercise.slug))
    .sort((left, right) => getExercisePriorityRank(right) - getExercisePriorityRank(left) || left.name.localeCompare(right.name))
    .slice(0, limit - selected.length);

  return [...selected, ...fallbacks];
}

export function getPopularWorkoutTemplates(
  workouts: WorkoutTemplateRecord[],
  limit: number = POPULAR_WORKOUT_SLUGS.length,
) {
  const bySlug = new Map(workouts.map((workout) => [workout.slug, workout]));
  const selected = POPULAR_WORKOUT_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (workout): workout is WorkoutTemplateRecord => workout != null,
  );

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  const seen = new Set(selected.map((workout) => workout.slug));
  const fallbacks = workouts
    .filter((workout) => !seen.has(workout.slug))
    .sort((left, right) => getWorkoutPriorityRank(right) - getWorkoutPriorityRank(left) || left.name.localeCompare(right.name))
    .slice(0, limit - selected.length);

  return [...selected, ...fallbacks];
}

export function getExerciseCategoryFeaturedExercises(
  category: ExerciseCategoryInfo,
  exercises: ExerciseRecord[],
  categoryExercises: ExerciseRecord[],
  limit = 10,
) {
  const { featuredExerciseSlugs } = getExerciseCategoryContent(category);
  const categorySlugSet = new Set(categoryExercises.map((exercise) => exercise.slug));
  const selected = featuredExerciseSlugs
    .map((slug) => exercises.find((exercise) => exercise.slug === slug) ?? null)
    .filter((exercise): exercise is ExerciseRecord => exercise != null && categorySlugSet.has(exercise.slug));

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  const seen = new Set(selected.map((exercise) => exercise.slug));
  const fallbacks = [...categoryExercises]
    .filter((exercise) => !seen.has(exercise.slug))
    .sort((left, right) => getExercisePriorityRank(right) - getExercisePriorityRank(left) || left.name.localeCompare(right.name))
    .slice(0, limit - selected.length);

  return [...selected, ...fallbacks];
}

export function getExerciseRelatedToolSlugs(exercise: ExerciseRecord): ToolSlug[] {
  switch (exercise.primaryMuscleGroup) {
    case "chest":
    case "shoulders":
      return ["one-rep-max-calculator", "protein-calculator", "macro-calculator", "workout-volume-calculator"];
    case "back":
      return ["protein-calculator", "macro-calculator", "workout-volume-calculator", "relative-strength-calculator"];
    case "legs":
    case "glutes":
      return ["calorie-calculator", "protein-calculator", "goal-weight-timeline-calculator", "workout-volume-calculator"];
    case "arms":
      return ["protein-calculator", "macro-calculator", "workout-volume-calculator", "body-fat-calculator"];
    case "core":
      return ["body-fat-calculator", "protein-calculator", "macro-calculator", "calorie-calculator"];
    default:
      return ["calorie-calculator", "protein-calculator", "macro-calculator"];
  }
}

export function getWorkoutRelatedToolSlugs(workout: WorkoutTemplateRecord): ToolSlug[] {
  switch (workout.goal) {
    case "strength":
      return ["one-rep-max-calculator", "training-max-calculator", "relative-strength-calculator", "workout-volume-calculator"];
    case "weight-loss":
      return ["calorie-calculator", "protein-calculator", "goal-weight-timeline-calculator", "walking-calorie-calculator"];
    case "muscle-building":
      return ["calorie-surplus-calculator", "protein-calculator", "macro-calculator", "workout-volume-calculator"];
    case "beginner":
      return ["calorie-calculator", "protein-calculator", "one-rep-max-calculator", "macro-calculator"];
    default:
      return ["calorie-calculator", "protein-calculator", "macro-calculator"];
  }
}

export function getWorkoutGoalRelatedToolSlugs(goal: string): ToolSlug[] {
  return getWorkoutRelatedToolSlugs({
    id: "workout-goal",
    name: "Workout goal",
    slug: "workout-goal",
    goal,
    difficulty: null,
    estimatedDurationMinutes: null,
    equipment: [],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: null,
    trainingDaysPerWeek: null,
    targetMuscleGroups: [],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  });
}

export function getCategoryRelatedToolSlugs(category: ExerciseCategoryInfo): ToolSlug[] {
  return getExerciseCategoryContent(category).relatedToolSlugs;
}

export function getRenderableToolSlugs(toolSlugs: ToolSlug[]) {
  return toolSlugs.filter((slug) => toolMap[slug]);
}
