import type { Locale } from "./config.ts";

type GeneratorOptionMessages = {
  goals: Record<string, string>;
  experience: Record<string, string>;
  equipment: Record<string, string>;
  durations: Record<string, string>;
  focus: Record<string, string>;
};

export type WorkoutGeneratorMessages = {
  seo: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    intro: string;
    browseWorkouts: string;
    browseExercises: string;
  };
  howItWorks: { label: string; title: string; paragraphs: string[] };
  syncing: { label: string; title: string; copy: string };
  related: {
    eyebrow: string;
    title: string;
    copy: string;
    cards: Array<{ label: string; title: string; copy: string; action: string; href: string }>;
  };
  faq: { eyebrow: string; title: string; copy: string; items: Array<{ question: string; answer: string }> };
  cta: { title: string; copy: string };
  tool: {
    eyebrow: string;
    title: string;
    description: string;
    goal: string;
    experience: string;
    equipment: string;
    daysPerWeek: string;
    duration: string;
    focusArea: string;
    noFocus: string;
    findWorkout: string;
    invalidDays: string;
    noMatch: string;
    recommendedWorkout: string;
    workout: string;
    difficulty: string;
    estimatedDuration: string;
    flexible: string;
    day: string;
    days: string;
    shortDescription: string;
    whySelected: string;
    strongestMatch: string;
    equipmentNeeded: string;
    minimalEquipment: string;
    trainingFocus: string;
    viewFullWorkout: string;
    saveToLogbook: string;
    browseSimilar: string;
    saveUnavailable: string;
    previewEyebrow: string;
    previewTitle: string;
    previewCopy: string;
    exercise: string;
    section: string;
    sets: string;
    reps: string;
    rest: string;
    notes: string;
    exerciseSingular: string;
    exercisePlural: string;
    mainWork: string;
    coachChoice: string;
    selfPaced: string;
    defaultNotes: string;
    previewSyncing: string;
    alternativesEyebrow: string;
    alternativesTitle: string;
    alternativesCopy: string;
    options: GeneratorOptionMessages;
  };
};

const english: WorkoutGeneratorMessages = {
  seo: {
    title: "Workout Generator | Find the Right Workout for Your Goals",
    description: "Answer a few questions and get a personalized workout recommendation based on your goals, experience, schedule, and equipment.",
  },
  hero: {
    eyebrow: "Workout Finder",
    title: "Find the right workout plan for your goals without guessing.",
    intro: "Use this workout generator to match your goal, schedule, equipment, and experience level to a real workout template from the Elevare training library.",
    browseWorkouts: "Browse workout templates",
    browseExercises: "Browse exercises",
  },
  howItWorks: {
    label: "How it works",
    title: "Use the existing workout library instead of starting from scratch.",
    paragraphs: [
      "This tool is designed for people who know they should probably be following a plan, but are not sure which one fits their current situation. Instead of giving you a generic answer, it compares your inputs against the public workout templates already available on the site.",
      "That means the recommendation is grounded in real workout pages you can inspect right away. You can see the exercises, sets, reps, rest guidance, and the overall structure before deciding whether it fits your week.",
      "It is also intentionally simple. This is not an AI coach and it is not trying to write a brand-new program from thin air. It is a faster way to narrow the library down to plans that match your goal, time, equipment, and training background.",
    ],
  },
  syncing: { label: "Workout generator", title: "The workout library is still syncing.", copy: "The page is ready, but the public workout templates are not available in this build yet. Once the Supabase data is synced, the recommendation tool will start suggesting templates automatically." },
  related: {
    eyebrow: "Related links",
    title: "Keep exploring the training library.",
    copy: "Use these next if you want to compare full plans, learn individual exercises, or start tracking in Logbook.",
    cards: [
      { label: "Workouts", title: "Browse all workout templates", copy: "Compare beginner, weight-loss, muscle-building, and strength templates side by side.", action: "Explore workouts", href: "/workouts/" },
      { label: "Exercises", title: "Learn the exercises first", copy: "Open the exercise guides if you want to understand the movements before choosing a full plan.", action: "Browse exercises", href: "/exercises/" },
      { label: "Logbook", title: "Track your training in Logbook", copy: "Once you find a plan that fits, use Logbook to record the work and review progress over time.", action: "Learn about Logbook", href: "/logbook/" },
      { label: "Nutrition", title: "Pair the plan with a calorie target", copy: "A better workout plan works even better when your calories and protein target make sense too.", action: "Open calorie calculator", href: "/calculators/calorie-calculator/" },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Common questions about the workout generator.",
    copy: "These answers keep the tool practical and beginner-friendly before you use it.",
    items: [
      { question: "What workout is best for beginners?", answer: "Most beginners do best with a simpler full-body or beginner-friendly plan that they can repeat consistently. This tool favors easier templates when you choose beginner experience." },
      { question: "How many days per week should I work out?", answer: "For many people, two to four days per week is enough to make real progress. The best number is the one you can recover from and repeat consistently." },
      { question: "Can I build muscle training three days per week?", answer: "Yes. A well-structured three-day plan can support muscle gain when the sessions cover the main movement patterns and you stay consistent with effort and nutrition." },
      { question: "What equipment do I need?", answer: "That depends on the template. Some workouts need only bodyweight or dumbbells, while others use a full gym with barbells, cables, and machines." },
      { question: "How do I know if a workout is right for me?", answer: "The plan should match your goal, experience, available equipment, and the number of training days you can realistically complete each week." },
      { question: "Is this an AI workout generator?", answer: "No. This tool uses deterministic matching rules to recommend from the existing public workout template library. It does not invent a new plan." },
    ],
  },
  cta: { title: "Track your nutrition and workouts for free in Logbook.", copy: "Once you find a plan that fits your week, use Logbook to record sessions, review progress, and stay consistent." },
  tool: {
    eyebrow: "Workout tool", title: "Find a workout template that matches your goal, schedule, and setup.", description: "This tool recommends from the existing public workout library. It does not generate a brand-new plan or use AI.",
    goal: "Goal", experience: "Experience", equipment: "Equipment", daysPerWeek: "Days per week", duration: "Workout duration", focusArea: "Focus area", noFocus: "No specific focus", findWorkout: "Find workout",
    invalidDays: "Choose a realistic number of training days before getting a recommendation.", noMatch: "We could not find a strong template match yet. Try a more flexible equipment or time selection.",
    recommendedWorkout: "Recommended workout", workout: "Workout", difficulty: "Difficulty", estimatedDuration: "Estimated duration", flexible: "Flexible", day: "day", days: "days", shortDescription: "Short description", whySelected: "Why it was selected", strongestMatch: "It was the strongest overall match from the current public workout library.", equipmentNeeded: "Equipment needed", minimalEquipment: "Minimal equipment", trainingFocus: "Training focus", viewFullWorkout: "View full workout", saveToLogbook: "Save to Logbook", browseSimilar: "Browse similar workouts", saveUnavailable: "Saving workout templates to Logbook from the website is coming soon.",
    previewEyebrow: "Workout preview", previewTitle: "See the structure before you commit.", previewCopy: "Review the exercise flow, set and rep targets, and rest guidance from the recommended template.", exercise: "Exercise", section: "Section", sets: "Sets", reps: "Reps", rest: "Rest", notes: "Notes", exerciseSingular: "exercise", exercisePlural: "exercises", mainWork: "Main work", coachChoice: "Coach choice", selfPaced: "Self-paced", defaultNotes: "Stay consistent with the setup and execution.", previewSyncing: "The exercise list for this template is still being synced. You can still open the full workout page and browse the rest of the public library.",
    alternativesEyebrow: "You may also like", alternativesTitle: "Similar templates worth comparing.", alternativesCopy: "These options were also strong matches based on your goal, difficulty, equipment, and schedule.",
    options: {
      goals: { "weight-loss": "Weight Loss", "general-fitness": "General Fitness", "muscle-gain": "Muscle Gain", strength: "Strength", "beginner-fitness": "Beginner Fitness" },
      experience: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
      equipment: { home: "Home", dumbbells: "Dumbbells", "resistance-bands": "Resistance Bands", "full-gym": "Full Gym" },
      durations: { "20-30": "20-30 Minutes", "30-45": "30-45 Minutes", "45-60": "45-60 Minutes", "60-plus": "60+ Minutes" },
      focus: { chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", legs: "Legs", glutes: "Glutes", core: "Core", "full-body": "Full Body" },
    },
  },
};

const spanish: WorkoutGeneratorMessages = {
  seo: { title: "Generador de entrenamientos | Encuentra el plan adecuado", description: "Responde unas preguntas y recibe una recomendación de entrenamiento según tu objetivo, experiencia, horario y equipo." },
  hero: { eyebrow: "Buscador de entrenamientos", title: "Encuentra el plan de entrenamiento adecuado sin adivinar.", intro: "Relaciona tu objetivo, horario, equipo y experiencia con una plantilla real de la biblioteca de entrenamiento de Elevare.", browseWorkouts: "Ver plantillas de entrenamiento", browseExercises: "Ver ejercicios" },
  howItWorks: { label: "Cómo funciona", title: "Usa la biblioteca existente en lugar de empezar desde cero.", paragraphs: ["Esta herramienta compara tus respuestas con las plantillas públicas disponibles para ayudarte a encontrar una opción adecuada.", "La recomendación se basa en entrenamientos reales que puedes revisar de inmediato, incluidos ejercicios, series, repeticiones, descansos y estructura.", "No es un entrenador de IA ni crea un programa nuevo. Solo reduce la biblioteca a los planes que mejor coinciden con tu objetivo, tiempo, equipo y experiencia."] },
  syncing: { label: "Generador de entrenamientos", title: "La biblioteca de entrenamientos se está sincronizando.", copy: "La página está lista, pero las plantillas públicas aún no están disponibles en esta compilación. Cuando termine la sincronización con Supabase, aparecerán recomendaciones automáticamente." },
  related: { eyebrow: "Enlaces relacionados", title: "Sigue explorando la biblioteca de entrenamiento.", copy: "Compara planes completos, aprende ejercicios o empieza a registrar tus sesiones en Logbook.", cards: [
    { label: "Entrenamientos", title: "Ver todas las plantillas", copy: "Compara planes para principiantes, pérdida de peso, desarrollo muscular y fuerza.", action: "Explorar entrenamientos", href: "/workouts/" },
    { label: "Ejercicios", title: "Aprende primero los ejercicios", copy: "Consulta las guías de ejercicios antes de elegir un plan completo.", action: "Ver ejercicios", href: "/exercises/" },
    { label: "Logbook", title: "Registra tu entrenamiento en Logbook", copy: "Cuando encuentres un plan, usa Logbook para registrar tus sesiones y revisar el progreso.", action: "Conocer Logbook", href: "/logbook/" },
    { label: "Nutrición", title: "Combina el plan con un objetivo de calorías", copy: "Tu plan funciona mejor cuando tus objetivos de calorías y proteína también tienen sentido.", action: "Abrir calculadora de calorías", href: "/calculators/calorie-calculator/" },
  ] },
  faq: { eyebrow: "Preguntas frecuentes", title: "Preguntas comunes sobre el generador de entrenamientos.", copy: "Respuestas prácticas para usar la herramienta con confianza.", items: [
    { question: "¿Cuál es el mejor entrenamiento para principiantes?", answer: "La mayoría progresa bien con un plan sencillo de cuerpo completo que pueda repetir con constancia. La herramienta prioriza plantillas más accesibles cuando eliges nivel principiante." },
    { question: "¿Cuántos días por semana debo entrenar?", answer: "Para muchas personas, entrenar entre dos y cuatro días es suficiente. El mejor número es el que puedes mantener y del que puedes recuperarte." },
    { question: "¿Puedo desarrollar músculo entrenando tres días por semana?", answer: "Sí. Un plan de tres días bien estructurado puede apoyar el desarrollo muscular si cubre los patrones principales y eres constante." },
    { question: "¿Qué equipo necesito?", answer: "Depende de la plantilla. Algunos planes usan peso corporal o mancuernas y otros aprovechan barras, poleas y máquinas de un gimnasio completo." },
    { question: "¿Cómo sé si un entrenamiento es adecuado para mí?", answer: "Debe coincidir con tu objetivo, experiencia, equipo disponible y los días que realmente puedes completar cada semana." },
    { question: "¿Este es un generador de entrenamientos con IA?", answer: "No. Usa reglas deterministas para recomendar plantillas existentes y no inventa un plan nuevo." },
  ] },
  cta: { title: "Registra gratis tu nutrición y entrenamientos en Logbook.", copy: "Cuando encuentres un plan adecuado, usa Logbook para registrar sesiones, revisar el progreso y mantener la constancia." },
  tool: {
    ...english.tool,
    eyebrow: "Herramienta de entrenamiento", title: "Encuentra una plantilla que coincida con tu objetivo, horario y equipo.", description: "Esta herramienta recomienda planes de la biblioteca pública. No crea un programa nuevo ni usa IA.",
    goal: "Objetivo", experience: "Experiencia", equipment: "Equipo", daysPerWeek: "Días por semana", duration: "Duración del entrenamiento", focusArea: "Zona de enfoque", noFocus: "Sin enfoque específico", findWorkout: "Buscar entrenamiento",
    invalidDays: "Elige un número realista de días de entrenamiento antes de obtener una recomendación.", noMatch: "Todavía no encontramos una coincidencia clara. Prueba una opción de equipo o tiempo más flexible.",
    recommendedWorkout: "Entrenamiento recomendado", workout: "Entrenamiento", difficulty: "Dificultad", estimatedDuration: "Duración estimada", flexible: "Flexible", day: "día", days: "días", shortDescription: "Descripción breve", whySelected: "Por qué fue seleccionado", strongestMatch: "Fue la mejor coincidencia general de la biblioteca pública actual.", equipmentNeeded: "Equipo necesario", minimalEquipment: "Equipo mínimo", trainingFocus: "Enfoque del entrenamiento", viewFullWorkout: "Ver entrenamiento completo", saveToLogbook: "Guardar en Logbook", browseSimilar: "Ver entrenamientos similares", saveUnavailable: "La opción de guardar plantillas en Logbook desde el sitio web estará disponible próximamente.",
    previewEyebrow: "Vista previa", previewTitle: "Revisa la estructura antes de elegir.", previewCopy: "Consulta el orden de ejercicios y los objetivos de series, repeticiones y descanso.", exercise: "Ejercicio", section: "Sección", sets: "Series", reps: "Repeticiones", rest: "Descanso", notes: "Notas", exerciseSingular: "ejercicio", exercisePlural: "ejercicios", mainWork: "Trabajo principal", coachChoice: "Elección del entrenador", selfPaced: "A tu ritmo", defaultNotes: "Mantén una preparación y ejecución consistentes.", previewSyncing: "La lista de ejercicios de esta plantilla aún se está sincronizando. Puedes abrir el entrenamiento completo y explorar el resto de la biblioteca.",
    alternativesEyebrow: "También te puede interesar", alternativesTitle: "Plantillas similares para comparar.", alternativesCopy: "Estas opciones también coinciden con tu objetivo, dificultad, equipo y horario.",
    options: { goals: { "weight-loss": "Pérdida de peso", "general-fitness": "Condición física general", "muscle-gain": "Desarrollo muscular", strength: "Fuerza", "beginner-fitness": "Fitness para principiantes" }, experience: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" }, equipment: { home: "Casa", dumbbells: "Mancuernas", "resistance-bands": "Bandas de resistencia", "full-gym": "Gimnasio completo" }, durations: { "20-30": "20-30 minutos", "30-45": "30-45 minutos", "45-60": "45-60 minutos", "60-plus": "60+ minutos" }, focus: { chest: "Pecho", back: "Espalda", shoulders: "Hombros", arms: "Brazos", legs: "Piernas", glutes: "Glúteos", core: "Core", "full-body": "Cuerpo completo" } },
  },
};

const portuguese: WorkoutGeneratorMessages = {
  seo: { title: "Gerador de treinos | Encontre o plano certo", description: "Responda algumas perguntas e receba uma recomendação de treino com base no seu objetivo, experiência, rotina e equipamentos." },
  hero: { eyebrow: "Seletor de treinos", title: "Encontre o plano de treino certo sem adivinhar.", intro: "Combine seu objetivo, rotina, equipamentos e experiência com um modelo real da biblioteca de treinos da Elevare.", browseWorkouts: "Ver modelos de treino", browseExercises: "Ver exercícios" },
  howItWorks: { label: "Como funciona", title: "Use a biblioteca existente em vez de começar do zero.", paragraphs: ["Esta ferramenta compara suas respostas com os modelos públicos disponíveis para encontrar uma opção adequada.", "A recomendação vem de treinos reais que você pode revisar imediatamente, incluindo exercícios, séries, repetições, descansos e estrutura.", "Ela não é um treinador de IA e não cria um programa novo. Apenas reduz a biblioteca aos planos que mais combinam com seu objetivo, tempo, equipamentos e experiência."] },
  syncing: { label: "Gerador de treinos", title: "A biblioteca de treinos ainda está sincronizando.", copy: "A página está pronta, mas os modelos públicos ainda não estão disponíveis nesta compilação. Quando a sincronização com o Supabase terminar, as recomendações aparecerão automaticamente." },
  related: { eyebrow: "Links relacionados", title: "Continue explorando a biblioteca de treinos.", copy: "Compare planos completos, aprenda exercícios ou comece a registrar suas sessões no Logbook.", cards: [
    { label: "Treinos", title: "Ver todos os modelos", copy: "Compare planos para iniciantes, perda de peso, ganho muscular e força.", action: "Explorar treinos", href: "/workouts/" },
    { label: "Exercícios", title: "Aprenda primeiro os exercícios", copy: "Consulte os guias de exercícios antes de escolher um plano completo.", action: "Ver exercícios", href: "/exercises/" },
    { label: "Logbook", title: "Registre seu treino no Logbook", copy: "Quando encontrar um plano, use o Logbook para registrar as sessões e revisar o progresso.", action: "Conhecer o Logbook", href: "/logbook/" },
    { label: "Nutrição", title: "Combine o plano com uma meta de calorias", copy: "Seu plano funciona melhor quando suas metas de calorias e proteína também fazem sentido.", action: "Abrir calculadora de calorias", href: "/calculators/calorie-calculator/" },
  ] },
  faq: { eyebrow: "Perguntas frequentes", title: "Perguntas comuns sobre o gerador de treinos.", copy: "Respostas práticas para usar a ferramenta com confiança.", items: [
    { question: "Qual treino é melhor para iniciantes?", answer: "A maioria dos iniciantes se beneficia de um plano simples de corpo inteiro que possa repetir com consistência. A ferramenta prioriza modelos mais acessíveis quando você escolhe o nível iniciante." },
    { question: "Quantos dias por semana devo treinar?", answer: "Para muitas pessoas, dois a quatro dias por semana são suficientes. O melhor número é aquele que você consegue manter e do qual consegue se recuperar." },
    { question: "Posso ganhar músculo treinando três dias por semana?", answer: "Sim. Um plano de três dias bem estruturado pode apoiar o ganho muscular quando cobre os principais padrões e você mantém a consistência." },
    { question: "Quais equipamentos eu preciso?", answer: "Depende do modelo. Alguns planos usam peso corporal ou halteres, enquanto outros aproveitam barras, cabos e máquinas de uma academia completa." },
    { question: "Como saber se um treino é adequado para mim?", answer: "Ele deve combinar com seu objetivo, experiência, equipamentos disponíveis e os dias que você realmente consegue completar por semana." },
    { question: "Este é um gerador de treinos com IA?", answer: "Não. Ele usa regras deterministas para recomendar modelos existentes e não inventa um plano novo." },
  ] },
  cta: { title: "Registre sua nutrição e seus treinos grátis no Logbook.", copy: "Quando encontrar um plano adequado, use o Logbook para registrar sessões, revisar o progresso e manter a consistência." },
  tool: {
    ...english.tool,
    eyebrow: "Ferramenta de treino", title: "Encontre um modelo que combine com seu objetivo, rotina e equipamentos.", description: "Esta ferramenta recomenda planos da biblioteca pública. Ela não cria um programa novo nem usa IA.",
    goal: "Objetivo", experience: "Experiência", equipment: "Equipamentos", daysPerWeek: "Dias por semana", duration: "Duração do treino", focusArea: "Área de foco", noFocus: "Sem foco específico", findWorkout: "Encontrar treino",
    invalidDays: "Escolha um número realista de dias de treino antes de receber uma recomendação.", noMatch: "Ainda não encontramos uma correspondência clara. Tente uma opção de equipamento ou tempo mais flexível.",
    recommendedWorkout: "Treino recomendado", workout: "Treino", difficulty: "Dificuldade", estimatedDuration: "Duração estimada", flexible: "Flexível", day: "dia", days: "dias", shortDescription: "Descrição breve", whySelected: "Por que foi selecionado", strongestMatch: "Foi a melhor correspondência geral da biblioteca pública atual.", equipmentNeeded: "Equipamentos necessários", minimalEquipment: "Equipamento mínimo", trainingFocus: "Foco do treino", viewFullWorkout: "Ver treino completo", saveToLogbook: "Salvar no Logbook", browseSimilar: "Ver treinos similares", saveUnavailable: "A opção de salvar modelos no Logbook pelo site estará disponível em breve.",
    previewEyebrow: "Prévia do treino", previewTitle: "Revise a estrutura antes de escolher.", previewCopy: "Confira a ordem dos exercícios e as metas de séries, repetições e descanso.", exercise: "Exercício", section: "Seção", sets: "Séries", reps: "Repetições", rest: "Descanso", notes: "Observações", exerciseSingular: "exercício", exercisePlural: "exercícios", mainWork: "Trabalho principal", coachChoice: "Escolha do treinador", selfPaced: "No seu ritmo", defaultNotes: "Mantenha a preparação e a execução consistentes.", previewSyncing: "A lista de exercícios deste modelo ainda está sincronizando. Você ainda pode abrir o treino completo e explorar o restante da biblioteca.",
    alternativesEyebrow: "Você também pode gostar", alternativesTitle: "Modelos similares para comparar.", alternativesCopy: "Estas opções também combinam com seu objetivo, dificuldade, equipamentos e rotina.",
    options: { goals: { "weight-loss": "Perda de peso", "general-fitness": "Condicionamento geral", "muscle-gain": "Ganho muscular", strength: "Força", "beginner-fitness": "Fitness para iniciantes" }, experience: { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" }, equipment: { home: "Casa", dumbbells: "Halteres", "resistance-bands": "Faixas elásticas", "full-gym": "Academia completa" }, durations: { "20-30": "20-30 minutos", "30-45": "30-45 minutos", "45-60": "45-60 minutos", "60-plus": "60+ minutos" }, focus: { chest: "Peito", back: "Costas", shoulders: "Ombros", arms: "Braços", legs: "Pernas", glutes: "Glúteos", core: "Core", "full-body": "Corpo inteiro" } },
  },
};

const messagesByLocale: Record<Locale, WorkoutGeneratorMessages> = { en: english, "es-419": spanish, "pt-BR": portuguese };

export function getWorkoutGeneratorMessages(locale: Locale) {
  return messagesByLocale[locale];
}

const exactReasons: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "es-419": {
    "It still fits the kind of training structure that usually works well for your goal.": "Mantiene una estructura de entrenamiento adecuada para tu objetivo.",
    "The difficulty lines up with your current experience level.": "La dificultad coincide con tu nivel de experiencia.",
    "The difficulty should still feel manageable at your current level.": "La dificultad debería ser manejable para tu nivel actual.",
    "It is a little more challenging, but still in range for someone past the beginner stage.": "Es un poco más exigente, pero sigue siendo adecuado para alguien que ya superó la etapa inicial.",
    "The session length fits the time window you selected.": "La duración de la sesión coincide con el tiempo que seleccionaste.",
    "The equipment list stays home-friendly.": "El equipo necesario es adecuado para entrenar en casa.",
    "It works well with a dumbbell-based setup.": "Funciona bien con un equipo basado en mancuernas.",
    "The setup is already close to a resistance-band friendly workout.": "La estructura se adapta bien a las bandas de resistencia.",
    "The workout is simple enough to adapt with band or bodyweight substitutions.": "El entrenamiento se puede adaptar con bandas o ejercicios de peso corporal.",
    "It is still home-friendly and easier to adapt than a full gym plan.": "Sigue siendo apto para casa y es más fácil de adaptar que un plan de gimnasio completo.",
    "The equipment list makes good use of a full gym setup.": "El equipo aprovecha bien un gimnasio completo.",
    "It covers enough muscle groups to work well as a full-body recommendation.": "Cubre suficientes grupos musculares para funcionar como recomendación de cuerpo completo.",
    "It gives you a balanced starting point instead of isolating just one area.": "Ofrece un punto de partida equilibrado en lugar de aislar una sola zona.",
  },
  "pt-BR": {
    "It still fits the kind of training structure that usually works well for your goal.": "Mantém uma estrutura de treino adequada ao seu objetivo.",
    "The difficulty lines up with your current experience level.": "A dificuldade corresponde ao seu nível de experiência.",
    "The difficulty should still feel manageable at your current level.": "A dificuldade deve ser administrável para o seu nível atual.",
    "It is a little more challenging, but still in range for someone past the beginner stage.": "É um pouco mais exigente, mas ainda adequado para quem já passou da fase inicial.",
    "The session length fits the time window you selected.": "A duração da sessão corresponde ao tempo selecionado.",
    "The equipment list stays home-friendly.": "Os equipamentos são adequados para treinar em casa.",
    "It works well with a dumbbell-based setup.": "Funciona bem com uma estrutura baseada em halteres.",
    "The setup is already close to a resistance-band friendly workout.": "A estrutura se adapta bem às faixas elásticas.",
    "The workout is simple enough to adapt with band or bodyweight substitutions.": "O treino pode ser adaptado com faixas ou exercícios de peso corporal.",
    "It is still home-friendly and easier to adapt than a full gym plan.": "Continua adequado para casa e é mais fácil de adaptar do que um plano de academia completa.",
    "The equipment list makes good use of a full gym setup.": "Os equipamentos aproveitam bem uma academia completa.",
    "It covers enough muscle groups to work well as a full-body recommendation.": "Cobre grupos musculares suficientes para funcionar como recomendação de corpo inteiro.",
    "It gives you a balanced starting point instead of isolating just one area.": "Oferece um ponto de partida equilibrado em vez de isolar apenas uma área.",
  },
};

function optionLabelFromEnglish(value: string, locale: Exclude<Locale, "en">) {
  const messages = messagesByLocale[locale].tool.options;
  const normalized = value.trim().toLowerCase();
  for (const options of Object.values(messages)) {
    const canonical = Object.keys(options).find((key) => english.tool.options.goals[key]?.toLowerCase() === normalized
      || english.tool.options.focus[key]?.toLowerCase() === normalized);
    if (canonical && options[canonical]) return options[canonical].toLocaleLowerCase(locale);
  }
  return value;
}

export function localizeWorkoutRecommendationReason(reason: string, locale: Locale) {
  if (locale === "en") return reason;
  const exact = exactReasons[locale][reason];
  if (exact) return exact;

  const goal = reason.match(/^It is built for (.+)\.$/i)?.[1];
  if (goal) {
    const translated = optionLabelFromEnglish(goal, locale);
    return locale === "es-419" ? `Está diseñado para ${translated}.` : `Foi desenvolvido para ${translated}.`;
  }

  const days = reason.match(/^It is structured around (\d+) training days per week\.$/i)?.[1];
  if (days) return locale === "es-419" ? `Está estructurado para ${days} días de entrenamiento por semana.` : `Está estruturado para ${days} dias de treino por semana.`;

  const focus = reason.match(/^It gives extra attention to (.+)\.$/i)?.[1];
  if (focus) {
    const translated = optionLabelFromEnglish(focus, locale);
    return locale === "es-419" ? `Da atención adicional a ${translated}.` : `Dá atenção adicional a ${translated}.`;
  }

  return reason;
}
