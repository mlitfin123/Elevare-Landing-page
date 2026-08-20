type ContentDisclaimerProps = {
  kind: "estimate" | "training" | "article";
};

const disclaimerContent = {
  estimate: {
    label: "Estimate disclaimer",
    message:
      "Estimates are provided for informational and educational purposes only and may not reflect your individual needs or actual body composition. They are not medical advice.",
  },
  training: {
    label: "Training disclaimer",
    message:
      "Exercise involves risk of injury. Use appropriate technique, equipment, and judgment, and choose activities appropriate for your abilities. This content is for general informational purposes and is not medical advice.",
  },
  article: {
    label: "Content disclaimer",
    message:
      "ElevareFit content is provided for general informational and educational purposes and is not medical, dietetic, or other professional healthcare advice.",
  },
} as const;

export function ContentDisclaimer({ kind }: ContentDisclaimerProps) {
  const content = disclaimerContent[kind];

  return (
    <aside className="callout tool-disclaimer-card" aria-label={content.label}>
      <span className="meta-pill">Disclaimer</span>
      <p>{content.message}</p>
    </aside>
  );
}

export function EstimateDisclaimer() {
  return <ContentDisclaimer kind="estimate" />;
}

export function TrainingDisclaimer() {
  return <ContentDisclaimer kind="training" />;
}

export function ArticleDisclaimer() {
  return <ContentDisclaimer kind="article" />;
}
