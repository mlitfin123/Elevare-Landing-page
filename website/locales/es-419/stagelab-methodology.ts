import type { StageLabMethodologyMessages } from "../../lib/i18n/stagelab-methodology-messages.ts";

const messages: StageLabMethodologyMessages = {
  eyebrow: "Nuestra metodología",
  title: "Cómo toma decisiones StageLab",
  lead: "La IA también debe poder explicarse.",
  body: "StageLab combina evaluaciones asistidas por modelos con reglas de preparación consistentes, evolución en el tiempo, contexto de la categoría y comprobaciones de seguridad. La IA contribuye a la evaluación; no controla tu plan de preparación por su cuenta.",
  scope: "Esta metodología describe la preparación continua para competir dentro de la app StageLab. Los análisis individuales del sitio web evalúan un momento concreto: no gestionan un plan de preparación ni establecen un historial de progreso.",
  cards: {
    readiness: {
      title: "Preparación física visual",
      body: "La condición, la plenitud muscular, la musculatura, la simetría y la presentación se consideran junto con la calidad de las imágenes y el historial comparable disponible. Las observaciones asistidas por modelos pasan por comprobaciones deterministas para estimar un rango del tiempo adicional de acondicionamiento necesario.",
      note: "La estimación de preparación es aproximada, incluso cuando se expresa como una sola cantidad de semanas.",
    },
    progress: {
      title: "Progreso a lo largo del tiempo",
      body: "Cuando existe un historial comparable, StageLab puede contrastar el check-in actual con los anteriores, el punto de partida del ciclo, una referencia guardada o el mejor estado físico registrado, y las tendencias de peso y cintura. Considera si la brecha de condición se reduce conforme se acerca la competencia.",
      note: "El primer check-in establece un punto de partida. No puede mostrar una tendencia real a lo largo del tiempo.",
    },
    bodyFat: {
      title: "Contexto de grasa corporal",
      body: "Un rango estimado de grasa corporal aporta contexto. Por sí solo no determina si estás listo para el escenario. Una discrepancia importante con evidencia visual más sólida puede reducir la confianza, en lugar de forzar una respuesta aparentemente segura.",
      note: "Las estimaciones de grasa corporal basadas en fotos son aproximaciones, no mediciones de laboratorio.",
    },
    adjustments: {
      title: "Decisiones de nutrición y cardio",
      body: "Antes de sugerir cambios, StageLab considera el progreso, la preparación física, el cumplimiento del plan, la recuperación, la fase, las intervenciones recientes, la actividad actual, el mantenimiento estimado y los límites de seguridad. Suele priorizar ajustes moderados, aunque la evidencia persistente o urgente puede justificar cambios combinados de calorías y actividad.",
      note: "Estar atrasado no provoca automáticamente un recorte de calorías.",
    },
    division: {
      title: "Contexto de cada categoría",
      body: "Cada categoría busca un físico diferente. La condición, la plenitud muscular, la musculatura, la simetría y la presentación se interpretan según la categoría seleccionada, incluida la posibilidad de un acondicionamiento excesivo.",
      note: "Los estándares de StageLab son criterios prácticos de coaching basados en las características de cada categoría. No son criterios oficiales de juzgamiento de ninguna federación.",
    },
    confidence: {
      title: "Confianza e incertidumbre",
      body: "La calidad de las fotos, la falta de historial, las mediciones inconsistentes, las diferencias de pose y las señales contradictorias pueden reducir la confianza, ampliar una estimación o generar un resultado más conservador. La evidencia limitada puede activar una alternativa más prudente o impedir una conclusión sin respaldo.",
      note: "La confianza de StageLab refleja la calidad y la coherencia de la evidencia disponible. No es una probabilidad calibrada científicamente.",
    },
  },
  posing: {
    eyebrow: "Posing Coach",
    title: "Las poses se evalúan por separado",
    body: "Posing Coach revisa la ejecución y la presentación mediante fotogramas extraídos de tu video de poses y ordenados en secuencia. El análisis considera la ejecución propia de la categoría, los puntos fuertes, las correcciones y la calidad de la presentación.",
    separation: "Las puntuaciones de poses no modifican:",
    unaffected: ["Estimaciones de grasa corporal", "Preparación física para el escenario", "Calorías", "Cardio", "Decisiones de la semana pico"],
    note: "La puntuación de poses describe la presentación. No es una puntuación oficial de juzgamiento, de condición o de preparación física, ni una predicción de tu puesto.",
  },
  flow: {
    title: "De la evidencia a una decisión sobre el plan",
    inputsLabel: "Contexto disponible del check-in",
    inputs: ["Evaluación visual", "Contexto de la categoría", "Progreso en el tiempo", "Tendencias de peso y cintura", "Cumplimiento y recuperación", "Historial del plan"],
    steps: ["Preparación física tras contrastar las señales", "Comprobaciones de seguridad y fase", "Mantener o ajustar de forma moderada"],
    caption: "Vista conceptual del proceso de revisión. Los datos no tienen el mismo peso y no todos están disponibles en cada check-in.",
  },
  detailsTitle: "Conoce más sobre la metodología",
  details: {
    readiness: {
      title: "Cómo se contrastan las señales de preparación visual",
      paragraphs: ["StageLab combina observaciones visuales asistidas por modelos con comprobaciones deterministas de preparación y el contexto de la categoría del atleta. La grasa corporal aporta contexto; no sustituye la evidencia más sólida ni se convierte en la única respuesta.", "El resultado suele expresar un rango estimado de preparación. Una estimación de una sola cantidad de semanas, cuando aparece, también es aproximada. Las señales contradictorias pueden ampliar la incertidumbre en lugar de producir una fecha exacta para estar listo."],
    },
    history: {
      title: "Cómo se utiliza el historial de progreso",
      paragraphs: ["Para que una comparación sea útil, las fotos y las mediciones deben ser suficientemente consistentes. Cuando existen esos registros, StageLab puede revisar el check-in anterior, el punto de partida del ciclo, una referencia guardada o el mejor estado físico registrado, y las tendencias de peso y cintura.", "Considera la dirección del cambio y si la brecha de condición restante se está reduciendo en relación con el tiempo disponible. Un historial ausente o poco comparable limita esa conclusión; el primer check-in ofrece un punto de partida, no una tendencia demostrada."],
    },
    maintenance: {
      title: "Cómo estima StageLab las calorías de mantenimiento",
      paragraphs: ["StageLab parte de una estimación mediante fórmula ajustada a la actividad. Cuando dispone de suficientes datos fiables, puede incorporar la ingesta calórica de días con el registro completo y las tendencias del peso promedio semanal.", "La influencia de los datos observados depende de su calidad. El sistema limita los cambios bruscos provocados por fluctuaciones de corto plazo. Es una estimación adaptativa del mantenimiento, no una medición exacta del gasto energético diario total."],
    },
    recovery: {
      title: "Por qué StageLab puede mantener el plan en lugar de recortar",
      paragraphs: ["La recuperación, el cumplimiento del plan, las señales de lesión reportadas, la caída del rendimiento, las intervenciones recientes y el estrés acumulado pueden llevar a StageLab a mantener, suavizar o reconsiderar un ajuste que sería agresivo.", "Un ajuste moderado puede necesitar tiempo para mostrar su efecto. La evidencia persistente o urgente también puede justificar cambios combinados de calorías y actividad. Son medidas informativas de prudencia para la preparación, no vigilancia médica ni un sustituto de la atención profesional."],
    },
    peakWeek: {
      title: "La semana pico utiliza una lógica propia",
      paragraphs: ["Conforme se acerca la competencia, StageLab pasa de la lógica habitual de preparación a una planificación específica de la semana pico. El contexto visual y de preparación de cada día orienta esa revisión, en vez de prolongar los ajustes semanales habituales.", "StageLab no automatiza la deshidratación, los recortes de agua, la manipulación de sodio ni el uso de diuréticos."],
    },
    posing: {
      title: "Por qué las poses se mantienen separadas",
      paragraphs: ["Tu físico y cómo lo presentas están relacionados, pero responden a preguntas distintas. Los fotogramas ordenados del video ayudan a evaluar la ejecución, los puntos fuertes, las correcciones y la presentación según la categoría seleccionada.", "Las puntuaciones de poses no intervienen en las estimaciones de grasa corporal, la preparación física, las recomendaciones de calorías o cardio ni las decisiones de la semana pico. Tampoco predicen los resultados del juzgamiento."],
    },
  },
  limits: {
    title: "Lo que StageLab no promete",
    intro: "StageLab ofrece información para apoyar tu revisión. No proporciona:",
    items: ["Mediciones de grasa corporal de laboratorio", "Diagnósticos médicos ni atención nutricional profesional habilitada", "Preparación garantizada ni una fecha exacta para estar listo", "Un puesto garantizado ni resultados exactos de competencia", "Puntuaciones oficiales de juzgamiento", "Una medición perfecta del gasto energético diario total"],
    posing: "Las puntuaciones de poses de StageLab no representan la condición ni la preparación física para el escenario.",
    guidance: "Estos criterios prácticos de coaching no son leyes fisiológicas ni predicciones de preparación validadas científicamente. Los resultados pueden ser inexactos o incompletos; revísalos con la orientación profesional adecuada.",
  },
  transition: "Comprende el razonamiento detrás de tu próxima decisión de preparación.",
};

export default messages;
