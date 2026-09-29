import type { Locale } from "./i18n/config.ts";

export type StageLabCoachStartMessages = {
  eyebrow: string;
  title: string;
  description: string;
  trialTitle: string;
  trialBody: string;
  athletesTitle: string;
  athletesBody: string;
  athleteProTitle: string;
  athleteProBody: string;
  screenshotsHeading: string;
  screenshotsDescription: string;
  screenshots: readonly { src: string; alt: string; caption: string }[];
  download: string;
  ios: string;
  android: string;
  storeGroup: string;
  nextStep: string;
  valueHeading: string;
  valueItems: readonly { title: string; body: string }[];
  howHeading: string;
  howItems: readonly { title: string; body: string }[];
  closingTitle: string;
  closingBody: string;
  closingTerms: string;
  disclaimer: string;
  more: string;
  privacy: string;
  coachAgreement: string;
  terms: string;
  support: string;
  footer: string;
  seoTitle: string;
  seoDescription: string;
};

export const stageLabCoachStartMessages = {
  en: {
    eyebrow: "STAGELAB FOR COACHES",
    title: "Coach your athletes with StageLab.",
    description: "Bring your athletes into one coaching workspace and keep their prep progress, check-ins, and next decisions in view.",
    trialTitle: "14-day free trial",
    trialBody: "Try Coach Pro and explore the coaching tools before you decide.",
    athletesTitle: "3 free athletes",
    athletesBody: "Start your Coach Pro account with three athletes included.",
    athleteProTitle: "Athlete Pro included",
    athleteProBody: "Every athlete you add to a Coach Pro account gets a free Athlete Pro account.",
    screenshotsHeading: "A closer look at Coach Pro",
    screenshotsDescription: "Review client priorities, check-ins, analytics, and StageLab recommendations from one coach workspace.",
    screenshots: [
      { src: "/stagelab/coach/coach-dashboard-review-queue.jpg", alt: "StageLab Coach Pro dashboard showing the client review queue", caption: "See review priorities at a glance." },
      { src: "/stagelab/coach/coach-analytics-portfolio.jpg", alt: "StageLab Coach Pro analytics screen showing portfolio signals", caption: "Spot review load and risk clusters." },
      { src: "/stagelab/coach/coach-activity-review-feed.jpg", alt: "StageLab Coach Pro activity screen showing pending check-ins", caption: "Keep recent check-ins and comments together." },
      { src: "/stagelab/coach/coach-client-training-review.jpg", alt: "StageLab Coach Pro client review screen showing training status", caption: "Review training status without editing workouts." },
      { src: "/stagelab/coach/coach-client-decision-review.jpg", alt: "StageLab Coach Pro client review screen showing a StageLab recommendation", caption: "Keep the next prep decision in view." },
      { src: "/stagelab/coach/coach-client-risk-queue.jpg", alt: "StageLab Coach Pro clients screen showing a client risk queue", caption: "Find clients who need closer attention." },
      { src: "/stagelab/coach/coach-client-summary-review.jpg", alt: "StageLab Coach Pro client summary screen showing progress signals", caption: "Start each review with the important context." },
      { src: "/stagelab/coach/coach-client-visual-checkins.jpg", alt: "StageLab Coach Pro client visual check-in screen", caption: "Review visual check-ins alongside progress." },
      { src: "/stagelab/coach/coach-client-adherence-review.jpg", alt: "StageLab Coach Pro client adherence screen", caption: "See the adherence signal behind the review." },
    ],
    download: "Start your free trial",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Choose where to start your StageLab trial",
    nextStep: "Download StageLab and start your Coach Pro trial in the app. Trial eligibility and activation are managed in the app.",
    valueHeading: "Built for the coach-athlete workflow",
    valueItems: [
      { title: "Keep prep work together", body: "Review the information your athletes share and keep their preparation organized in one coaching workspace." },
      { title: "Support more informed decisions", body: "Use check-ins, progress information, and the tools in StageLab to keep the next coaching decision in view." },
      { title: "Give athletes more support", body: "Athletes added to your Coach Pro account receive a free Athlete Pro account for their own StageLab experience." },
    ],
    howHeading: "How it works",
    howItems: [
      { title: "Download StageLab", body: "Choose the App Store or Google Play and create your account." },
      { title: "Start Coach Pro", body: "Begin the 14-day free trial in the StageLab app." },
      { title: "Add your athletes", body: "Build your coaching group with up to three free athletes to start." },
      { title: "Coach with StageLab", body: "Your added athletes receive Athlete Pro access as part of your Coach Pro account." },
    ],
    closingTitle: "Ready to coach with StageLab?",
    closingBody: "Start your Coach Pro trial and bring your athletes into the StageLab coaching workflow.",
    closingTerms: "The 14-day Coach Pro trial, included athletes, and Athlete Pro access are subject to the terms and eligibility shown in the StageLab app.",
    disclaimer: "StageLab is a preparation and progress support tool. It does not replace medical care or individualized professional judgment.",
    more: "About StageLab",
    privacy: "Privacy",
    coachAgreement: "Coach Agreement",
    terms: "Terms",
    support: "Support",
    footer: "StageLab by Elevare Fit LLC",
    seoTitle: "StageLab for Coaches | Coach Pro Free Trial",
    seoDescription: "Start a 14-day Coach Pro trial in StageLab, add three free athletes, and give every added athlete a free Athlete Pro account.",
  },
  "es-419": {
    eyebrow: "STAGELAB PARA ENTRENADORES",
    title: "Entrena a tus atletas con StageLab.",
    description: "Reúne a tus atletas en un espacio de coaching y mantén a la vista su progreso de preparación, seguimientos y próximas decisiones.",
    trialTitle: "Prueba gratis de 14 días",
    trialBody: "Prueba Coach Pro y explora las herramientas de coaching antes de decidir.",
    athletesTitle: "3 atletas gratis",
    athletesBody: "Comienza tu cuenta Coach Pro con tres atletas incluidos.",
    athleteProTitle: "Athlete Pro incluido",
    athleteProBody: "Cada atleta que agregues a una cuenta Coach Pro recibe una cuenta Athlete Pro gratis.",
    screenshotsHeading: "Conoce mejor Coach Pro",
    screenshotsDescription: "Revisa prioridades, check-ins, análisis y recomendaciones de StageLab desde un solo espacio para entrenadores.",
    screenshots: [
      { src: "/stagelab/coach/coach-dashboard-review-queue.jpg", alt: "Panel de StageLab Coach Pro con la cola de revisión de clientes", caption: "Consulta las prioridades de revisión de un vistazo." },
      { src: "/stagelab/coach/coach-analytics-portfolio.jpg", alt: "Pantalla de análisis de StageLab Coach Pro con señales del grupo de clientes", caption: "Detecta la carga de revisiones y los grupos de riesgo." },
      { src: "/stagelab/coach/coach-activity-review-feed.jpg", alt: "Actividad de StageLab Coach Pro con check-ins pendientes", caption: "Mantén juntos los check-ins y comentarios recientes." },
      { src: "/stagelab/coach/coach-client-training-review.jpg", alt: "Revisión de cliente en StageLab Coach Pro con el estado del entrenamiento", caption: "Revisa el estado del entrenamiento sin editar rutinas." },
      { src: "/stagelab/coach/coach-client-decision-review.jpg", alt: "Revisión de cliente en StageLab Coach Pro con una recomendación de StageLab", caption: "Mantén visible la próxima decisión de preparación." },
      { src: "/stagelab/coach/coach-client-risk-queue.jpg", alt: "Clientes de StageLab Coach Pro con una cola de riesgo", caption: "Encuentra a los clientes que necesitan más atención." },
      { src: "/stagelab/coach/coach-client-summary-review.jpg", alt: "Resumen de cliente en StageLab Coach Pro con señales de progreso", caption: "Comienza cada revisión con el contexto importante." },
      { src: "/stagelab/coach/coach-client-visual-checkins.jpg", alt: "Check-in visual de cliente en StageLab Coach Pro", caption: "Revisa los check-ins visuales junto al progreso." },
      { src: "/stagelab/coach/coach-client-adherence-review.jpg", alt: "Adherencia de cliente en StageLab Coach Pro", caption: "Consulta la señal de adherencia detrás de la revisión." },
    ],
    download: "Comenzar prueba gratis",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Elige dónde comenzar tu prueba de StageLab",
    nextStep: "Descarga StageLab y comienza tu prueba Coach Pro en la app. La elegibilidad y activación se gestionan en la app.",
    valueHeading: "Creado para el flujo entre entrenador y atleta",
    valueItems: [
      { title: "Mantén junta la preparación", body: "Revisa la información que comparten tus atletas y organiza su preparación en un solo espacio de coaching." },
      { title: "Decide con más información", body: "Usa seguimientos, información de progreso y las herramientas de StageLab para mantener a la vista la próxima decisión." },
      { title: "Ofrece más apoyo a tus atletas", body: "Los atletas que agregues a tu cuenta Coach Pro reciben una cuenta Athlete Pro gratis para su propia experiencia en StageLab." },
    ],
    howHeading: "Cómo funciona",
    howItems: [
      { title: "Descarga StageLab", body: "Elige App Store o Google Play y crea tu cuenta." },
      { title: "Comienza Coach Pro", body: "Inicia la prueba gratis de 14 días en la app de StageLab." },
      { title: "Agrega a tus atletas", body: "Crea tu grupo de coaching con hasta tres atletas gratis para comenzar." },
      { title: "Entrena con StageLab", body: "Tus atletas agregados reciben acceso Athlete Pro como parte de tu cuenta Coach Pro." },
    ],
    closingTitle: "¿Listo para entrenar con StageLab?",
    closingBody: "Comienza tu prueba Coach Pro y reúne a tus atletas en el flujo de coaching de StageLab.",
    closingTerms: "La prueba Coach Pro de 14 días, los atletas incluidos y el acceso Athlete Pro están sujetos a los términos y la elegibilidad que se muestran en la app de StageLab.",
    disclaimer: "StageLab es una herramienta de apoyo para la preparación y el progreso. No reemplaza la atención médica ni el criterio profesional individualizado.",
    more: "Acerca de StageLab",
    privacy: "Privacidad",
    coachAgreement: "Acuerdo del entrenador",
    terms: "Términos",
    support: "Soporte",
    footer: "StageLab de Elevare Fit LLC",
    seoTitle: "StageLab para entrenadores | Prueba Coach Pro",
    seoDescription: "Comienza una prueba Coach Pro de 14 días en StageLab, agrega tres atletas gratis y ofrece una cuenta Athlete Pro gratis a cada atleta agregado.",
  },
  "pt-BR": {
    eyebrow: "STAGELAB PARA TREINADORES",
    title: "Treine seus atletas com o StageLab.",
    description: "Reúna seus atletas em um espaço de coaching e mantenha à vista o progresso da preparação, os check-ins e as próximas decisões.",
    trialTitle: "Teste grátis de 14 dias",
    trialBody: "Experimente o Coach Pro e explore as ferramentas para treinadores antes de decidir.",
    athletesTitle: "3 atletas grátis",
    athletesBody: "Comece sua conta Coach Pro com três atletas incluídos.",
    athleteProTitle: "Athlete Pro incluído",
    athleteProBody: "Cada atleta adicionado a uma conta Coach Pro recebe uma conta Athlete Pro grátis.",
    screenshotsHeading: "Veja o Coach Pro de perto",
    screenshotsDescription: "Revise prioridades dos clientes, check-ins, análises e recomendações do StageLab em um único espaço para treinadores.",
    screenshots: [
      { src: "/stagelab/coach/coach-dashboard-review-queue.jpg", alt: "Painel do StageLab Coach Pro mostrando a fila de revisão de clientes", caption: "Veja as prioridades de revisão de uma só vez." },
      { src: "/stagelab/coach/coach-analytics-portfolio.jpg", alt: "Tela de análises do StageLab Coach Pro mostrando sinais do grupo de clientes", caption: "Identifique a carga de revisões e grupos de risco." },
      { src: "/stagelab/coach/coach-activity-review-feed.jpg", alt: "Atividade do StageLab Coach Pro mostrando check-ins pendentes", caption: "Mantenha check-ins e comentários recentes juntos." },
      { src: "/stagelab/coach/coach-client-training-review.jpg", alt: "Revisão de cliente no StageLab Coach Pro mostrando o status do treino", caption: "Revise o status do treino sem editar rotinas." },
      { src: "/stagelab/coach/coach-client-decision-review.jpg", alt: "Revisão de cliente no StageLab Coach Pro mostrando uma recomendação do StageLab", caption: "Mantenha a próxima decisão da preparação à vista." },
      { src: "/stagelab/coach/coach-client-risk-queue.jpg", alt: "Clientes do StageLab Coach Pro mostrando uma fila de risco", caption: "Encontre clientes que precisam de mais atenção." },
      { src: "/stagelab/coach/coach-client-summary-review.jpg", alt: "Resumo de cliente no StageLab Coach Pro mostrando sinais de progresso", caption: "Comece cada revisão com o contexto importante." },
      { src: "/stagelab/coach/coach-client-visual-checkins.jpg", alt: "Check-in visual de cliente no StageLab Coach Pro", caption: "Revise check-ins visuais junto com o progresso." },
      { src: "/stagelab/coach/coach-client-adherence-review.jpg", alt: "Tela de aderência de cliente no StageLab Coach Pro", caption: "Veja o sinal de aderência por trás da revisão." },
    ],
    download: "Começar teste grátis",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Escolha onde começar seu teste do StageLab",
    nextStep: "Baixe o StageLab e comece seu teste Coach Pro no app. A elegibilidade e a ativação são gerenciadas no app.",
    valueHeading: "Criado para o fluxo entre treinador e atleta",
    valueItems: [
      { title: "Mantenha a preparação em um só lugar", body: "Revise as informações compartilhadas pelos seus atletas e organize a preparação em um único espaço de coaching." },
      { title: "Apoie decisões mais informadas", body: "Use check-ins, informações de progresso e as ferramentas do StageLab para manter a próxima decisão à vista." },
      { title: "Ofereça mais suporte aos atletas", body: "Os atletas adicionados à sua conta Coach Pro recebem uma conta Athlete Pro grátis para a própria experiência no StageLab." },
    ],
    howHeading: "Como funciona",
    howItems: [
      { title: "Baixe o StageLab", body: "Escolha a App Store ou o Google Play e crie sua conta." },
      { title: "Comece o Coach Pro", body: "Inicie o teste grátis de 14 dias no app StageLab." },
      { title: "Adicione seus atletas", body: "Monte seu grupo de coaching com até três atletas grátis para começar." },
      { title: "Treine com o StageLab", body: "Seus atletas adicionados recebem acesso Athlete Pro como parte da sua conta Coach Pro." },
    ],
    closingTitle: "Pronto para treinar com o StageLab?",
    closingBody: "Comece seu teste Coach Pro e reúna seus atletas no fluxo de coaching do StageLab.",
    closingTerms: "O teste Coach Pro de 14 dias, os atletas incluídos e o acesso Athlete Pro estão sujeitos aos termos e à elegibilidade mostrados no app StageLab.",
    disclaimer: "O StageLab é uma ferramenta de apoio à preparação e ao progresso. Ele não substitui cuidados médicos nem o julgamento profissional individualizado.",
    more: "Sobre o StageLab",
    privacy: "Privacidade",
    coachAgreement: "Acordo do treinador",
    terms: "Termos",
    support: "Suporte",
    footer: "StageLab da Elevare Fit LLC",
    seoTitle: "StageLab para treinadores | Teste Coach Pro",
    seoDescription: "Comece um teste Coach Pro de 14 dias no StageLab, adicione três atletas grátis e ofereça uma conta Athlete Pro grátis a cada atleta adicionado.",
  },
} as const satisfies Record<Locale, StageLabCoachStartMessages>;
