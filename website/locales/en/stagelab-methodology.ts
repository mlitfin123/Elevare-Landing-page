import type { StageLabMethodologyMessages } from "../../lib/i18n/stagelab-methodology-messages.ts";

const messages: StageLabMethodologyMessages = {
  eyebrow: "Inside the method",
  title: "How StageLab Makes Decisions",
  lead: "AI shouldn't have to be a black box.",
  body: "StageLab pairs model-assisted assessment with consistent prep rules, progress over time, division context, and safety checks. AI contributes to the assessment; it doesn't independently control your prep plan.",
  scope: "This describes ongoing competition prep in the StageLab app. One-time website analyses are standalone snapshots: they do not manage a prep plan or establish a progress history.",
  cards: {
    readiness: {
      title: "Visual readiness",
      body: "Conditioning, fullness, muscularity, symmetry, and presentation are considered alongside image quality and available comparison history. Model-assisted observations pass through deterministic checks to produce an estimated readiness range for additional conditioning time.",
      note: "A readiness estimate is approximate, including when it is expressed as a single number of weeks.",
    },
    progress: {
      title: "Progress over time",
      body: "When comparable history exists, StageLab can compare the current check-in with previous check-ins, the cycle baseline, a saved reference or best look, and weight and waist trends. It considers whether the conditioning gap is closing as show day approaches.",
      note: "A first check-in establishes a baseline. It cannot show a real longitudinal trend.",
    },
    bodyFat: {
      title: "Body-fat context",
      body: "An estimated body-fat range provides supporting context. It cannot determine stage readiness on its own. A material conflict with stronger visual evidence can lower confidence instead of forcing a seemingly certain answer.",
      note: "Photo-based body-fat estimates are approximations, not laboratory measurements.",
    },
    adjustments: {
      title: "Nutrition & cardio decisions",
      body: "Before suggesting a change, StageLab considers progress, readiness, adherence, recovery, phase, recent interventions, current activity, the maintenance estimate, and safety constraints. It generally favors measured changes, with broader calorie and activity adjustments possible when persistent or urgent evidence supports them.",
      note: "Being behind does not automatically trigger a calorie cut.",
    },
    division: {
      title: "Division-specific context",
      body: "Different divisions call for different looks. Conditioning, fullness, muscularity, symmetry, and presentation are interpreted in the selected division's context, including the possibility of over-conditioning.",
      note: "StageLab's division standards are coaching heuristics informed by division characteristics. They are not official federation judging criteria.",
    },
    confidence: {
      title: "Confidence & uncertainty",
      body: "Photo quality, missing history, inconsistent measurements, pose differences, and disagreement between signals can reduce confidence, widen an estimate, or lead to a more conservative result. Limited evidence may trigger a safer fallback or prevent an unsupported conclusion.",
      note: "StageLab confidence reflects the quality and consistency of the available evidence. It is not a scientifically calibrated probability.",
    },
  },
  posing: {
    eyebrow: "Posing Coach",
    title: "Posing Is Evaluated Separately",
    body: "Posing Coach reviews pose execution and presentation using ordered frames sampled from your posing video. Posing analysis considers division-specific execution, strengths, corrections, and presentation quality.",
    separation: "Posing scores do not alter:",
    unaffected: ["Body-fat estimates", "Physique readiness", "Calories", "Cardio", "Peak Week decisions"],
    note: "The Posing Score describes presentation. It is not an official judging score, a conditioning or readiness score, or a prediction of placing.",
  },
  flow: {
    title: "From evidence to a plan decision",
    inputsLabel: "Available check-in context",
    inputs: ["Visual assessment", "Division context", "Progress over time", "Weight & waist trends", "Adherence & recovery", "Plan history"],
    steps: ["Reconciled readiness", "Safety & phase checks", "Hold or measured adjustment"],
    caption: "A conceptual view of the review process. Inputs do not carry equal weight, and not every check-in has every input.",
  },
  detailsTitle: "See More About the Methodology",
  details: {
    readiness: {
      title: "How visual readiness is reconciled",
      paragraphs: ["StageLab combines model-assisted visual observations with deterministic prep checks and the athlete's division context. Body-fat context supports that review; it does not overrule stronger evidence or become the sole answer.", "The result generally describes an estimated readiness range. A single-week estimate, when shown, is also approximate. Conflicting signals can widen uncertainty rather than produce a precise contest-ready date."],
    },
    history: {
      title: "How progress history is used",
      paragraphs: ["Useful comparisons need sufficiently consistent photos and measurements. When those records exist, StageLab can review the previous check-in, cycle baseline, saved reference or best look, and weight and waist trends.", "It considers the direction of change and whether the remaining conditioning gap is closing relative to the time left. Missing or poorly comparable history limits that conclusion; a first check-in supplies a baseline, not a demonstrated trend."],
    },
    maintenance: {
      title: "How StageLab Estimates Maintenance",
      paragraphs: ["StageLab starts with an activity-adjusted formula estimate. When enough reliable data exists, it can incorporate calorie intake from completed logging days and weekly-average weight trends.", "The influence of observed data depends on its quality. The system limits abrupt changes driven by noisy short-term fluctuations. This is an adaptive maintenance estimate, not measured TDEE or a precise measurement of energy expenditure."],
    },
    recovery: {
      title: "Why StageLab May Hold Instead of Cut",
      paragraphs: ["Recovery, adherence, reported injury indicators, declining performance, recent interventions, and accumulated stress can lead StageLab to hold, soften, or reconsider an otherwise aggressive adjustment.", "A measured intervention may need time to show its effect. Persistent or urgent evidence can still support combined calorie and activity changes. These are informational prep safeguards, not medical monitoring or a substitute for qualified care."],
    },
    peakWeek: {
      title: "Peak Week Uses Separate Logic",
      paragraphs: ["As competition approaches, StageLab transitions from normal prep logic into dedicated Peak Week planning. Daily visual and prep context inform that review, rather than simply extending normal weekly adjustments.", "StageLab does not automate dehydration, water cuts, sodium manipulation, or diuretic use."],
    },
    posing: {
      title: "Why posing stays separate",
      paragraphs: ["Your physique and how you present it are related, but they answer different questions. Ordered video frames help assess pose execution, strengths, corrections, and presentation in the selected division.", "Posing scores do not feed into body-fat estimates, physique readiness, calorie or cardio recommendations, or Peak Week decisions. They do not predict judging outcomes."],
    },
  },
  limits: {
    title: "What StageLab Doesn't Claim",
    intro: "StageLab provides information to support your review. It does not provide:",
    items: ["Laboratory body-fat measurement", "Medical diagnosis or licensed dietetic care", "Guaranteed show readiness or an exact ready date", "Guaranteed placing or exact contest outcomes", "Official judging scores", "Perfect TDEE measurement"],
    posing: "StageLab Posing Scores do not represent conditioning or physique readiness.",
    guidance: "These coaching heuristics are not scientifically validated physiological laws or readiness predictions. Outputs can be inaccurate or incomplete; review them with appropriate professional guidance.",
  },
  transition: "Understand the reasoning behind your next prep decision.",
};

export default messages;
