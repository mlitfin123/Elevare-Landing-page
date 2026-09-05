import type { Locale } from "./config.ts";
import type { WorkoutGoalInfo, WorkoutTemplateRecord } from "../training-data.ts";

type WorkoutMessages = {
  seo: {
    indexTitle: string;
    indexDescription: string;
    goalFallbackTitle: string;
    goalFallbackDescription: string;
    detailTitle: string;
    detailDescription: string;
  };
  index: {
    eyebrow: string;
    title: string;
    intro: string;
    browseExercises: string;
    useGenerator: string;
    templates: string;
    templatesCopy: string;
    format: string;
    formatValue: string;
    formatCopy: string;
    track: string;
    trackValue: string;
    trackCopy: string;
    popularEyebrow: string;
    popularTitle: string;
    popularCopy: string;
    goalsEyebrow: string;
    goalsTitle: string;
    goalsCopy: string;
    exploreGoal: string;
    emptyLabel: string;
    emptyTitle: string;
    emptyCopy: string;
  };
  directory: {
    eyebrow: string;
    title: string;
    copy: string;
    searchLabel: string;
    searchPlaceholder: string;
    goal: string;
    allGoals: string;
    difficulty: string;
    allDifficulties: string;
    resultSingular: string;
    resultPlural: string;
    resultCopy: string;
    empty: string;
  };
  goal: {
    eyebrow: string;
    templates: string;
    templatesCopy: string;
    startingPoint: string;
    startingValue: string;
    startingCopy: string;
    track: string;
    trackValue: string;
    trackCopy: string;
    relatedEyebrow: string;
    relatedTitle: string;
    relatedCopy: string;
    emptyLabel: string;
    emptyTitle: string;
    emptyCopy: string;
  };
  detail: {
    eyebrow: string;
    goal: string;
    goalCopy: string;
    difficulty: string;
    difficultyCopy: string;
    duration: string;
    durationCopy: string;
    flexible: string;
    whoFor: string;
    generalUsers: string;
    whoForCopy: string;
    equipment: string;
    minimalSetup: string;
    equipmentCopy: string;
    trainingDays: string;
    dayPerWeek: string;
    daysPerWeek: string;
    trainingDaysCopy: string;
    warmup: string;
    warmupCopy: string;
    progression: string;
    progressionCopy: string;
    tableEyebrow: string;
    tableTitle: string;
    tableCopy: string;
    exercise: string;
    section: string;
    sets: string;
    reps: string;
    rest: string;
    notes: string;
    exerciseSingular: string;
    exercisePlural: string;
    mainWork: string;
    asWritten: string;
    selfPaced: string;
    followTargets: string;
    substitutionsEyebrow: string;
    substitutionsTitle: string;
    substitutionsCopy: string;
    noSubstitution: string;
    relatedExercisesEyebrow: string;
    relatedExercisesTitle: string;
    relatedExercisesCopy: string;
    relatedWorkoutsEyebrow: string;
    relatedWorkoutsTitle: string;
    relatedWorkoutsCopy: string;
    faqEyebrow: string;
    faqTitle: string;
    faqQuestions: [string, string, string, string];
    faqAnswers: [string, string, string, string];
  };
  card: {
    flexibleDuration: string;
    minimalEquipment: string;
    view: string;
  };
  disclaimer: {
    label: string;
    message: string;
  };
  cta: {
    indexTitle: string;
    indexCopy: string;
    goalTitle: string;
    goalCopy: string;
    detailTitle: string;
    detailCopy: string;
  };
};

const english: WorkoutMessages = {
  seo: {
    indexTitle: "Workout Templates",
    indexDescription: "Explore beginner, muscle-building, weight-loss, and strength workout templates with exercises, sets, reps, and rest guidance.",
    goalFallbackTitle: "Workout category",
    goalFallbackDescription: "Explore workout templates organized by training goal.",
    detailTitle: "{name}: Workout Plan",
    detailDescription: "Explore {name} with exercises, sets, reps, rest guidance, and progression details.",
  },
  index: {
    eyebrow: "Workouts", title: "Find workout templates you can actually use and repeat.", intro: "Browse structured workout templates for beginners, fat loss, muscle building, and strength training, then use Logbook to track the plan over time.", browseExercises: "Browse exercises", useGenerator: "Use workout generator", templates: "Templates", templatesCopy: "Public workout templates currently available in the library.", format: "Format", formatValue: "Exercises, sets, reps, rest", formatCopy: "Use the templates as a clear starting point instead of guessing every session.", track: "Track it", trackValue: "Built for Logbook", trackCopy: "Take the plan into Logbook so you can see what you actually did over time.", popularEyebrow: "Popular workout templates", popularTitle: "Start with the workout templates most people can use immediately.", popularCopy: "These are practical starting points if you want a plan before sorting through every template.", goalsEyebrow: "Goal categories", goalsTitle: "Start with the outcome you want.", goalsCopy: "Choose the workout category that best matches your current goal, then narrow down from there.", exploreGoal: "Explore {goal} workouts", emptyLabel: "Workout templates", emptyTitle: "The public workout library is being refreshed.", emptyCopy: "The templates will appear automatically when the current data sync finishes.",
  },
  directory: { eyebrow: "Workout finder", title: "Search by goal, difficulty, or training style.", copy: "Browse ready-to-use workout templates for beginners, muscle building, fat loss, and strength work.", searchLabel: "Search workouts", searchPlaceholder: "Search push day, full body, strength...", goal: "Goal", allGoals: "All goals", difficulty: "Difficulty", allDifficulties: "All difficulties", resultSingular: "workout template", resultPlural: "workout templates", resultCopy: "Use the directory to find a starting point that matches your goal and schedule.", empty: "No workout templates matched that search. Try a broader goal, simpler keyword, or different difficulty." },
  goal: { eyebrow: "Workout goal", templates: "Templates", templatesCopy: "Workout templates currently listed in this goal category.", startingPoint: "Starting point", startingValue: "Structured sessions", startingCopy: "Use these pages when you want more structure than random exercise selection.", track: "Track it", trackValue: "Logbook ready", trackCopy: "Pick a template, then use Logbook to see how consistently you follow it.", relatedEyebrow: "Related exercises", relatedTitle: "Exercises commonly used for this goal.", relatedCopy: "Review these movements before adding the full template to your training.", emptyLabel: "No templates yet", emptyTitle: "This category is ready, but its public templates are still syncing.", emptyCopy: "Templates for this goal will appear when the workout data is available." },
  detail: { eyebrow: "Workout template", goal: "Goal", goalCopy: "The primary goal recorded for this template.", difficulty: "Difficulty", difficultyCopy: "The intended experience level and programming complexity.", duration: "Duration", durationCopy: "The estimated length of each training session.", flexible: "Flexible", whoFor: "Who it is for", generalUsers: "General users", whoForCopy: "People looking for a {goal} workout at a {difficulty} level.", equipment: "Equipment", minimalSetup: "Minimal setup", equipmentCopy: "The main equipment required to run the workout as written.", trainingDays: "Training days", dayPerWeek: "{count} day / week", daysPerWeek: "{count} days / week", trainingDaysCopy: "The number of weekly sessions in the template.", warmup: "Warm-up guidance", warmupCopy: "Start each session with a short general warm-up and lighter sets before the first main lift.", progression: "Progression guidance", progressionCopy: "Progress gradually by improving reps, load, or consistency one step at a time.", tableEyebrow: "Exercise table", tableTitle: "What this workout includes.", tableCopy: "Review each exercise and its basic set, rep, and rest guidance.", exercise: "Exercise", section: "Section", sets: "Sets", reps: "Reps", rest: "Rest", notes: "Notes", exerciseSingular: "exercise", exercisePlural: "exercises", mainWork: "Main work", asWritten: "As written", selfPaced: "Self-paced", followTargets: "Follow the listed set, rep, and rest targets.", substitutionsEyebrow: "Exercise substitutions", substitutionsTitle: "Simple swaps if you need another option.", substitutionsCopy: "These substitutions stay in the same training role so you can adjust the workout without rebuilding it.", noSubstitution: "No close substitution is listed for this exercise.", relatedExercisesEyebrow: "Related exercises", relatedExercisesTitle: "Learn the main movements before using the template.", relatedExercisesCopy: "These pages explain the lifts, machines, and accessories used in this workout.", relatedWorkoutsEyebrow: "Related workouts", relatedWorkoutsTitle: "More templates for a similar goal.", relatedWorkoutsCopy: "Compare a different split, equipment setup, or template in the same direction.", faqEyebrow: "FAQ", faqTitle: "Common questions about {name}.", faqQuestions: ["Who is {name} best for?", "How often should I use {name}?", "Can I swap exercises in {name}?", "How do I progress this workout over time?"], faqAnswers: ["This template is designed for people who want a {goal} plan at a {difficulty} level.", "Use the listed weekly schedule while allowing enough recovery between sessions.", "Yes. Choose substitutions with the same main muscle group, movement pattern, and training role.", "Improve load, reps, technique, or consistency gradually instead of changing the whole workout every week."] },
  card: { flexibleDuration: "Flexible duration", minimalEquipment: "Minimal equipment", view: "View workout" },
  disclaimer: { label: "Disclaimer", message: "Training involves risk of injury. Use appropriate technique, equipment, and judgment, and choose a plan that fits your abilities. This content is for general informational purposes and is not medical advice." },
  cta: { indexTitle: "Want to track your workouts for free in Logbook?", indexCopy: "Use Logbook to turn these templates into training history with logged sets, reps, and exercise progress.", goalTitle: "Track this workout goal for free in Logbook.", goalCopy: "Choose a direction, log your sessions, and see which plan you consistently follow.", detailTitle: "Track this workout for free in Logbook.", detailCopy: "Save sets, reps, load, and exercise history so you can see whether the plan is working." },
};

const spanish: WorkoutMessages = {
  seo: { indexTitle: "Plantillas de entrenamiento", indexDescription: "Explora plantillas para principiantes, perdida de grasa, desarrollo muscular y fuerza con ejercicios, series, repeticiones y descansos.", goalFallbackTitle: "Categoria de entrenamiento", goalFallbackDescription: "Explora plantillas organizadas por objetivo de entrenamiento.", detailTitle: "{name}: plan de entrenamiento", detailDescription: "Explora {name} con ejercicios, series, repeticiones, descansos y orientacion de progresion." },
  index: { eyebrow: "Entrenamientos", title: "Encuentra plantillas de entrenamiento que puedas usar y repetir.", intro: "Explora planes estructurados para principiantes, perdida de grasa, desarrollo muscular y fuerza, y usa Logbook para registrar tu progreso.", browseExercises: "Explorar ejercicios", useGenerator: "Usar generador de entrenamientos", templates: "Plantillas", templatesCopy: "Plantillas publicas disponibles actualmente en la biblioteca.", format: "Formato", formatValue: "Ejercicios, series, repeticiones y descanso", formatCopy: "Usa una estructura clara en lugar de improvisar cada sesion.", track: "Registralo", trackValue: "Creado para Logbook", trackCopy: "Lleva el plan a Logbook para revisar lo que realmente hiciste.", popularEyebrow: "Entrenamientos populares", popularTitle: "Comienza con plantillas que puedes usar de inmediato.", popularCopy: "Son puntos de partida practicos si quieres un plan antes de revisar toda la biblioteca.", goalsEyebrow: "Objetivos", goalsTitle: "Comienza por el resultado que buscas.", goalsCopy: "Elige la categoria que mejor coincida con tu objetivo actual.", exploreGoal: "Explorar entrenamientos de {goal}", emptyLabel: "Plantillas de entrenamiento", emptyTitle: "La biblioteca publica se esta actualizando.", emptyCopy: "Las plantillas apareceran automaticamente cuando termine la sincronizacion." },
  directory: { eyebrow: "Buscador de entrenamientos", title: "Busca por objetivo, dificultad o estilo.", copy: "Explora plantillas para principiantes, desarrollo muscular, perdida de grasa y fuerza.", searchLabel: "Buscar entrenamientos", searchPlaceholder: "Dia de empuje, cuerpo completo, fuerza...", goal: "Objetivo", allGoals: "Todos los objetivos", difficulty: "Dificultad", allDifficulties: "Todas las dificultades", resultSingular: "plantilla", resultPlural: "plantillas", resultCopy: "Encuentra un punto de partida acorde con tu objetivo y horario.", empty: "Ninguna plantilla coincide con la busqueda. Prueba un objetivo o termino mas amplio." },
  goal: { eyebrow: "Objetivo de entrenamiento", templates: "Plantillas", templatesCopy: "Plantillas incluidas actualmente en esta categoria.", startingPoint: "Punto de partida", startingValue: "Sesiones estructuradas", startingCopy: "Usa estos planes cuando quieras mas estructura que una seleccion al azar.", track: "Registralo", trackValue: "Listo para Logbook", trackCopy: "Elige una plantilla y usa Logbook para registrar tu constancia.", relatedEyebrow: "Ejercicios relacionados", relatedTitle: "Ejercicios usados habitualmente para este objetivo.", relatedCopy: "Revisa estos movimientos antes de agregar la plantilla completa.", emptyLabel: "Aun no hay plantillas", emptyTitle: "La categoria esta lista, pero sus plantillas siguen sincronizandose.", emptyCopy: "Apareceran cuando los datos esten disponibles." },
  detail: { eyebrow: "Plantilla de entrenamiento", goal: "Objetivo", goalCopy: "El objetivo principal registrado para esta plantilla.", difficulty: "Dificultad", difficultyCopy: "El nivel de experiencia y complejidad previstos.", duration: "Duracion", durationCopy: "La duracion estimada de cada sesion.", flexible: "Flexible", whoFor: "Para quien es", generalUsers: "Usuarios generales", whoForCopy: "Personas que buscan un plan de {goal} con dificultad {difficulty}.", equipment: "Equipo", minimalSetup: "Equipo minimo", equipmentCopy: "El equipo principal necesario para seguir el plan.", trainingDays: "Dias de entrenamiento", dayPerWeek: "{count} dia / semana", daysPerWeek: "{count} dias / semana", trainingDaysCopy: "La cantidad de sesiones semanales de la plantilla.", warmup: "Calentamiento", warmupCopy: "Comienza con un calentamiento general breve y series ligeras antes del primer ejercicio principal.", progression: "Progresion", progressionCopy: "Progresa gradualmente mejorando repeticiones, carga o constancia paso a paso.", tableEyebrow: "Tabla de ejercicios", tableTitle: "Que incluye este entrenamiento.", tableCopy: "Revisa cada ejercicio y las series, repeticiones y descansos basicos.", exercise: "Ejercicio", section: "Seccion", sets: "Series", reps: "Repeticiones", rest: "Descanso", notes: "Notas", exerciseSingular: "ejercicio", exercisePlural: "ejercicios", mainWork: "Trabajo principal", asWritten: "Segun el plan", selfPaced: "A tu ritmo", followTargets: "Sigue los objetivos indicados de series, repeticiones y descanso.", substitutionsEyebrow: "Sustituciones", substitutionsTitle: "Cambios sencillos si necesitas otra opcion.", substitutionsCopy: "Estas opciones mantienen una funcion de entrenamiento similar.", noSubstitution: "No hay una sustitucion cercana para este ejercicio.", relatedExercisesEyebrow: "Ejercicios relacionados", relatedExercisesTitle: "Aprende los movimientos principales antes de usar la plantilla.", relatedExercisesCopy: "Estas paginas explican los ejercicios y accesorios del entrenamiento.", relatedWorkoutsEyebrow: "Entrenamientos relacionados", relatedWorkoutsTitle: "Mas plantillas para un objetivo similar.", relatedWorkoutsCopy: "Compara otra division, equipo o plantilla con una direccion parecida.", faqEyebrow: "Preguntas frecuentes", faqTitle: "Preguntas comunes sobre {name}.", faqQuestions: ["Para quien es mejor {name}?", "Con que frecuencia debo usar {name}?", "Puedo cambiar ejercicios en {name}?", "Como progreso este entrenamiento con el tiempo?"], faqAnswers: ["Esta plantilla es para personas que buscan un plan de {goal} con dificultad {difficulty}.", "Usa el horario semanal indicado y deja suficiente recuperacion entre sesiones.", "Si. Elige sustituciones con el mismo grupo muscular, patron de movimiento y funcion.", "Mejora gradualmente la carga, las repeticiones, la tecnica o la constancia."] },
  card: { flexibleDuration: "Duracion flexible", minimalEquipment: "Equipo minimo", view: "Ver entrenamiento" },
  disclaimer: { label: "Aviso", message: "El entrenamiento implica riesgo de lesiones. Usa tecnica, equipo y criterio adecuados, y elige un plan acorde con tus capacidades. Este contenido es informativo y no constituye consejo medico." },
  cta: { indexTitle: "Quieres registrar tus entrenamientos gratis en Logbook?", indexCopy: "Usa Logbook para convertir estas plantillas en un historial de series, repeticiones y progreso.", goalTitle: "Registra este objetivo gratis en Logbook.", goalCopy: "Elige una direccion, registra tus sesiones y comprueba que plan sigues con constancia.", detailTitle: "Registra este entrenamiento gratis en Logbook.", detailCopy: "Guarda series, repeticiones, carga e historial para saber si el plan funciona." },
};

const portuguese: WorkoutMessages = {
  seo: { indexTitle: "Modelos de treino", indexDescription: "Explore modelos para iniciantes, perda de gordura, ganho muscular e forca com exercicios, series, repeticoes e descanso.", goalFallbackTitle: "Categoria de treino", goalFallbackDescription: "Explore modelos organizados por objetivo de treino.", detailTitle: "{name}: plano de treino", detailDescription: "Explore {name} com exercicios, series, repeticoes, descanso e orientacao de progressao." },
  index: { eyebrow: "Treinos", title: "Encontre modelos de treino que voce possa usar e repetir.", intro: "Explore planos estruturados para iniciantes, perda de gordura, ganho muscular e forca, e use o Logbook para acompanhar o progresso.", browseExercises: "Explorar exercicios", useGenerator: "Usar gerador de treinos", templates: "Modelos", templatesCopy: "Modelos publicos disponiveis atualmente na biblioteca.", format: "Formato", formatValue: "Exercicios, series, repeticoes e descanso", formatCopy: "Use uma estrutura clara em vez de improvisar a cada sessao.", track: "Registre", trackValue: "Feito para o Logbook", trackCopy: "Leve o plano para o Logbook e veja o que voce realmente fez.", popularEyebrow: "Treinos populares", popularTitle: "Comece por modelos que voce pode usar imediatamente.", popularCopy: "Sao pontos de partida praticos antes de explorar toda a biblioteca.", goalsEyebrow: "Objetivos", goalsTitle: "Comece pelo resultado que voce busca.", goalsCopy: "Escolha a categoria que melhor corresponde ao seu objetivo atual.", exploreGoal: "Explorar treinos de {goal}", emptyLabel: "Modelos de treino", emptyTitle: "A biblioteca publica esta sendo atualizada.", emptyCopy: "Os modelos aparecerao automaticamente quando a sincronizacao terminar." },
  directory: { eyebrow: "Busca de treinos", title: "Busque por objetivo, dificuldade ou estilo.", copy: "Explore modelos para iniciantes, ganho muscular, perda de gordura e forca.", searchLabel: "Buscar treinos", searchPlaceholder: "Dia de empurrar, corpo inteiro, forca...", goal: "Objetivo", allGoals: "Todos os objetivos", difficulty: "Dificuldade", allDifficulties: "Todas as dificuldades", resultSingular: "modelo", resultPlural: "modelos", resultCopy: "Encontre um ponto de partida adequado ao seu objetivo e agenda.", empty: "Nenhum modelo corresponde a busca. Tente um objetivo ou termo mais amplo." },
  goal: { eyebrow: "Objetivo de treino", templates: "Modelos", templatesCopy: "Modelos incluidos atualmente nesta categoria.", startingPoint: "Ponto de partida", startingValue: "Sessoes estruturadas", startingCopy: "Use estes planos quando quiser mais estrutura do que uma selecao aleatoria.", track: "Registre", trackValue: "Pronto para o Logbook", trackCopy: "Escolha um modelo e use o Logbook para acompanhar sua consistencia.", relatedEyebrow: "Exercicios relacionados", relatedTitle: "Exercicios usados com frequencia para este objetivo.", relatedCopy: "Revise estes movimentos antes de adicionar o modelo completo.", emptyLabel: "Ainda nao ha modelos", emptyTitle: "A categoria esta pronta, mas os modelos ainda estao sincronizando.", emptyCopy: "Eles aparecerao quando os dados estiverem disponiveis." },
  detail: { eyebrow: "Modelo de treino", goal: "Objetivo", goalCopy: "O principal objetivo registrado para este modelo.", difficulty: "Dificuldade", difficultyCopy: "O nivel de experiencia e complexidade previstos.", duration: "Duracao", durationCopy: "A duracao estimada de cada sessao.", flexible: "Flexivel", whoFor: "Para quem e", generalUsers: "Usuarios em geral", whoForCopy: "Pessoas que buscam um plano de {goal} com dificuldade {difficulty}.", equipment: "Equipamento", minimalSetup: "Equipamento minimo", equipmentCopy: "O principal equipamento necessario para seguir o plano.", trainingDays: "Dias de treino", dayPerWeek: "{count} dia / semana", daysPerWeek: "{count} dias / semana", trainingDaysCopy: "A quantidade de sessoes semanais do modelo.", warmup: "Aquecimento", warmupCopy: "Comece com um aquecimento geral curto e series leves antes do primeiro exercicio principal.", progression: "Progressao", progressionCopy: "Progrida aos poucos melhorando repeticoes, carga ou consistencia.", tableEyebrow: "Tabela de exercicios", tableTitle: "O que este treino inclui.", tableCopy: "Confira cada exercicio e as orientacoes basicas de series, repeticoes e descanso.", exercise: "Exercicio", section: "Secao", sets: "Series", reps: "Repeticoes", rest: "Descanso", notes: "Observacoes", exerciseSingular: "exercicio", exercisePlural: "exercicios", mainWork: "Trabalho principal", asWritten: "Conforme o plano", selfPaced: "No seu ritmo", followTargets: "Siga as metas indicadas de series, repeticoes e descanso.", substitutionsEyebrow: "Substituicoes", substitutionsTitle: "Trocas simples se voce precisar de outra opcao.", substitutionsCopy: "Estas opcoes mantem uma funcao de treino semelhante.", noSubstitution: "Nao ha uma substituicao proxima para este exercicio.", relatedExercisesEyebrow: "Exercicios relacionados", relatedExercisesTitle: "Aprenda os movimentos principais antes de usar o modelo.", relatedExercisesCopy: "Estas paginas explicam os exercicios e acessorios deste treino.", relatedWorkoutsEyebrow: "Treinos relacionados", relatedWorkoutsTitle: "Mais modelos para um objetivo semelhante.", relatedWorkoutsCopy: "Compare outra divisao, equipamento ou modelo na mesma direcao.", faqEyebrow: "Perguntas frequentes", faqTitle: "Perguntas comuns sobre {name}.", faqQuestions: ["Para quem {name} e mais indicado?", "Com que frequencia devo usar {name}?", "Posso trocar exercicios em {name}?", "Como progredir este treino ao longo do tempo?"], faqAnswers: ["Este modelo e para pessoas que buscam um plano de {goal} com dificuldade {difficulty}.", "Use a agenda semanal indicada e permita recuperacao suficiente entre as sessoes.", "Sim. Escolha substituicoes com o mesmo grupo muscular, padrao de movimento e funcao.", "Melhore carga, repeticoes, tecnica ou consistencia gradualmente."] },
  card: { flexibleDuration: "Duracao flexivel", minimalEquipment: "Equipamento minimo", view: "Ver treino" },
  disclaimer: { label: "Aviso", message: "O treinamento envolve risco de lesoes. Use tecnica, equipamento e criterio adequados e escolha um plano compativel com suas capacidades. Este conteudo e informativo e nao constitui orientacao medica." },
  cta: { indexTitle: "Quer registrar seus treinos gratis no Logbook?", indexCopy: "Use o Logbook para transformar estes modelos em um historico de series, repeticoes e progresso.", goalTitle: "Registre este objetivo gratis no Logbook.", goalCopy: "Escolha uma direcao, registre suas sessoes e veja qual plano voce segue com consistencia.", detailTitle: "Registre este treino gratis no Logbook.", detailCopy: "Salve series, repeticoes, carga e historico para saber se o plano esta funcionando." },
};

const messagesByLocale: Record<Locale, WorkoutMessages> = {
  en: english,
  "es-419": spanish,
  "pt-BR": portuguese,
};

const workoutNames: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "es-419": {
    "3-Day Full Body Split": "Rutina de cuerpo completo de 3 dias", "30-Minute Fat Loss Workout": "Entrenamiento de 30 minutos para perder grasa", "4-Day Upper Lower Split": "Rutina torso-pierna de 4 dias", "5-Day Bodybuilding Split": "Rutina de culturismo de 5 dias", "Arm Workout": "Entrenamiento de brazos", "Back and Biceps Workout": "Entrenamiento de espalda y biceps", "Beginner Dumbbell Workout": "Entrenamiento con mancuernas para principiantes", "Beginner Full Body Workout": "Entrenamiento de cuerpo completo para principiantes", "Beginner Gym Workout": "Entrenamiento de gimnasio para principiantes", "Beginner Home Workout": "Entrenamiento en casa para principiantes", "Beginner Strength Program": "Programa de fuerza para principiantes", "Beginner Weight Loss Workout": "Entrenamiento para perder peso para principiantes", "Bench Press-Focused Workout": "Entrenamiento enfocado en press de banca", "Busy Schedule 3-Day Workout": "Entrenamiento de 3 dias para agendas ocupadas", "Chest and Triceps Workout": "Entrenamiento de pecho y triceps", "Core Workout": "Entrenamiento de core", "Deadlift-Focused Workout": "Entrenamiento enfocado en peso muerto", "Glute Workout": "Entrenamiento de gluteos", "Hotel Gym Workout": "Entrenamiento para gimnasio de hotel", "Leg Day Workout": "Entrenamiento de piernas", "Low-Impact Workout": "Entrenamiento de bajo impacto", "Lower Body Workout": "Entrenamiento de tren inferior", "Powerlifting Beginner Program": "Programa de powerlifting para principiantes", "Pull Day Workout": "Entrenamiento de tiron", "Push Day Workout": "Entrenamiento de empuje", "Shoulder Workout": "Entrenamiento de hombros", "Squat-Focused Workout": "Entrenamiento enfocado en sentadilla", "Strength and Hypertrophy Workout": "Entrenamiento de fuerza e hipertrofia", "Upper Body Workout": "Entrenamiento de tren superior", "Walking and Strength Workout": "Entrenamiento de caminata y fuerza",
  },
  "pt-BR": {
    "3-Day Full Body Split": "Treino de corpo inteiro em 3 dias", "30-Minute Fat Loss Workout": "Treino de 30 minutos para perda de gordura", "4-Day Upper Lower Split": "Treino superior-inferior em 4 dias", "5-Day Bodybuilding Split": "Treino de fisiculturismo em 5 dias", "Arm Workout": "Treino de bracos", "Back and Biceps Workout": "Treino de costas e biceps", "Beginner Dumbbell Workout": "Treino com halteres para iniciantes", "Beginner Full Body Workout": "Treino de corpo inteiro para iniciantes", "Beginner Gym Workout": "Treino de academia para iniciantes", "Beginner Home Workout": "Treino em casa para iniciantes", "Beginner Strength Program": "Programa de forca para iniciantes", "Beginner Weight Loss Workout": "Treino para perda de peso para iniciantes", "Bench Press-Focused Workout": "Treino com foco no supino", "Busy Schedule 3-Day Workout": "Treino de 3 dias para rotina corrida", "Chest and Triceps Workout": "Treino de peito e triceps", "Core Workout": "Treino de core", "Deadlift-Focused Workout": "Treino com foco no levantamento terra", "Glute Workout": "Treino de gluteos", "Hotel Gym Workout": "Treino para academia de hotel", "Leg Day Workout": "Treino de pernas", "Low-Impact Workout": "Treino de baixo impacto", "Lower Body Workout": "Treino de membros inferiores", "Powerlifting Beginner Program": "Programa de powerlifting para iniciantes", "Pull Day Workout": "Treino de puxar", "Push Day Workout": "Treino de empurrar", "Shoulder Workout": "Treino de ombros", "Squat-Focused Workout": "Treino com foco no agachamento", "Strength and Hypertrophy Workout": "Treino de forca e hipertrofia", "Upper Body Workout": "Treino de membros superiores", "Walking and Strength Workout": "Treino de caminhada e forca",
  },
};

const goalCopy: Record<Exclude<Locale, "en">, Record<string, Pick<WorkoutGoalInfo, "title" | "label" | "description">>> = {
  "es-419": {
    "weight-loss": { title: "Entrenamientos para perder peso", label: "Perdida de peso", description: "Explora plantillas que apoyan la perdida de grasa con una estructura realista de fuerza y acondicionamiento." },
    "muscle-building": { title: "Entrenamientos para desarrollar musculo", label: "Desarrollo muscular", description: "Explora plantillas para hipertrofia, mejor estructura y progreso constante en el gimnasio." },
    beginner: { title: "Entrenamientos para principiantes", label: "Principiantes", description: "Explora plantillas sencillas con ejercicios claros y una progresion facil de seguir." },
    strength: { title: "Entrenamientos de fuerza", label: "Fuerza", description: "Explora plantillas centradas en los levantamientos principales y un progreso repetible." },
  },
  "pt-BR": {
    "weight-loss": { title: "Treinos para perda de peso", label: "Perda de peso", description: "Explore modelos que apoiam a perda de gordura com uma estrutura realista de forca e condicionamento." },
    "muscle-building": { title: "Treinos para ganho muscular", label: "Ganho muscular", description: "Explore modelos para hipertrofia, melhor estrutura e progresso consistente na academia." },
    beginner: { title: "Treinos para iniciantes", label: "Iniciantes", description: "Explore modelos simples com exercicios claros e progressao facil de acompanhar." },
    strength: { title: "Treinos de forca", label: "Forca", description: "Explore modelos focados nos principais levantamentos e em progresso repetivel." },
  },
};

export function getWorkoutMessages(locale: Locale) {
  return messagesByLocale[locale];
}

export function localizeWorkoutName(name: string, locale: Locale) {
  if (locale === "en") return name;
  return workoutNames[locale][name] ?? name;
}

export function localizeWorkoutGoal(goal: WorkoutGoalInfo, locale: Locale): WorkoutGoalInfo {
  if (locale === "en") return goal;
  return { ...goal, ...(goalCopy[locale][goal.slug] ?? {}) };
}

export function localizeWorkoutGoalLabel(goal: string | null, locale: Locale) {
  if (!goal) return locale === "es-419" ? "Condicion fisica general" : locale === "pt-BR" ? "Condicionamento geral" : "General fitness";
  const translated = locale === "en" ? undefined : goalCopy[locale][goal];
  if (translated) return translated.label;
  return goal.split(/[-_\s]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function localizeWorkoutSummary(template: WorkoutTemplateRecord, locale: Locale) {
  const name = localizeWorkoutName(template.name, locale);
  const goal = localizeWorkoutGoalLabel(template.goal, locale).toLocaleLowerCase(locale);
  const days = template.trainingDaysPerWeek;
  const duration = template.estimatedDurationMinutes;
  if (locale === "es-419") return `${name} es un plan de ${days ? `${days} dias` : "horario flexible"} para ${goal}.${duration ? ` Cada sesion dura aproximadamente ${duration} minutos.` : ""}`;
  if (locale === "pt-BR") return `${name} e um plano de ${days ? `${days} dias` : "agenda flexivel"} para ${goal}.${duration ? ` Cada sessao dura aproximadamente ${duration} minutos.` : ""}`;
  return `${name} is a ${days ? `${days}-day` : "flexible-schedule"} workout for ${goal}.${duration ? ` Sessions take about ${duration} minutes.` : ""}`;
}

export function localizeWorkoutDayLabel(value: string | null, locale: Locale) {
  if (!value) return locale === "es-419" ? "Sesion" : locale === "pt-BR" ? "Sessao" : "Session";
  if (locale === "es-419") return value.replace(/^Day\s+/i, "Dia ");
  if (locale === "pt-BR") return value.replace(/^Day\s+/i, "Dia ");
  return value;
}

