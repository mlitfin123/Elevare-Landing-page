import type { Locale } from "./config.ts";
import { getCatalogMessages } from "./catalog-messages.ts";
import type { NutritionProduct } from "../nutrition-data.ts";
import type { ExerciseRecord } from "../training-data.ts";

type PhraseMap = Record<string, string>;

const exerciseNamePhrases: Record<Exclude<Locale, "en">, PhraseMap> = {
  "es-419": {
    "bench press": "press de banca",
    "chest press": "press de pecho",
    "shoulder press": "press de hombros",
    "military press": "press militar",
    "leg press": "prensa de piernas",
    "lat pulldown": "jalon al pecho",
    "pull-up": "dominada",
    "pullup": "dominada",
    "push-up": "flexion",
    "pushup": "flexion",
    "romanian deadlift": "peso muerto rumano",
    "stiff-legged deadlift": "peso muerto con piernas rigidas",
    "deadlift": "peso muerto",
    "hip thrust": "empuje de cadera",
    "glute bridge": "puente de gluteos",
    "lateral raise": "elevacion lateral",
    "front raise": "elevacion frontal",
    "bicep curl": "curl de biceps",
    "biceps curl": "curl de biceps",
    "triceps extension": "extension de triceps",
    "triceps pushdown": "jalon de triceps",
    "calf raise": "elevacion de pantorrillas",
    "leg extension": "extension de piernas",
    "leg curl": "curl femoral",
    "hamstring curl": "curl femoral",
    "goblet squat": "sentadilla goblet",
    "split squat": "sentadilla dividida",
    "squat": "sentadilla",
    "lunge": "zancada",
    "row": "remo",
    "plank": "plancha",
    "crunch": "abdominal corto",
    "sit-up": "abdominal",
    "dumbbell": "con mancuernas",
    "barbell": "con barra",
    "cable": "en polea",
    "machine": "en maquina",
    "bodyweight": "con peso corporal",
    "kettlebell": "con pesa rusa",
    "incline": "inclinado",
    "decline": "declinado",
    "seated": "sentado",
    "standing": "de pie",
    "lying": "acostado",
    "one-arm": "a un brazo",
    "single-arm": "a un brazo",
    "single-leg": "a una pierna",
    "wide-grip": "con agarre ancho",
    "close-grip": "con agarre cerrado",
    "reverse-grip": "con agarre inverso",
    "overhead": "sobre la cabeza",
    "rear delt": "deltoide posterior",
    "chest": "pecho",
    "back": "espalda",
    "shoulder": "hombro",
    "triceps": "triceps",
    "biceps": "biceps",
    "glute": "gluteo",
    "abdominal": "abdominal",
  },
  "pt-BR": {
    "bench press": "supino",
    "chest press": "supino maquina",
    "shoulder press": "desenvolvimento de ombros",
    "military press": "desenvolvimento militar",
    "leg press": "leg press",
    "lat pulldown": "puxada alta",
    "pull-up": "barra fixa",
    "pullup": "barra fixa",
    "push-up": "flexao",
    "pushup": "flexao",
    "romanian deadlift": "levantamento terra romeno",
    "stiff-legged deadlift": "levantamento terra com pernas rigidas",
    "deadlift": "levantamento terra",
    "hip thrust": "elevacao pelvica",
    "glute bridge": "ponte de gluteos",
    "lateral raise": "elevacao lateral",
    "front raise": "elevacao frontal",
    "bicep curl": "rosca de biceps",
    "biceps curl": "rosca de biceps",
    "triceps extension": "extensao de triceps",
    "triceps pushdown": "triceps na polia",
    "calf raise": "elevacao de panturrilhas",
    "leg extension": "cadeira extensora",
    "leg curl": "mesa flexora",
    "hamstring curl": "flexao de joelhos",
    "goblet squat": "agachamento goblet",
    "split squat": "agachamento unilateral",
    "squat": "agachamento",
    "lunge": "avanco",
    "row": "remada",
    "plank": "prancha",
    "crunch": "abdominal curto",
    "sit-up": "abdominal",
    "dumbbell": "com halteres",
    "barbell": "com barra",
    "cable": "na polia",
    "machine": "na maquina",
    "bodyweight": "com peso corporal",
    "kettlebell": "com kettlebell",
    "incline": "inclinado",
    "decline": "declinado",
    "seated": "sentado",
    "standing": "em pe",
    "lying": "deitado",
    "one-arm": "unilateral",
    "single-arm": "unilateral",
    "single-leg": "unilateral",
    "wide-grip": "com pegada aberta",
    "close-grip": "com pegada fechada",
    "reverse-grip": "com pegada invertida",
    "overhead": "acima da cabeca",
    "rear delt": "deltoide posterior",
    "chest": "peito",
    "back": "costas",
    "shoulder": "ombro",
    "triceps": "triceps",
    "biceps": "biceps",
    "glute": "gluteo",
    "abdominal": "abdominal",
  },
};

const exerciseTextPhrases: Record<Exclude<Locale, "en">, PhraseMap> = {
  "es-419": {
    "This will be your starting position.": "Esta sera tu posicion inicial.",
    "This is your starting position.": "Esta es tu posicion inicial.",
    "Repeat for the recommended amount of repetitions.": "Repite el numero recomendado de repeticiones.",
    "Repeat the movement for the prescribed amount of repetitions of your training program.": "Repite el movimiento durante el numero de repeticiones indicado en tu programa.",
    "After a brief pause, return to the starting position.": "Despues de una pausa breve, vuelve a la posicion inicial.",
    "Keep your back straight.": "Manten la espalda recta.",
    "Keep your head and chest up.": "Manten la cabeza y el pecho elevados.",
    "Slowly lower the weight back to the starting position.": "Baja el peso lentamente hasta la posicion inicial.",
    "Builds strength and control through the chest region.": "Desarrolla fuerza y control en el pecho.",
    "Builds strength and control through the back region.": "Desarrolla fuerza y control en la espalda.",
    "Builds strength and control through the legs region.": "Desarrolla fuerza y control en las piernas.",
    "Builds strength and control through the shoulders region.": "Desarrolla fuerza y control en los hombros.",
    "Builds strength and control through the arms region.": "Desarrolla fuerza y control en los brazos.",
    "Builds strength and control through the core region.": "Desarrolla fuerza y control en el core.",
    "Builds strength and control through the glutes region.": "Desarrolla fuerza y control en los gluteos.",
    "Trains multiple joints at once, which can make your sessions more efficient.": "Trabaja varias articulaciones a la vez y puede hacer tus sesiones mas eficientes.",
    "Makes it easier to focus on one area when you want extra practice or volume.": "Facilita enfocarte en una zona cuando quieres mas practica o volumen.",
    "Gives you a repeatable way to track progress inside Logbook over time.": "Te da una forma repetible de medir tu progreso en Logbook.",
    "Using more weight or speed than you can control cleanly.": "Usar mas peso o velocidad de lo que puedes controlar con buena tecnica.",
    "Skipping the setup and losing tension before the first rep starts.": "Omitir la preparacion y perder tension antes de la primera repeticion.",
    "Cutting the range of motion short and rushing through the reps.": "Acortar el rango de movimiento y apresurar las repeticiones.",
    "Letting momentum do the work instead of controlling the full rep.": "Dejar que el impulso haga el trabajo en vez de controlar toda la repeticion.",
    "Changing your body position between reps instead of keeping the movement repeatable.": "Cambiar la posicion del cuerpo entre repeticiones en vez de mantener un movimiento repetible.",
  },
  "pt-BR": {
    "This will be your starting position.": "Esta sera sua posicao inicial.",
    "This is your starting position.": "Esta e sua posicao inicial.",
    "Repeat for the recommended amount of repetitions.": "Repita o numero recomendado de repeticoes.",
    "Repeat the movement for the prescribed amount of repetitions of your training program.": "Repita o movimento pelo numero de repeticoes indicado no seu programa.",
    "After a brief pause, return to the starting position.": "Apos uma breve pausa, volte a posicao inicial.",
    "Keep your back straight.": "Mantenha as costas retas.",
    "Keep your head and chest up.": "Mantenha a cabeca e o peito elevados.",
    "Slowly lower the weight back to the starting position.": "Abaixe o peso lentamente ate a posicao inicial.",
    "Builds strength and control through the chest region.": "Desenvolve forca e controle no peito.",
    "Builds strength and control through the back region.": "Desenvolve forca e controle nas costas.",
    "Builds strength and control through the legs region.": "Desenvolve forca e controle nas pernas.",
    "Builds strength and control through the shoulders region.": "Desenvolve forca e controle nos ombros.",
    "Builds strength and control through the arms region.": "Desenvolve forca e controle nos bracos.",
    "Builds strength and control through the core region.": "Desenvolve forca e controle no core.",
    "Builds strength and control through the glutes region.": "Desenvolve forca e controle nos gluteos.",
    "Trains multiple joints at once, which can make your sessions more efficient.": "Trabalha varias articulacoes ao mesmo tempo e pode tornar o treino mais eficiente.",
    "Makes it easier to focus on one area when you want extra practice or volume.": "Facilita o foco em uma regiao quando voce quer mais pratica ou volume.",
    "Gives you a repeatable way to track progress inside Logbook over time.": "Oferece uma forma repetivel de acompanhar seu progresso no Logbook.",
    "Using more weight or speed than you can control cleanly.": "Usar mais peso ou velocidade do que voce consegue controlar com boa tecnica.",
    "Skipping the setup and losing tension before the first rep starts.": "Ignorar a preparacao e perder tensao antes da primeira repeticao.",
    "Cutting the range of motion short and rushing through the reps.": "Encurtar a amplitude e apressar as repeticoes.",
    "Letting momentum do the work instead of controlling the full rep.": "Deixar o impulso fazer o trabalho em vez de controlar toda a repeticao.",
    "Changing your body position between reps instead of keeping the movement repeatable.": "Mudar a posicao do corpo entre repeticoes em vez de manter o movimento consistente.",
  },
};

const nutritionPhrases: Record<Exclude<Locale, "en">, PhraseMap> = {
  "es-419": {
    "side salad": "ensalada de acompanamiento", "kids drink": "bebida infantil", "kids side": "acompanamiento infantil", "kids menu": "menu infantil", "miscellaneous drinks": "bebidas", "dessert shake": "batido de postre", "slow roasted beef": "carne de res asada lentamente", "breakfast": "desayuno", "toppings": "toppings", "treats": "dulces", "dessert": "postre", "burger": "hamburguesa", "sandwich": "sandwich", "salad": "ensalada", "soup": "sopa", "bowl": "tazon", "side": "acompanamiento", "drink": "bebida", "beverage": "bebida", "chicken": "pollo", "grilled": "a la parrilla", "cheese": "queso", "bacon": "tocino", "fries": "papas fritas", "rice": "arroz", "beans": "frijoles", "steak": "carne", "shrimp": "camarones", "milk": "leche", "chocolate": "chocolate", "apple juice": "jugo de manzana", "with": "con", "classic": "clasica", "small": "pequeno", "medium": "mediano", "large": "grande", "serving": "porcion", "slice": "rebanada", "piece": "pieza", "cup": "taza", "bottle": "botella", "packet": "paquete", "order": "orden",
  },
  "pt-BR": {
    "side salad": "salada de acompanhamento", "kids drink": "bebida infantil", "kids side": "acompanhamento infantil", "kids menu": "menu infantil", "miscellaneous drinks": "bebidas", "dessert shake": "milk-shake de sobremesa", "slow roasted beef": "carne bovina assada lentamente", "breakfast": "cafe da manha", "toppings": "coberturas", "treats": "doces", "dessert": "sobremesa", "burger": "hamburguer", "sandwich": "sanduiche", "salad": "salada", "soup": "sopa", "bowl": "tigela", "side": "acompanhamento", "drink": "bebida", "beverage": "bebida", "chicken": "frango", "grilled": "grelhado", "cheese": "queijo", "bacon": "bacon", "fries": "batatas fritas", "rice": "arroz", "beans": "feijao", "steak": "carne", "shrimp": "camarao", "milk": "leite", "chocolate": "chocolate", "apple juice": "suco de maca", "with": "com", "classic": "classico", "small": "pequeno", "medium": "medio", "large": "grande", "serving": "porcao", "slice": "fatia", "piece": "unidade", "cup": "xicara", "bottle": "garrafa", "packet": "pacote", "order": "pedido",
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replacePhrases(value: string, phrases: PhraseMap) {
  let translated = value;
  let changed = false;

  for (const [source, target] of Object.entries(phrases).sort(([a], [b]) => b.length - a.length)) {
    const pattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi");
    if (!pattern.test(translated)) continue;
    translated = translated.replace(pattern, target);
    changed = true;
  }

  return changed ? translated : value;
}

export function localizeExerciseName(name: string, locale: Locale) {
  if (locale === "en") return name;
  return replacePhrases(name, exerciseNamePhrases[locale]);
}

export function localizeExerciseText(value: string, locale: Locale) {
  if (locale === "en") return value;
  const exact = exerciseTextPhrases[locale][value];
  return exact ?? value;
}

export function localizeExerciseRecord(exercise: ExerciseRecord, locale: Locale): ExerciseRecord {
  if (locale === "en") return exercise;

  return {
    ...exercise,
    name: localizeExerciseName(exercise.name, locale),
    instructions: exercise.instructions.map((value) => localizeExerciseText(value, locale)),
    benefits: exercise.benefits.map((value) => localizeExerciseText(value, locale)),
    commonMistakes: exercise.commonMistakes.map((value) => localizeExerciseText(value, locale)),
    alternatives: exercise.alternatives.map((value) => localizeExerciseName(value, locale)),
    variations: exercise.variations.map((value) => localizeExerciseName(value, locale)),
  };
}

export function localizeNutritionText(value: string | null, locale: Locale) {
  if (!value || locale === "en") return value;
  return replacePhrases(value, nutritionPhrases[locale]);
}

export function localizeNutritionProduct(product: NutritionProduct, locale: Locale): NutritionProduct {
  if (locale === "en") return product;

  return {
    ...product,
    productName: localizeNutritionText(product.productName, locale) ?? product.productName,
    category: localizeNutritionText(product.category, locale),
    servingDescription: localizeNutritionText(product.servingDescription, locale),
    servingSizeUnit: localizeNutritionText(product.servingSizeUnit, locale),
    // Restaurant and brand names remain canonical trademarks.
    restaurantName: product.restaurantName,
    brandName: product.brandName,
  };
}

export function localizeMuscleLabel(value: string | null, locale: Locale) {
  const messages = getCatalogMessages(locale).exercise.labels;
  if (!value) return messages.fullBody;
  return messages.muscles[value] ?? value.replaceAll("-", " ");
}

export function localizeEquipmentLabel(value: string | null, locale: Locale) {
  const messages = getCatalogMessages(locale).exercise.labels;
  if (!value) return messages.minimalEquipment;
  return messages.equipment[value] ?? value.replaceAll("-", " ");
}

export function localizeDifficultyLabel(value: string | null, locale: Locale) {
  const messages = getCatalogMessages(locale).exercise.labels;
  if (!value) return messages.allLevels;
  return messages.difficulty[value] ?? value.replaceAll("-", " ");
}

export function localizeExerciseTypeLabel(value: string | null, locale: Locale) {
  const messages = getCatalogMessages(locale).exercise.labels;
  if (!value) return messages.generalExercise;
  return messages.exerciseTypes[value] ?? value.replaceAll("-", " ");
}

export function localizeMovementPatternLabel(value: string | null, locale: Locale) {
  const messages = getCatalogMessages(locale).exercise.labels;
  if (!value) return messages.generalMovement;
  return messages.movementPatterns[value] ?? value.replaceAll(/[-_]/g, " ");
}
