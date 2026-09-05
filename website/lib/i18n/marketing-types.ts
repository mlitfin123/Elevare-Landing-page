export type SeoMessages = {
  title: string;
  description: string;
};

export type LinkCardMessages = {
  label: string;
  title: string;
  body: string;
  action: string;
};

export type StoreButtonMessages = {
  ios: string;
  android: string;
};

export type HomeProductMessages = {
  title: string;
  intro: string;
  featureTitle: string;
  featureBody: string;
  explore: string;
  previewLabel: string;
  previewAlt: string;
  previewTitle: string;
  previewBody: string;
  points: Array<{ title: string; body: string }>;
};

export type HomeMessages = {
  seo: SeoMessages;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    toolsCta: string;
    logbookCta: string;
    marketplaceCta: string;
    highlightsLabel: string;
  };
  overview: LinkCardMessages[];
  nextStep: {
    eyebrow: string;
    title: string;
    cards: LinkCardMessages[];
  };
  tools: {
    eyebrow: string;
    title: string;
    body: string;
    cards: LinkCardMessages[];
  };
  logbook: HomeProductMessages;
  stagelab: HomeProductMessages & {
    quickAnalysisCta: string;
  };
  storeButtons: StoreButtonMessages;
  marketplace: {
    eyebrow: string;
    title: string;
    body: string;
    intro: string;
    audienceLabel: string;
    clientLabel: string;
    clientTitle: string;
    clientBody: string;
    professionalLabel: string;
    professionalTitle: string;
    professionalBody: string;
    browseCta: string;
    joinCta: string;
    snapshotLabel: string;
    snapshotTitle: string;
    snapshotBody: string;
    categoryAction: string;
    socialProof: string;
    socialProofFallback: string;
  };
  insights: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    readArticle: string;
  };
};

export type ProductPageMessages = {
  seo: SeoMessages;
  structuredDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    secondaryCta: string;
    tertiaryCta?: string;
    logoAlt: string;
  };
  storeButtons: StoreButtonMessages;
  demo?: {
    title: string;
    body: string;
    iframeTitle: string;
  };
  summaryCards: Array<{ label: string; title: string; body: string }>;
  overview: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    secondaryTitle: string;
    secondaryBody: string;
  };
  visual: {
    alt: string;
    title: string;
    body: string;
  };
  features: {
    eyebrow: string;
    title: string;
    cards: Array<{ title: string; body: string }>;
  };
  steps: {
    eyebrow: string;
    title: string;
    cards: Array<{ title: string; body: string }>;
  };
  callout: {
    label: string;
    title: string;
    body: string;
    firstCta?: string;
    secondCta?: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  final: {
    eyebrow: string;
    title: string;
  };
};

export type MarketplaceCategoryTranslation = {
  label: string;
  description: string;
};

export type MarketingMessages = {
  home: HomeMessages;
  products: {
    logbook: ProductPageMessages;
    stagelab: ProductPageMessages;
  };
  marketplaceCategories: Record<string, MarketplaceCategoryTranslation>;
};
