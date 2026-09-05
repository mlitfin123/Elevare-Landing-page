import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { ExerciseCard } from "@/components/training/ExerciseCard";
import { ExerciseDirectory } from "@/components/training/ExerciseDirectory";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import {
  localizeDifficultyLabel,
  localizeEquipmentLabel,
  localizeExerciseName,
  localizeExerciseRecord,
  localizeExerciseTypeLabel,
  localizeMovementPatternLabel,
  localizeMuscleLabel,
} from "@/lib/i18n/catalog-content";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, localizePathname } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/translate";
import { absoluteUrl } from "@/lib/site";
import { getAllExercises, getExerciseBySlug } from "@/lib/training";
import {
  EXERCISE_EQUIPMENT_CATEGORIES,
  EXERCISE_MUSCLE_CATEGORIES,
  getExerciseCategoryInfo,
  getExerciseSpecificBenefits,
  getExerciseSpecificMistakes,
  getExerciseSubstitutions,
  getExerciseVariations,
  getExercisesByCategorySlug,
  getRelatedExercises,
  getSupportingExercisesByCategorySlug,
  isExerciseCategorySlug,
  type ExerciseCategoryInfo,
  type ExerciseRecord,
} from "@/lib/training-data";
import { getExerciseCategoryFeaturedExercises, getPopularExercises } from "@/lib/training-seo";

type Props = {
  locale: Locale;
  slug?: string;
};

function categoryTitle(category: ExerciseCategoryInfo, locale: Locale) {
  const label = category.kind === "muscle"
    ? localizeMuscleLabel(category.slug, locale)
    : localizeEquipmentLabel(category.slug, locale);
  if (locale === "es-419") return `Ejercicios de ${label.toLocaleLowerCase(locale)}`;
  if (locale === "pt-BR") return `Exercicios de ${label.toLocaleLowerCase(locale)}`;
  return category.title;
}

function categoryDescription(category: ExerciseCategoryInfo, locale: Locale) {
  const label = category.kind === "muscle"
    ? localizeMuscleLabel(category.slug, locale)
    : localizeEquipmentLabel(category.slug, locale);
  if (locale === "es-419") return `Explora ejercicios de ${label.toLocaleLowerCase(locale)} para mejorar tu tecnica, fuerza y estructura de entrenamiento.`;
  if (locale === "pt-BR") return `Explore exercicios de ${label.toLocaleLowerCase(locale)} para melhorar sua tecnica, forca e estrutura de treino.`;
  return category.description;
}

function ExerciseLinkCloud({ exercises, locale, sourcePage }: { exercises: ExerciseRecord[]; locale: Locale; sourcePage: string }) {
  return (
    <div className="nutrition-link-cloud">
      {exercises.map((exercise) => (
        <TrackedLink
          key={exercise.slug}
          className="nutrition-link-pill"
          href={localizePathname(`/exercises/${exercise.slug}`, locale)}
          eventName="exercise_open"
          eventParams={{ exercise_slug: exercise.slug, source_page: sourcePage }}
        >
          {localizeExerciseName(exercise.name, locale)}
        </TrackedLink>
      ))}
    </div>
  );
}

function ExerciseDisclaimer({ locale }: { locale: Locale }) {
  const messages = getCatalogMessages(locale).exercise.disclaimer;
  return (
    <section className="section">
      <article className="callout">
        <span className="meta-pill">{messages.label}</span>
        <p>{messages.message}</p>
      </article>
    </section>
  );
}

async function ExerciseIndex({ locale }: { locale: Locale }) {
  const exercises = await getAllExercises();
  const messages = getCatalogMessages(locale).exercise;
  const popular = getPopularExercises(exercises, 14);
  const pathname = localizePathname("/exercises/", locale);

  return (
    <div className="container">
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: messages.seo.indexTitle,
        url: absoluteUrl(pathname),
        description: messages.seo.indexDescription,
        hasPart: popular.map((exercise, index) => ({ "@type": "ListItem", position: index + 1, name: localizeExerciseName(exercise.name, locale), url: absoluteUrl(localizePathname(`/exercises/${exercise.slug}`, locale)) })),
      }} />
      <section className="hero">
        <div className="eyebrow">{messages.index.eyebrow}</div>
        <h1>{messages.index.title}</h1>
        <p className="page-intro">{messages.index.intro}</p>
        <div className="hero-actions">
          <TrackedLink className="button button-primary" href={localizePathname("/workouts/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse workouts", cta_context: "localized_exercises_hero", product: "Logbook" }}>{messages.index.browseWorkouts}</TrackedLink>
          <TrackedLink className="button button-secondary" href={localizePathname("/logbook/", locale)} eventName="cta_click" eventParams={{ cta_name: "See Logbook", cta_context: "localized_exercises_hero", product: "Logbook" }}>{messages.index.learnLogbook}</TrackedLink>
        </div>
        <div className="hero-proof">
          <article className="proof-card"><span className="proof-label">{messages.index.countLabel}</span><div className="proof-value">{formatNumber(exercises.length, locale)}</div><p className="proof-copy">{messages.index.countCopy}</p></article>
          <article className="proof-card"><span className="proof-label">{messages.index.categoriesLabel}</span><div className="proof-value">{messages.index.categoriesValue}</div><p className="proof-copy">{messages.index.categoriesCopy}</p></article>
          <article className="proof-card"><span className="proof-label">{messages.index.purposeLabel}</span><div className="proof-value">{messages.index.purposeValue}</div><p className="proof-copy">{messages.index.purposeCopy}</p></article>
        </div>
      </section>

      {popular.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.index.popularEyebrow}</div><h2 className="section-title">{messages.index.popularTitle}</h2><p className="section-copy">{messages.index.popularCopy}</p></div><div className="training-grid">{popular.map((exercise) => <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage="localized_exercise_index_popular" locale={locale} />)}</div></section> : null}

      <section className="section"><div className="section-head"><div className="eyebrow">{messages.index.musclesEyebrow}</div><h2 className="section-title">{messages.index.musclesTitle}</h2><p className="section-copy">{messages.index.musclesCopy}</p></div><div className="tool-index-grid">{EXERCISE_MUSCLE_CATEGORIES.map((category) => <article key={category.slug} className="panel tool-index-card"><span className="meta-pill">{localizeMuscleLabel(category.slug, locale)}</span><h3>{categoryTitle(category, locale)}</h3><p>{categoryDescription(category, locale)}</p><TrackedLink className="button button-secondary" href={localizePathname(`/exercises/${category.slug}`, locale)} eventName="exercise_category_open" eventParams={{ category_slug: category.slug, source_page: "localized_exercise_index_muscles" }}>{interpolate(messages.index.exploreCategory, { category: localizeMuscleLabel(category.slug, locale).toLocaleLowerCase(locale) })}</TrackedLink></article>)}</div></section>

      <section className="section"><div className="section-head"><div className="eyebrow">{messages.index.equipmentEyebrow}</div><h2 className="section-title">{messages.index.equipmentTitle}</h2><p className="section-copy">{messages.index.equipmentCopy}</p></div><div className="tool-index-grid">{EXERCISE_EQUIPMENT_CATEGORIES.map((category) => <article key={category.slug} className="panel tool-index-card"><span className="meta-pill">{localizeEquipmentLabel(category.slug, locale)}</span><h3>{categoryTitle(category, locale)}</h3><p>{categoryDescription(category, locale)}</p><TrackedLink className="button button-secondary" href={localizePathname(`/exercises/${category.slug}`, locale)} eventName="exercise_category_open" eventParams={{ category_slug: category.slug, source_page: "localized_exercise_index_equipment" }}>{interpolate(messages.index.exploreCategory, { category: localizeEquipmentLabel(category.slug, locale).toLocaleLowerCase(locale) })}</TrackedLink></article>)}</div></section>

      {exercises.length ? <ExerciseDirectory exercises={exercises} locale={locale} /> : <section className="section"><article className="callout"><span className="meta-pill">{messages.index.emptyLabel}</span><h2>{messages.index.emptyTitle}</h2><p>{messages.index.emptyCopy}</p></article></section>}
      <ExerciseDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.indexTitle} description={messages.cta.indexCopy} ctaContext="localized_exercise_index" locale={locale} />
    </div>
  );
}

async function ExerciseCategory({ locale, slug }: { locale: Locale; slug: string }) {
  const exercises = await getAllExercises();
  const category = getExerciseCategoryInfo(slug);
  if (!category) notFound();
  const messages = getCatalogMessages(locale).exercise;
  const categoryLabel = category.kind === "muscle" ? localizeMuscleLabel(slug, locale) : localizeEquipmentLabel(slug, locale);
  const primary = getExercisesByCategorySlug(exercises, slug);
  const supporting = getSupportingExercisesByCategorySlug(exercises, slug);
  const featured = getExerciseCategoryFeaturedExercises(category, exercises, primary, 10);
  const title = categoryTitle(category, locale);
  const description = categoryDescription(category, locale);

  return (
    <div className="container">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: absoluteUrl(localizePathname(`/exercises/${slug}`, locale)), description }} />
      <section className="hero"><div className="eyebrow">{category.kind === "muscle" ? messages.category.muscleEyebrow : messages.category.equipmentEyebrow}</div><h1>{title}</h1><p className="page-intro">{description}</p><div className="hero-proof"><article className="proof-card"><span className="proof-label">{messages.category.results}</span><div className="proof-value">{formatNumber(primary.length, locale)}</div><p className="proof-copy">{messages.category.resultsCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.category.purpose}</span><div className="proof-value">{messages.category.purposeValue}</div><p className="proof-copy">{messages.category.purposeCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.category.track}</span><div className="proof-value">{messages.category.trackValue}</div><p className="proof-copy">{messages.category.trackCopy}</p></article></div></section>
      <section className="section"><article className="panel tool-copy-card"><div className="section-head"><div className="eyebrow">{messages.category.guideEyebrow}</div><h2 className="section-title">{interpolate(messages.category.guideTitle, { category: categoryLabel.toLocaleLowerCase(locale) })}</h2></div><div className="tool-copy-stack">{messages.category.guideParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></article></section>
      {featured.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.category.topEyebrow}</div><h2 className="section-title">{messages.category.topTitle}</h2><p className="section-copy">{messages.category.topCopy}</p></div><ExerciseLinkCloud exercises={featured} locale={locale} sourcePage={`localized_exercise_category_${slug}_featured`} /></section> : null}
      <section className="section"><div className="training-grid">{primary.map((exercise) => <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`localized_exercise_category_${slug}`} prefetch={false} locale={locale} />)}</div></section>
      {supporting.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.category.supportingEyebrow}</div><h2 className="section-title">{interpolate(messages.category.supportingTitle, { category: categoryLabel.toLocaleLowerCase(locale) })}</h2><p className="section-copy">{interpolate(messages.category.supportingCopy, { category: categoryLabel.toLocaleLowerCase(locale) })}</p></div><div className="training-grid">{supporting.map((exercise) => <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`localized_exercise_category_${slug}_supporting`} prefetch={false} locale={locale} />)}</div></section> : null}
      <section className="section"><div className="section-head"><div className="eyebrow">{messages.category.faqEyebrow}</div><h2 className="section-title">{interpolate(messages.category.faqTitle, { category: categoryLabel.toLocaleLowerCase(locale) })}</h2></div><div className="tool-faq-grid">{messages.category.faqs.map((faq) => <article key={faq.question} className="panel tool-faq-card"><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</div></section>
      <ExerciseDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.categoryTitle} description={messages.cta.categoryCopy} ctaContext={`localized_exercise_category_${slug}`} locale={locale} />
    </div>
  );
}

async function ExerciseDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const [exercise, exercises] = await Promise.all([getExerciseBySlug(slug), getAllExercises()]);
  if (!exercise) notFound();
  const messages = getCatalogMessages(locale).exercise;
  const display = localizeExerciseRecord(exercise, locale);
  const related = getRelatedExercises(exercise, exercises, 4);
  const variations = getExerciseVariations(exercise, exercises, 3);
  const alternatives = getExerciseSubstitutions(exercise, exercises, 3);
  const benefits = getExerciseSpecificBenefits(exercise).map((value) => localizeExerciseRecord({ ...exercise, benefits: [value] }, locale).benefits[0]);
  const mistakes = getExerciseSpecificMistakes(exercise).map((value) => localizeExerciseRecord({ ...exercise, commonMistakes: [value] }, locale).commonMistakes[0]);
  const primary = localizeMuscleLabel(exercise.primaryMuscleGroup, locale);
  const secondary = exercise.secondaryMuscleGroups.map((group) => localizeMuscleLabel(group, locale).toLocaleLowerCase(locale));
  const equipment = exercise.equipment.length ? exercise.equipment.map((value) => localizeEquipmentLabel(value, locale)).join(", ") : messages.labels.minimalEquipment;
  const compoundCopy = exercise.isCompound ? messages.detail.compound : messages.detail.isolation;
  const faqValues = messages.detail.faqQuestions.map((question, index) => ({
    question: interpolate(question, { name: display.name }),
    answer: interpolate(messages.detail.faqAnswers[index], { name: display.name, primary, secondary: secondary.join(", ") || primary, equipment, compound: compoundCopy }),
  }));

  return (
    <div className="container">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "WebPage", name: display.name, url: absoluteUrl(localizePathname(`/exercises/${slug}`, locale)), description: `${display.name}: ${primary}, ${equipment}.` }} />
      <section className="hero"><div className="eyebrow">{messages.detail.eyebrow}</div><h1>{display.name}</h1><p className="page-intro">{display.name}: {primary}. {equipment}.</p><div className="hero-proof"><article className="proof-card"><span className="proof-label">{messages.detail.primaryMuscle}</span><div className="proof-value">{primary}</div><p className="proof-copy">{messages.detail.primaryMuscleCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.detail.equipment}</span><div className="proof-value">{equipment}</div><p className="proof-copy">{messages.detail.equipmentCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.detail.difficulty}</span><div className="proof-value">{localizeDifficultyLabel(exercise.difficulty, locale)}</div><p className="proof-copy">{messages.detail.difficultyCopy}</p></article></div></section>
      <section className="section"><div className="grid-3"><article className="panel"><span className="stat-label">{messages.detail.musclesWorked}</span><h3>{primary}</h3><p>{secondary.length ? interpolate(messages.detail.secondaryMuscles, { name: display.name, muscles: secondary.join(", ") }) : messages.detail.noSecondaryMuscles}</p></article><article className="panel"><span className="stat-label">{messages.detail.exerciseType}</span><h3>{localizeExerciseTypeLabel(exercise.exerciseType, locale)}</h3><p>{interpolate(messages.detail.movementPattern, { pattern: localizeMovementPatternLabel(exercise.movementPattern, locale).toLocaleLowerCase(locale) })} {compoundCopy}</p></article><article className="panel"><span className="stat-label">{messages.detail.trainingLevel}</span><h3>{localizeDifficultyLabel(exercise.difficulty, locale)}</h3><p>{messages.detail.trainingLevelCopy}</p></article></div></section>
      {display.instructions.length ? <section className="section"><article className="panel tool-copy-card"><div className="section-head"><div className="eyebrow">{messages.detail.instructions}</div><h2 className="section-title">{interpolate(messages.detail.howTo, { name: display.name })}</h2></div><ol className="article-body">{display.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ol></article></section> : null}
      {(benefits.length || mistakes.length) ? <section className="section"><div className="tool-faq-grid">{benefits.length ? <article className="panel tool-faq-card"><h3>{messages.detail.benefits}</h3><ul className="training-list">{benefits.map((value) => <li key={value}>{value}</li>)}</ul></article> : null}{mistakes.length ? <article className="panel tool-faq-card"><h3>{messages.detail.mistakes}</h3><ul className="training-list">{mistakes.map((value) => <li key={value}>{value}</li>)}</ul></article> : null}</div></section> : null}
      {(variations.length || alternatives.length) ? <section className="section"><div className="tool-faq-grid">{variations.length ? <article className="panel tool-faq-card"><h3>{messages.detail.variations}</h3><ExerciseLinkCloud exercises={variations} locale={locale} sourcePage={`localized_exercise_${slug}_variations`} /></article> : null}{alternatives.length ? <article className="panel tool-faq-card"><h3>{messages.detail.alternatives}</h3><ExerciseLinkCloud exercises={alternatives} locale={locale} sourcePage={`localized_exercise_${slug}_alternatives`} /></article> : null}</div></section> : null}
      {related.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.relatedEyebrow}</div><h2 className="section-title">{messages.detail.relatedTitle}</h2><p className="section-copy">{messages.detail.relatedCopy}</p></div><div className="training-grid">{related.map((item) => <ExerciseCard key={item.slug} exercise={item} sourcePage={`localized_exercise_${slug}_related`} locale={locale} />)}</div></section> : null}
      <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.faqEyebrow}</div><h2 className="section-title">{interpolate(messages.detail.faqTitle, { name: display.name })}</h2></div><div className="tool-faq-grid">{faqValues.map((faq) => <article key={faq.question} className="panel tool-faq-card"><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</div></section>
      <ExerciseDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.detailTitle} description={messages.cta.detailCopy} ctaContext={`localized_exercise_${slug}`} locale={locale} />
    </div>
  );
}

export async function LocalizedExercisesPage({ locale, slug }: Props) {
  if (!slug) return <ExerciseIndex locale={locale} />;
  if (isExerciseCategorySlug(slug)) return <ExerciseCategory locale={locale} slug={slug} />;
  return <ExerciseDetail locale={locale} slug={slug} />;
}
