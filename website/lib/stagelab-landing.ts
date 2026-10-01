import type { Locale } from "./i18n/config.ts";

export const STAGELAB_LANDING_FEATURES = [
  "progress",
  "posing",
  "recommendations",
  "daily",
  "roadmap",
  "coaches",
] as const;

type FeatureKey = (typeof STAGELAB_LANDING_FEATURES)[number];

export type StageLabLandingMessages = {
  structuredDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    support: string;
    logoAlt: string;
    navLabel: string;
    reportLink: string;
    demoLink: string;
    mediaAlt: string;
    mediaCaption: string;
  };
  storeButtons: { ios: string; android: string };
  demo: {
    eyebrow: string;
    title: string;
    body: string;
    videoTitle: string;
    videoBody: string;
    playLabel: string;
    iframeTitle: string;
    languageNote: string;
    openImage: string;
    images: Record<"physiqueReview" | "posingReview" | "weeklyRecommendation", {
      alt: string;
      title: string;
      caption: string;
    }>;
  };
  benefits: {
    eyebrow: string;
    title: string;
    intro: string;
    access: string;
    items: Record<FeatureKey, { label: string; title: string; body: string }>;
    coachCta: string;
    coachMediaAlt: string;
    coachMediaCaption: string;
    showDayMediaAlt: string;
    showDayMediaCaption: string;
    progressMediaAlt: string;
    progressMediaCaption: string;
    athleteDashboardMediaAlt: string;
    athleteDashboardMediaCaption: string;
  };
  reportsLinkLabel: string;
  faq: {
    eyebrow: string;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  final: {
    eyebrow: string;
    title: string;
    body: string;
    access: string;
  };
};

export const stageLabLandingMessages: Record<Locale, StageLabLandingMessages> = {
  en: {
    structuredDescription: "Competition prep, physique progress, posing feedback, daily tracking, and explained weekly plan recommendations for physique athletes and prep coaches.",
    hero: {
      eyebrow: "StageLab competition prep",
      title: "Your competition prep, physique progress, and posing—in one place.",
      body: "Follow your prep plan, compare physique check-ins, and work on your presentation with StageLab. Keep nutrition, cardio, recovery, and progress together from offseason through show day.",
      support: "Built for competitive physique athletes and prep coaches.",
      logoAlt: "StageLab Competition Prep app logo",
      navLabel: "StageLab page sections",
      reportLink: "View one-time website reports",
      demoLink: "See StageLab in action",
      mediaAlt: "StageLab peak-week day-by-day plan shown in the English app interface",
      mediaCaption: "Peak-week planning · screenshot in English",
    },
    storeButtons: { ios: "Download on the App Store", android: "Get it on Google Play" },
    demo: {
      eyebrow: "Real product screens",
      title: "See StageLab in action",
      body: "These are current StageLab screens from a competition-prep workflow. The demo video and interface screenshots shown here are in English.",
      videoTitle: "From check-in to weekly recommendation",
      videoBody: "A 23-second walkthrough of StageLab reviewing a check-in, recommending a prep adjustment, and explaining the change.",
      playLabel: "Play the StageLab weekly check-in demo",
      iframeTitle: "StageLab weekly check-in demonstration",
      languageNote: "English interface",
      openImage: "Open full screenshot",
      images: {
        physiqueReview: {
          alt: "StageLab physique review showing visible strengths, missing markers, and presentation notes in English",
          title: "Physique review",
          caption: "Review visible strengths, missing markers, and presentation notes.",
        },
        posingReview: {
          alt: "StageLab posing analysis showing a posing score and practice corrections in English",
          title: "Posing feedback",
          caption: "Take division-specific corrections into posing practice.",
        },
        weeklyRecommendation: {
          alt: "StageLab weekly recommendation showing a proposed cardio adjustment and its reasons in English",
          title: "Weekly recommendation",
          caption: "See the proposed change, current plan, and reasons together.",
        },
      },
    },
    benefits: {
      eyebrow: "Built around the work of prep",
      title: "Follow the whole road to the stage.",
      intro: "StageLab connects what you do each day with what you review at check-in, while keeping AI assistance clear and each decision open to review.",
      access: "Basic tracking is available free. AI analysis, automated weekly recommendations, advanced history, Peak Week, post-show guidance, and coach tools require the applicable paid access. Current availability and trial eligibility are shown in the app.",
      items: {
        progress: {
          label: "AI-assisted progress review",
          title: "See what’s changing.",
          body: "Compare physique check-ins and follow bodyweight and waist trends across prep. When enough comparable history exists, StageLab can add AI-assisted observations about visible changes. Those observations can be incomplete and should be reviewed with the rest of your data.",
        },
        posing: {
          label: "Pro feature · AI-assisted",
          title: "Know what to practice.",
          body: "Upload a short posing video for division-specific feedback on execution and presentation. Review detected poses, strengths, and corrections you can take into practice. Posing feedback is informational and remains separate from physique readiness.",
        },
        recommendations: {
          label: "Athlete Pro",
          title: "Review your next steps.",
          body: "Personalized weekly recommendations use check-ins, adherence, recovery, phase, and plan history to suggest holding or adjusting supported plan variables. Review the reasons and confidence before applying a change.",
        },
        daily: {
          label: "Daily tracking",
          title: "Keep the daily work together.",
          body: "Keep calories, macros, cardio, steps, training completion, bodyweight, sleep, energy, hunger, and fatigue in one prep record so each check-in has useful context.",
        },
        roadmap: {
          label: "From offseason through post-show",
          title: "Organize the road to show day.",
          body: "Set your division and competition timeline, keep offseason and contest-prep records, use dedicated Peak Week planning, and organize planned meal blocks for pre-judging, between rounds, and post-show. Continue into post-show guidance without automating dehydration, water cuts, sodium manipulation, or diuretic use.",
        },
        coaches: {
          label: "Coach Pro",
          title: "Built for prep coaches, too.",
          body: "Use a client dashboard, check-in review, follow-up priorities, StageLab recommendations, invitations, and client management in one workspace. Coaches retain responsibility for their decisions and client relationships.",
        },
      },
      coachCta: "Explore StageLab for coaches",
      coachMediaAlt: "StageLab Coach Pro dashboard showing a client review queue in the English interface",
      coachMediaCaption: "Coach dashboard and review priorities · screenshot in English",
      showDayMediaAlt: "StageLab Show Day plan showing pre-judging, between-round, and post-show meal blocks in the English interface",
      showDayMediaCaption: "Show Day meal-block planning · screenshot in English",
      progressMediaAlt: "StageLab side-by-side progress comparison showing cycle-baseline and Peak Week check-in photos in the English interface",
      progressMediaCaption: "Cycle baseline compared with a Peak Week check-in · screenshot in English",
      athleteDashboardMediaAlt: "StageLab athlete dashboard showing Peak Week status, daily targets, morning check-in, cardio, steps, and competition timeline in the English interface",
      athleteDashboardMediaCaption: "Athlete dashboard with today’s plan and competition timeline · screenshot in English",
    },
    reportsLinkLabel: "One-time website reports",
    faq: {
      eyebrow: "Frequently asked questions",
      title: "StageLab questions",
      items: [
        { question: "Who is StageLab built for?", answer: "StageLab is built for competitive physique athletes and prep coaches who want check-ins, progress, posing, daily prep records, and plan review in one place." },
        { question: "Does StageLab replace a contest prep coach?", answer: "No. StageLab organizes data and provides AI-assisted informational outputs. Athletes and coaches remain responsible for decisions and should seek qualified medical or professional guidance when appropriate." },
        { question: "Which features require paid access?", answer: "Basic tracking is available free. AI analysis, automated weekly recommendations, advanced history, Peak Week, post-show guidance, and coach tools require the applicable Pro access. Current plan details and trial eligibility are shown in the app." },
        { question: "Are the one-time website reports part of the app subscription?", answer: "No. The physique, posing, and combined website reports are separate one-time purchases. They do not include an app subscription, ongoing coaching, or future app analyses." },
        { question: "Are StageLab recommendations guaranteed to be accurate?", answer: "No. Recommendations and visual observations may be incomplete or inaccurate. They support review and planning and do not guarantee stage readiness, health outcomes, physique results, judging scores, or competition placement." },
        { question: "Where can I download StageLab?", answer: "StageLab is available on the Apple App Store and Google Play for supported iOS and Android devices." },
      ],
    },
    final: {
      eyebrow: "Competition prep in one place",
      title: "Keep your plan, physique progress, and posing connected.",
      body: "Download StageLab to keep the work between check-ins connected to the decisions you make next.",
      access: "Basic tracking is free. Paid features, subscription terms, and trial eligibility are shown in the app.",
    },
  },
  "es-419": {
    structuredDescription: "Preparación para competir, progreso físico, análisis de poses, seguimiento diario y recomendaciones semanales explicadas para atletas de físico y coaches de preparación.",
    hero: {
      eyebrow: "Preparación para competir con StageLab",
      title: "Tu preparación para competir, tu progreso físico y tus poses, todo en un solo lugar.",
      body: "Sigue tu plan de preparación, compara tus check-ins físicos y trabaja tu presentación con StageLab. Mantén juntos nutrición, cardio, recuperación y progreso desde la fase fuera de temporada hasta el día de la competencia.",
      support: "Creado para atletas de físico competitivo y coaches de preparación.",
      logoAlt: "Logo de la app StageLab Competition Prep",
      navLabel: "Secciones de la página de StageLab",
      reportLink: "Ver informes de pago único en el sitio",
      demoLink: "Ver StageLab en acción",
      mediaAlt: "Plan diario de la semana pico de StageLab en la interfaz de la app en inglés",
      mediaCaption: "Planificación de la semana pico · captura en inglés",
    },
    storeButtons: { ios: "Descargar en App Store", android: "Obtener en Google Play" },
    demo: {
      eyebrow: "Pantallas reales del producto",
      title: "Ver StageLab en acción",
      body: "Estas son pantallas actuales de StageLab dentro de un proceso de preparación para competir. El video y las capturas de la interfaz están en inglés.",
      videoTitle: "Del check-in a la recomendación semanal",
      videoBody: "Un recorrido de 23 segundos por la revisión de un check-in, la recomendación de un ajuste y la explicación del cambio.",
      playLabel: "Reproducir la demostración del check-in semanal de StageLab",
      iframeTitle: "Demostración del check-in semanal de StageLab",
      languageNote: "Interfaz en inglés",
      openImage: "Abrir captura completa",
      images: {
        physiqueReview: {
          alt: "Revisión de físico de StageLab con fortalezas visibles, marcadores faltantes y notas de presentación en inglés",
          title: "Revisión del físico",
          caption: "Revisa fortalezas visibles, marcadores faltantes y notas de presentación.",
        },
        posingReview: {
          alt: "Análisis de poses de StageLab con una puntuación y correcciones de práctica en inglés",
          title: "Comentarios sobre las poses",
          caption: "Lleva correcciones específicas de tu categoría a la práctica.",
        },
        weeklyRecommendation: {
          alt: "Recomendación semanal de StageLab con un ajuste de cardio propuesto y sus razones en inglés",
          title: "Recomendación semanal",
          caption: "Consulta juntos el cambio propuesto, el plan actual y sus razones.",
        },
      },
    },
    benefits: {
      eyebrow: "Creado alrededor del trabajo de preparación",
      title: "Sigue todo el camino hacia el escenario.",
      intro: "StageLab conecta lo que haces cada día con lo que revisas en el check-in, identifica con claridad la asistencia de IA y permite revisar cada decisión.",
      access: "El seguimiento básico es gratis. Los análisis de IA, las recomendaciones semanales automatizadas, el historial avanzado, la semana pico, la orientación postcompetencia y las herramientas para coaches requieren el acceso de pago correspondiente. La disponibilidad actual y la elegibilidad para pruebas se muestran en la app.",
      items: {
        progress: {
          label: "Revisión del progreso asistida por IA",
          title: "Mira qué está cambiando.",
          body: "Compara check-ins físicos y sigue las tendencias de peso y cintura durante la preparación. Cuando existe suficiente historial comparable, StageLab puede añadir observaciones asistidas por IA sobre cambios visibles. Pueden ser incompletas y deben revisarse junto con el resto de tus datos.",
        },
        posing: {
          label: "Función Pro · asistida por IA",
          title: "Sabe qué practicar.",
          body: "Sube un video corto para recibir comentarios específicos de tu categoría sobre ejecución y presentación. Revisa poses detectadas, fortalezas y correcciones para practicar. Los comentarios son informativos y permanecen separados de la preparación física para el escenario.",
        },
        recommendations: {
          label: "Athlete Pro",
          title: "Revisa tus próximos pasos.",
          body: "Las recomendaciones semanales personalizadas usan check-ins, adherencia, recuperación, fase e historial del plan para sugerir mantener o ajustar las variables compatibles. Revisa las razones y la confianza antes de aplicar un cambio.",
        },
        daily: {
          label: "Seguimiento diario",
          title: "Mantén unido el trabajo diario.",
          body: "Mantén calorías, macros, cardio, pasos, entrenamiento completado, peso corporal, sueño, energía, hambre y fatiga en un solo registro para dar contexto a cada check-in.",
        },
        roadmap: {
          label: "De la fase fuera de temporada al post-show",
          title: "Organiza el camino hacia el día de la competencia.",
          body: "Define tu categoría y cronograma, conserva registros de offseason y preparación, usa la planificación específica de la semana pico y organiza bloques de comidas planificados para antes del prejuzgamiento, entre rondas y después de la competencia. Continúa con orientación postcompetencia sin automatizar deshidratación, cortes de agua, manipulación de sodio ni diuréticos.",
        },
        coaches: {
          label: "Coach Pro",
          title: "Creado también para coaches de preparación.",
          body: "Usa en un solo espacio el panel de clientes, la revisión de check-ins, las prioridades de seguimiento, las recomendaciones de StageLab, las invitaciones y la gestión de clientes. Los coaches conservan la responsabilidad por sus decisiones y relaciones con clientes.",
        },
      },
      coachCta: "Explorar StageLab para coaches",
      coachMediaAlt: "Panel de StageLab Coach Pro con una cola de revisión de clientes en la interfaz en inglés",
      coachMediaCaption: "Panel del coach y prioridades de revisión · captura en inglés",
      showDayMediaAlt: "Plan de StageLab para el día de la competencia con bloques de comidas antes del prejuzgamiento, entre rondas y después de la competencia en la interfaz en inglés",
      showDayMediaCaption: "Planificación de comidas para el día de la competencia · captura en inglés",
      progressMediaAlt: "Comparación de progreso lado a lado de StageLab con fotos del inicio del ciclo y un check-in de la semana pico en la interfaz en inglés",
      progressMediaCaption: "Inicio del ciclo comparado con un check-in de la semana pico · captura en inglés",
      athleteDashboardMediaAlt: "Panel del atleta de StageLab con el estado de la semana pico, objetivos diarios, check-in matutino, cardio, pasos y cronograma de competencia en la interfaz en inglés",
      athleteDashboardMediaCaption: "Panel del atleta con el plan de hoy y el cronograma de competencia · captura en inglés",
    },
    reportsLinkLabel: "Informes de pago único en el sitio",
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Preguntas sobre StageLab",
      items: [
        { question: "¿Para quién está creado StageLab?", answer: "StageLab está creado para atletas de físico competitivo y coaches de preparación que quieren mantener check-ins, progreso, poses, registros diarios y revisión del plan en un solo lugar." },
        { question: "¿StageLab reemplaza a un coach de preparación?", answer: "No. StageLab organiza datos y ofrece resultados informativos asistidos por IA. Atletas y coaches siguen siendo responsables de sus decisiones y deben buscar orientación médica o profesional calificada cuando corresponda." },
        { question: "¿Qué funciones requieren acceso de pago?", answer: "El seguimiento básico es gratis. Los análisis de IA, las recomendaciones semanales automatizadas, el historial avanzado, la semana pico, la orientación postcompetencia y las herramientas para coaches requieren el acceso Pro correspondiente. Los planes actuales y la elegibilidad para pruebas se muestran en la app." },
        { question: "¿Los informes de pago único forman parte de la suscripción de la app?", answer: "No. Los informes de físico, poses y análisis combinado del sitio son compras separadas de pago único. No incluyen suscripción a la app, coaching continuo ni futuros análisis dentro de la app." },
        { question: "¿Las recomendaciones de StageLab siempre son precisas?", answer: "No. Las recomendaciones y observaciones visuales pueden ser incompletas o inexactas. Apoyan la revisión y la planificación, y no garantizan preparación para el escenario, resultados de salud o físico, puntuaciones oficiales ni posición en competencia." },
        { question: "¿Dónde puedo descargar StageLab?", answer: "StageLab está disponible en Apple App Store y Google Play para dispositivos iOS y Android compatibles." },
      ],
    },
    final: {
      eyebrow: "Preparación para competir en un solo lugar",
      title: "Mantén conectados tu plan, tu progreso físico y tus poses.",
      body: "Descarga StageLab para conectar el trabajo entre check-ins con las decisiones que tomes después.",
      access: "El seguimiento básico es gratis. Las funciones de pago, los términos de suscripción y la elegibilidad para pruebas se muestran en la app.",
    },
  },
  "pt-BR": {
    structuredDescription: "Preparação para competições, evolução física, análise de poses, acompanhamento diário e recomendações semanais explicadas para atletas de físico e coaches de preparação.",
    hero: {
      eyebrow: "Preparação para competições com o StageLab",
      title: "Sua preparação para competições, sua evolução física e suas poses em um só lugar.",
      body: "Acompanhe seu plano de preparação, compare check-ins do físico e trabalhe sua apresentação com o StageLab. Mantenha nutrição, cardio, recuperação e progresso juntos da fase fora de temporada ao dia da competição.",
      support: "Feito para atletas de físico competitivo e coaches de preparação.",
      logoAlt: "Logo do app StageLab Competition Prep",
      navLabel: "Seções da página do StageLab",
      reportLink: "Ver relatórios avulsos no site",
      demoLink: "Ver o StageLab em ação",
      mediaAlt: "Plano diário da semana de pico do StageLab na interface do app em inglês",
      mediaCaption: "Planejamento da semana de pico · captura em inglês",
    },
    storeButtons: { ios: "Baixar na App Store", android: "Disponível no Google Play" },
    demo: {
      eyebrow: "Telas reais do produto",
      title: "Ver o StageLab em ação",
      body: "Estas são telas atuais do StageLab em um fluxo de preparação para competições. O vídeo e as capturas da interface estão em inglês.",
      videoTitle: "Do check-in à recomendação semanal",
      videoBody: "Uma demonstração de 23 segundos da revisão de um check-in, da recomendação de um ajuste e da explicação da mudança.",
      playLabel: "Reproduzir a demonstração do check-in semanal do StageLab",
      iframeTitle: "Demonstração do check-in semanal do StageLab",
      languageNote: "Interface em inglês",
      openImage: "Abrir captura completa",
      images: {
        physiqueReview: {
          alt: "Revisão de físico do StageLab com pontos fortes visíveis, marcadores ausentes e notas de apresentação em inglês",
          title: "Revisão do físico",
          caption: "Revise pontos fortes visíveis, marcadores ausentes e notas de apresentação.",
        },
        posingReview: {
          alt: "Análise de poses do StageLab com uma pontuação e correções para praticar em inglês",
          title: "Feedback de poses",
          caption: "Leve correções específicas da sua categoria para a prática.",
        },
        weeklyRecommendation: {
          alt: "Recomendação semanal do StageLab com um ajuste de cardio proposto e os motivos em inglês",
          title: "Recomendação semanal",
          caption: "Veja a mudança proposta, o plano atual e os motivos juntos.",
        },
      },
    },
    benefits: {
      eyebrow: "Feito em torno do trabalho da preparação",
      title: "Acompanhe todo o caminho até o palco.",
      intro: "O StageLab conecta o que você faz todos os dias ao que revisa no check-in, deixa claro quando há auxílio de IA e mantém cada decisão aberta à revisão.",
      access: "O acompanhamento básico é grátis. Análises com IA, recomendações semanais automatizadas, histórico avançado, semana de pico, orientação pós-show e ferramentas para coaches exigem o acesso pago correspondente. A disponibilidade atual e a elegibilidade para testes aparecem no app.",
      items: {
        progress: {
          label: "Revisão da evolução com auxílio de IA",
          title: "Veja o que está mudando.",
          body: "Compare check-ins do físico e acompanhe tendências de peso e cintura ao longo da preparação. Quando há histórico comparável suficiente, o StageLab pode acrescentar observações com auxílio de IA sobre mudanças visíveis. Elas podem ser incompletas e devem ser revisadas com o restante dos dados.",
        },
        posing: {
          label: "Recurso Pro · com auxílio de IA",
          title: "Saiba o que praticar.",
          body: "Envie um vídeo curto para receber feedback específico da categoria sobre execução e apresentação. Revise poses detectadas, pontos fortes e correções para praticar. O feedback é informativo e permanece separado da prontidão do físico para o palco.",
        },
        recommendations: {
          label: "Athlete Pro",
          title: "Revise seus próximos passos.",
          body: "Recomendações semanais personalizadas usam check-ins, adesão, recuperação, fase e histórico do plano para sugerir manter ou ajustar variáveis compatíveis. Revise os motivos e a confiança antes de aplicar uma mudança.",
        },
        daily: {
          label: "Acompanhamento diário",
          title: "Mantenha o trabalho diário reunido.",
          body: "Mantenha calorias, macros, cardio, passos, conclusão do treino, peso corporal, sono, energia, fome e fadiga em um único registro para dar contexto a cada check-in.",
        },
        roadmap: {
          label: "Da fase fora de temporada ao pós-show",
          title: "Organize o caminho até o dia da competição.",
          body: "Defina sua categoria e cronograma, mantenha registros de offseason e preparação, use o planejamento específico da semana de pico e organize blocos de refeições planejados para antes do pré-julgamento, entre as rodadas e depois do show. Continue com orientação pós-show sem automatizar desidratação, cortes de água, manipulação de sódio ou uso de diuréticos.",
        },
        coaches: {
          label: "Coach Pro",
          title: "Feito também para coaches de preparação.",
          body: "Use em um só espaço o painel de clientes, a revisão de check-ins, as prioridades de acompanhamento, as recomendações do StageLab, os convites e a gestão de clientes. Os coaches continuam responsáveis por suas decisões e relações com clientes.",
        },
      },
      coachCta: "Conhecer o StageLab para coaches",
      coachMediaAlt: "Painel do StageLab Coach Pro com uma fila de revisão de clientes na interface em inglês",
      coachMediaCaption: "Painel do coach e prioridades de revisão · captura em inglês",
      showDayMediaAlt: "Plano do StageLab para o dia da competição com blocos de refeições antes do pré-julgamento, entre as rodadas e depois do show na interface em inglês",
      showDayMediaCaption: "Planejamento de refeições para o dia da competição · captura em inglês",
      progressMediaAlt: "Comparação lado a lado da evolução no StageLab com fotos do início do ciclo e de um check-in da semana de pico na interface em inglês",
      progressMediaCaption: "Início do ciclo comparado com um check-in da semana de pico · captura em inglês",
      athleteDashboardMediaAlt: "Painel do atleta no StageLab com status da semana de pico, metas diárias, check-in da manhã, cardio, passos e cronograma da competição na interface em inglês",
      athleteDashboardMediaCaption: "Painel do atleta com o plano de hoje e o cronograma da competição · captura em inglês",
    },
    reportsLinkLabel: "Relatórios avulsos no site",
    faq: {
      eyebrow: "Perguntas frequentes",
      title: "Perguntas sobre o StageLab",
      items: [
        { question: "Para quem o StageLab foi feito?", answer: "O StageLab foi feito para atletas de físico competitivo e coaches de preparação que querem reunir check-ins, evolução, poses, registros diários e revisão do plano em um só lugar." },
        { question: "O StageLab substitui um coach de preparação?", answer: "Não. O StageLab organiza dados e oferece resultados informativos com auxílio de IA. Atletas e coaches continuam responsáveis por suas decisões e devem buscar orientação médica ou profissional qualificada quando apropriado." },
        { question: "Quais recursos exigem acesso pago?", answer: "O acompanhamento básico é grátis. Análises com IA, recomendações semanais automatizadas, histórico avançado, semana de pico, orientação pós-show e ferramentas para coaches exigem o acesso Pro correspondente. Os planos atuais e a elegibilidade para testes aparecem no app." },
        { question: "Os relatórios avulsos do site fazem parte da assinatura do app?", answer: "Não. Os relatórios de físico, poses e análise combinada do site são compras avulsas e separadas. Eles não incluem assinatura do app, acompanhamento contínuo nem análises futuras no app." },
        { question: "As recomendações do StageLab têm precisão garantida?", answer: "Não. Recomendações e observações visuais podem ser incompletas ou imprecisas. Elas apoiam revisão e planejamento e não garantem prontidão para o palco, resultados de saúde ou físico, notas oficiais nem colocação em competições." },
        { question: "Onde posso baixar o StageLab?", answer: "O StageLab está disponível na Apple App Store e no Google Play para dispositivos iOS e Android compatíveis." },
      ],
    },
    final: {
      eyebrow: "Preparação para competições em um só lugar",
      title: "Mantenha seu plano, sua evolução física e suas poses conectados.",
      body: "Baixe o StageLab para conectar o trabalho entre check-ins às próximas decisões.",
      access: "O acompanhamento básico é grátis. Recursos pagos, termos da assinatura e elegibilidade para testes aparecem no app.",
    },
  },
};

export function getStageLabLandingMessages(locale: Locale) {
  return stageLabLandingMessages[locale] ?? stageLabLandingMessages.en;
}
