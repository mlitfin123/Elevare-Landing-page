import type { ToolGroupKey, ToolSlug } from "../tools.ts";

export type CalculatorMessages = {
  seo: {
    indexTitle: string;
    indexDescription: string;
  };
  index: {
    eyebrow: string;
    title: string;
    intro: string;
    finderEyebrow: string;
    finderTitle: string;
    finderCopy: string;
    searchLabel: string;
    searchPlaceholder: string;
    countTemplate: string;
    matchesTemplate: string;
    searchHint: string;
    noMatches: string;
    openCalculator: string;
    quickAnalysisHeading: string;
    quickAnalysisDescription: string;
    quickAnalysisButton: string;
    featuredTool: string;
    workoutFeatureTitle: string;
    workoutFeatureCopy: string;
    openWorkoutGenerator: string;
    browseWorkoutTemplates: string;
  };
  groups: Record<ToolGroupKey, { title: string; description: string }>;
  shell: {
    calculators: string;
    howItWorks: string;
    explanationHeading: string;
    explanationParagraphs: readonly string[];
    faq: string;
    faqTitle: string;
    faqIntro: string;
    faqQuestions: readonly string[];
    faqAnswers: readonly string[];
    relatedEyebrow: string;
    relatedTitle: string;
    relatedCopy: string;
    openTool: string;
    disclaimerLabel: string;
    disclaimer: string;
    ctaEyebrow: string;
    ctaTitle: string;
    ctaCopy: string;
  };
  toolTitles: Record<ToolSlug, string>;
  ui: Record<string, string>;
};
