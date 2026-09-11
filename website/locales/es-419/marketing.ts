import type { MarketingMessages } from "@/lib/i18n/marketing-types";

const messages = {
  home: {
  "seo": {
    "title": "Elevare | Apoyo profesional, recursos gratis y apps",
    "description": "Encuentra apoyo profesional, explora recursos gratuitos de fitness y descubre Logbook, los análisis con IA de StageLab y la tienda Elevare."
  },
  "hero": {
    "eyebrow": "ElevareFit",
    "title": "Encuentra el apoyo adecuado para tus objetivos.",
    "body": "Explora profesionales de fitness, recursos gratuitos de entrenamiento y apps que te ayudan a dar el siguiente paso.",
    "primary": "Ayúdame a encontrar un profesional",
    "secondary": "Explorar herramientas gratis",
    "browse": "Explorar profesionales"
  },
  "support": {
    "title": "Orientación para dar el siguiente paso.",
    "steps": [
      {
        "title": "Cuéntanos qué necesitas",
        "body": "Explora profesionales o dile a Elevare qué tipo de apoyo buscas."
      },
      {
        "title": "Explora tus opciones",
        "body": "Revisa opciones adecuadas cuando estén disponibles o pide ayuda para encontrar a alguien."
      },
      {
        "title": "Inicia una conversación",
        "body": "Envía una solicitud de consulta para conectar con un profesional."
      }
    ],
    "expectations": "La disponibilidad varía y no se garantiza una coincidencia. Una solicitud de consulta no es una reserva confirmada.",
    "trust": "La revisión del perfil y la verificación de credenciales son diferentes. Consulta la información de confianza específica de cada perfil.",
    "trustLink": "Confianza y seguridad"
  },
  "tools": {
    "title": "Recursos gratis para tu siguiente paso.",
    "cards": [
      {
        "title": "Calculadoras",
        "body": "Planifica calorías, macros y objetivos de entrenamiento."
      },
      {
        "title": "Planes y plantillas de entrenamiento",
        "body": "Encuentra una estructura que se adapte a tu semana."
      },
      {
        "title": "Guías de ejercicios",
        "body": "Explora movimientos por músculo y equipo."
      },
      {
        "title": "Nutrición de restaurantes",
        "body": "Compara información nutricional al comer fuera."
      }
    ]
  },
  "apps": {
    "title": "Mantén tu progreso a la vista.",
    "eyebrow": "Apps de Elevare",
    "logbook": "Registra entrenamientos, comida, peso corporal y progreso en un solo lugar.",
    "stagelab": "Organiza tu preparación para competir, controles semanales y revisiones de progreso.",
    "logbookCta": "Explorar Logbook",
    "stagelabCta": "Explorar StageLab",
    "logbookAlt": "Pantalla de registro de alimentos de Logbook con búsqueda, comidas guardadas y escaneo de códigos de barras",
    "logbookCaption": "Pantalla de la app Logbook · Inglés",
    "stageAlt": "Pantalla de la app StageLab con una recomendación de plan semanal",
    "stageCaption": "Pantalla de la app StageLab · Inglés"
  },
  "professional": {
    "title": "Ofrece tus servicios a través de Elevare.",
    "body": "Crea un perfil, agrega tus servicios y envíalo a revisión para que los clientes puedan descubrir tu trabajo y solicitar una consulta.",
    "cta": "Crear tu perfil profesional"
  },
  "insights": {
    "title": "Sigue aprendiendo entre entrenamientos.",
    "cta": "Explorar el blog",
    "readArticle": "Leer artículo",
    "english": "Artículos en inglés"
  }
},
  products: {
    logbook: {
      seo: {
        title: "Logbook: app gratuita para registrar entrenamientos y fitness",
        description: "Registra entrenamientos, nutrición, macros, peso corporal y progreso con Logbook, disponible gratis para iOS y Android.",
      },
      structuredDescription: "Una app gratuita para registrar entrenamientos, nutrición, peso corporal y progreso físico.",
      hero: {
        eyebrow: "App de seguimiento Logbook",
        title: "Registra entrenamientos, nutrición y progreso sin complicaciones.",
        body: "Registra entrenamiento, alimentos, macros, peso corporal y progreso en un diario. Usa el historial para comparar sesiones, objetivos nutricionales y cambios de peso con el tiempo.",
        secondaryCta: "Explorar calculadoras gratuitas",
        logoAlt: "Logo de la app de seguimiento Logbook",
      },
      storeButtons: { ios: "Descargar en App Store", android: "Disponible en Google Play" },
      demo: {
        title: "Mira Logbook en acción",
        body: "Descubre cómo Logbook te ayuda a registrar tu nutrición, crear rutinas, anotar tus entrenamientos y seguir tu progreso.",
        iframeTitle: "Demostración de la app de seguimiento físico Logbook",
      },
      summaryCards: [
        { label: "Entrenamientos", title: "Mantén un historial de entrenamiento confiable", body: "Registra ejercicios, series, repeticiones y rendimiento para que cada sesión tenga el contexto de la anterior." },
        { label: "Nutrición", title: "Consulta calorías y macros con claridad", body: "Registra alimentos y compara calorías, proteína, carbohidratos y grasa con los objetivos que intentas seguir." },
        { label: "Disponibilidad", title: "Disponible en iOS y Android", body: "Descarga Logbook desde App Store o Google Play y lleva tu registro de entrenamiento contigo." },
      ],
      overview: {
        eyebrow: "Un registro de fitness sencillo",
        title: "Revisa tu historial antes de cambiar el plan.",
        paragraphs: [
          "El entrenamiento y la nutrición son difíciles de evaluar de memoria. Logbook guarda ejercicios, series, repeticiones, alimentos, macros y peso corporal para comparar tus resultados actuales con días y sesiones anteriores.",
          "El registro no tiene que ser perfecto para ser útil. Las entradas constantes muestran dónde progresó el entrenamiento, dónde la nutrición no alcanzó el objetivo y cómo cambió el peso corporal.",
        ],
        secondaryTitle: "Sigue tu peso corporal y progreso con el tiempo",
        secondaryBody: "El peso diario puede variar por motivos que tienen poco que ver con la grasa corporal. Un registro más largo ayuda a enfocarte en la tendencia. Logbook conecta esa evolución con los entrenamientos y hábitos nutricionales que la influyen.",
      },
      visual: {
        alt: "Ilustración de objetivos de calorías, una comida equilibrada y una pantalla de seguimiento físico",
        title: "Las calorías son un punto de partida, no un veredicto",
        body: "Usa un registro constante para comparar el plan con lo que ocurre con el tiempo.",
      },
      features: {
        eyebrow: "Lo que puedes registrar",
        title: "Registra el trabajo que ya estás haciendo.",
        cards: [
          { title: "Entrenamientos y ejercicios", body: "Organiza tus sesiones y revisa el rendimiento anterior antes de repetir un movimiento." },
          { title: "Alimentos, calorías y macros", body: "Conoce mejor tu consumo sin asumir que un alimento saludable, una comida o una estimación cuentan toda la historia." },
          { title: "Peso corporal y tendencias", body: "Compara cambios a lo largo del tiempo en vez de dejar que una sola medición decida si el plan funciona." },
        ],
      },
      steps: {
        eyebrow: "Cómo funciona Logbook",
        title: "Empieza con poco y crea un historial útil.",
        cards: [
          { title: "Define tus objetivos", body: "Elige los objetivos de entrenamiento y nutrición que coincidan con el plan que sigues." },
          { title: "Registra el día", body: "Anota entrenamientos, alimentos, macros y peso corporal mientras los detalles son fáciles de recordar." },
          { title: "Revisa la tendencia", body: "Usa el historial para detectar patrones, medir constancia y decidir qué merece cambiar." },
        ],
      },
      callout: {
        label: "Importante",
        title: "Útil para distintos objetivos de fitness",
        body: "Logbook puede apoyar a personas enfocadas en fitness general, fuerza, mejora del físico, cambios de peso o una rutina más constante. Registra el plan y los resultados que ingresas; no realiza diagnósticos médicos ni reemplaza la orientación individual de un profesional calificado.",
        firstCta: "Explorar ejercicios",
        secondCta: "Explorar plantillas de entrenamiento",
      },
      faq: {
        eyebrow: "Preguntas frecuentes",
        title: "Preguntas sobre Logbook",
        items: [
          { question: "¿Qué puedo registrar en Logbook?", answer: "Logbook registra entrenamientos, historial de ejercicios, alimentos, macros, peso corporal y progreso en la misma app." },
          { question: "¿Logbook es gratis?", answer: "Logbook se ofrece como una app gratuita de seguimiento físico y puede descargarse desde Apple App Store y Google Play." },
          { question: "¿Pueden usar Logbook las personas principiantes?", answer: "Sí. Logbook mantiene el registro diario comprensible para principiantes y ofrece a atletas con experiencia un historial constante de su trabajo." },
          { question: "¿Logbook crea mi plan de entrenamiento o nutrición?", answer: "Logbook te ayuda a registrar y revisar lo que haces. Sus datos son informativos y no reemplazan asesoría médica, dietética o profesional individualizada." },
          { question: "¿Dónde puedo descargar Logbook?", answer: "Logbook está disponible para dispositivos iOS compatibles en App Store y para Android en Google Play." },
        ],
      },
      final: { eyebrow: "Comienza a registrar", title: "Crea un registro de entrenamiento y nutrición." },
    },
    stagelab: {
      seo: {
        title: "StageLab: app para preparación de fisicoculturismo y físico",
        description: "Conoce la preparación de fisicoculturismo con IA, el análisis de físico y poses, y la metodología detrás de los check-ins y las decisiones de StageLab.",
      },
      structuredDescription: "Seguimiento de preparación de fisicoculturismo con evaluación del físico asistida por IA, análisis separado de poses y decisiones explicadas para atletas y coaches.",
      hero: {
        eyebrow: "Preparación para competencia con StageLab",
        title: "Preparación de fisicoculturismo organizada alrededor del panorama completo.",
        body: "Registra controles semanales, fotos del físico, objetivos nutricionales, cardio, recuperación y cambios del plan. Atletas y coaches pueden revisar toda esa información durante la preparación.",
        secondaryCta: "Probar Quick Analysis — {price} por única vez",
        tertiaryCta: "Seguir una preparación real",
        logoAlt: "Logo de la app StageLab Competition Prep",
      },
      storeButtons: { ios: "Descargar en App Store", android: "Disponible en Google Play" },
      summaryCards: [
        { label: "Proceso semanal", title: "Controles con contexto", body: "Revisa en conjunto las tendencias de peso, el cumplimiento, la recuperación, las fotos y el plan activo." },
        { label: "Creado para", title: "Atletas y coaches", body: "Usa el proceso individual para atletas u organiza a varios atletas de físico con las herramientas para coaches." },
        { label: "Disponibilidad", title: "Disponible en iOS y Android", body: "Descarga StageLab desde App Store o Google Play y comienza a registrar el plan activo." },
      ],
      overview: {
        eyebrow: "Creado para la preparación de fisicoculturismo",
        title: "Las decisiones de preparación necesitan más que un solo pesaje.",
        paragraphs: [
          "StageLab coloca el peso corporal junto a calorías, macros, cardio, pasos, entrenamiento, recuperación y cambios visuales. Cada revisión semanal muestra por qué se mantuvo o ajustó el plan activo.",
          "El proceso apoya divisiones masculinas y femeninas, como Bodybuilding, Men's Physique, Classic Physique, Bikini, Wellness, Figure, Fitness, Women's Physique y Women's Bodybuilding. Es útil para competidores que necesitan registros semanales constantes. No es un servicio de jueces ni garantiza acondicionamiento o posición.",
        ],
        secondaryTitle: "Controles visuales y análisis del progreso",
        secondaryBody: "Guarda fotos de progreso con los controles semanales para revisar los cambios visuales junto al resto de los datos. StageLab puede ofrecer observaciones visuales asistidas por IA, pero las fotos no reemplazan los datos registrados ni el criterio de un coach calificado.",
      },
      visual: {
        alt: "Recomendación semanal de StageLab que muestra un aumento de cardio",
        title: "Una recomendación vinculada al plan activo",
        body: "Consulta qué cambió, por qué cambió y qué revisar en el siguiente control.",
      },
      features: {
        eyebrow: "Datos de preparación",
        title: "Mantén visibles los datos detrás de cada decisión.",
        cards: [
          { title: "Nutrición y cardio", body: "Mantén calorías, macros, pasos y cardio programado vinculados al plan que se revisa." },
          { title: "Tendencias de peso y acondicionamiento", body: "Sigue los cambios durante varios controles en vez de reaccionar a un día aislado." },
          { title: "Entrenamiento y recuperación", body: "Registra cumplimiento, fuerza, sueño, energía y recuperación para interpretar mejor cada semana." },
        ],
      },
      steps: {
        eyebrow: "Cómo funciona StageLab",
        title: "Una revisión semanal que puedes repetir.",
        cards: [
          { title: "Define el plan activo", body: "Empieza con calorías, macros, pasos, cardio, división y cronograma actuales." },
          { title: "Registra la semana", body: "Anota peso corporal, cumplimiento, entrenamiento, recuperación y otras señales durante la semana." },
          { title: "Envía un control", body: "Agrega fotos de progreso consistentes y revisa la semana completa en vez de depender de la memoria." },
          { title: "Revisa y aplica", body: "Considera la recomendación, su nivel de confianza y los motivos antes de decidir si actualizas el plan." },
        ],
      },
      callout: {
        label: "Importante",
        title: "Tendencias de preparación, no garantías",
        body: "StageLab usa análisis asistido por IA para organizar señales y generar recomendaciones informativas. Los resultados pueden ser inexactos o incompletos y no son asesoría médica ni dietética, ni garantizan condición de competencia, resultados de salud, cambios físicos o posiciones.",
      },
      faq: {
        eyebrow: "Preguntas frecuentes",
        title: "Preguntas sobre StageLab",
        items: [
          { question: "¿Para quién está creado StageLab?", answer: "StageLab es para atletas de físico que se preparan para competir y coaches que revisan controles, planes y tendencias de progreso." },
          { question: "¿StageLab reemplaza a un coach de preparación?", answer: "No. StageLab organiza datos y ofrece resultados informativos asistidos por IA, pero cada atleta es responsable de sus decisiones y debe buscar orientación profesional calificada cuando corresponda." },
          { question: "¿Qué puedo registrar durante la preparación?", answer: "StageLab permite registrar controles semanales, tendencias de peso, fotos, calorías y macros, cardio, pasos, recuperación y cambios del plan." },
          { question: "¿Las recomendaciones de StageLab siempre son precisas?", answer: "No. Las recomendaciones y el análisis visual pueden ser incompletos o inexactos. Apoyan la revisión y planificación, pero no garantizan condición, salud ni resultados de competencia." },
          { question: "¿Dónde puedo descargar StageLab?", answer: "StageLab está disponible en Apple App Store y Google Play para dispositivos iOS y Android compatibles." },
        ],
      },
      final: { eyebrow: "Comienza tu registro de preparación", title: "Mantén juntos el plan activo y los controles semanales." },
    },
  },
  marketplaceCategories: {
    "personal-training": { label: "Entrenamiento personal", description: "Fitness, fuerza y composición corporal" },
    "strength-conditioning": { label: "Fuerza y acondicionamiento", description: "Fuerza, potencia y desarrollo atlético" },
    "bodybuilding-physique": { label: "Fisicoculturismo y físico", description: "Desarrollo muscular, preparación y posing" },
    "strength-sports": { label: "Deportes de fuerza", description: "Powerlifting, halterofilia y strongman" },
    "running-endurance": { label: "Running y resistencia", description: "Carreras, running y resistencia" },
    "sports-performance": { label: "Rendimiento deportivo", description: "Velocidad, agilidad y rendimiento atlético" },
    nutrition: { label: "Nutrición", description: "Coaching nutricional y alimentación saludable" },
    dietetics: { label: "Dietética", description: "Apoyo nutricional de profesionales acreditados" },
    "health-wellness-coaching": { label: "Coaching de salud y bienestar", description: "Hábitos, responsabilidad y estilo de vida" },
    "life-mindset-coaching": { label: "Coaching de vida y mentalidad", description: "Mentalidad, confianza y crecimiento personal" },
    yoga: { label: "Yoga", description: "Yoga, movilidad y práctica mente-cuerpo" },
    pilates: { label: "Pilates", description: "Fuerza del core, postura y movimiento" },
    "mobility-movement": { label: "Movilidad y movimiento", description: "Movilidad, estiramiento y calidad de movimiento" },
    "mindfulness-breathwork": { label: "Mindfulness y respiración", description: "Atención plena, respiración y manejo del estrés" },
    "recovery-bodywork": { label: "Recuperación y trabajo corporal", description: "Recuperación, masaje y estiramiento asistido" },
    "special-population-fitness": { label: "Fitness para poblaciones específicas", description: "Fitness para distintas etapas y necesidades" },
  },
} satisfies MarketingMessages;

export default messages;
