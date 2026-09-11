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

export type HomeMessages = {
  seo: SeoMessages;
  hero: { eyebrow: string; title: string; body: string; primary: string; secondary: string; browse: string };
  support: { title: string; steps: Array<{title: string; body: string}>; expectations: string; trust: string; trustLink: string };
  tools: { title: string; cards: Array<{title: string; body: string}> };
  apps: { title: string; eyebrow: string; logbook: string; stagelab: string; logbookCta: string; stagelabCta: string; logbookAlt: string; logbookCaption: string; stageAlt: string; stageCaption: string };
  professional: { title: string; body: string; cta: string };
  insights: { title: string; cta: string; readArticle: string; english: string };
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
