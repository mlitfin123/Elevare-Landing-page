export type StageLabLandingImage = {
  enabled: boolean;
  src: string;
  width: number;
  height: number;
};

export const STAGELAB_LANDING_MEDIA = {
  hero: {
    enabled: true,
    src: "/blog-posts/mens-physique-classic-physique-prep-1-week-out/recommendation.jpg",
    width: 591,
    height: 1280,
  },
  physiqueReview: {
    enabled: true,
    src: "/blog-posts/mens-physique-classic-physique-prep-4-weeks-out/recommendation-visual.png",
    width: 296,
    height: 640,
  },
  posingReview: {
    enabled: true,
    src: "/stagelab/posing-analysis-example.jpg",
    width: 591,
    height: 1280,
  },
  weeklyRecommendation: {
    enabled: true,
    src: "/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png",
    width: 296,
    height: 640,
  },
  coachDashboard: {
    enabled: true,
    src: "/stagelab/coach/coach-dashboard-review-queue.jpg",
    width: 592,
    height: 1280,
  },
  showDayPlan: {
    enabled: true,
    src: "/stagelab/product/show-day-planning.webp",
    width: 591,
    height: 1280,
  },
  progressComparison: {
    enabled: true,
    src: "/stagelab/product/progress-comparison.webp",
    width: 591,
    height: 1280,
  },
  athleteDashboard: {
    enabled: true,
    src: "/stagelab/product/athlete-dashboard.webp",
    width: 591,
    height: 1280,
  },
  demoVideo: {
    enabled: true,
    youtubeId: "uSHrNGqia-M",
    poster: "/stagelab/weekly-check-in-video-poster.webp",
    posterWidth: 405,
    posterHeight: 720,
  },
} as const;
