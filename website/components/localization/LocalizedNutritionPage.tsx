import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { LogbookCTA } from "@/components/nutrition/LogbookCTA";
import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { NutritionExplorer } from "@/components/nutrition/NutritionExplorer";
import { NutritionExplorerFallback } from "@/components/nutrition/NutritionExplorerFallback";
import { NutritionSearch } from "@/components/nutrition/NutritionSearch";
import { PopularRestaurantLinks } from "@/components/nutrition/PopularRestaurantLinks";
import { RelatedNutritionLinks } from "@/components/nutrition/RelatedNutritionLinks";
import { RestaurantCard } from "@/components/nutrition/RestaurantCard";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, localizePathname } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/translate";
import {
  getAllNutritionProducts,
  getFastFoodRestaurantData,
  getNutritionRestaurants,
  getPopularNutritionData,
  getRelatedRestaurants,
  getRestaurantBySlug,
} from "@/lib/nutrition";
import {
  buildNutritionItemListSchema,
  filterAndSortNutritionItems,
  getPopularRestaurants,
  nutritionVariantConfig,
  type NutritionVariant,
  type RestaurantSummary,
} from "@/lib/nutrition-data";
import {
  fastFoodGuideLinks,
  getFastFoodViewLinks,
  getRestaurantViewLinks,
  isFastFoodNutritionView,
  isRestaurantNutritionView,
  nutritionToolLinks,
} from "@/lib/nutrition-pages";
import { absoluteUrl } from "@/lib/site";

type Props = {
  locale: Locale;
  segments: string[];
};

const emptyFilters = {
  search: "",
  maxCalories: "",
  minProtein: "",
  maxCarbs: "",
  maxFat: "",
  category: "",
  hideExtras: true,
};

function translateViewLabel(view: string, locale: Locale) {
  return getCatalogMessages(locale).nutrition.explorer.variants[view] ?? view.replaceAll("-", " ");
}

function translateToolLabel(href: string, locale: Locale) {
  const labels: Record<Exclude<Locale, "en">, Record<string, string>> = {
    "es-419": {
      "calorie-calculator": "Calculadora de calorias",
      "protein-calculator": "Calculadora de proteina",
      "macro-calculator": "Calculadora de macros",
      "body-fat-calculator": "Calculadora de grasa corporal",
    },
    "pt-BR": {
      "calorie-calculator": "Calculadora de calorias",
      "protein-calculator": "Calculadora de proteina",
      "macro-calculator": "Calculadora de macros",
      "body-fat-calculator": "Calculadora de gordura corporal",
    },
  };
  if (locale === "en") return nutritionToolLinks.find((link) => link.href === href)?.label ?? href;
  const slug = href.split("/").filter(Boolean).at(-1) ?? "";
  return labels[locale][slug] ?? nutritionToolLinks.find((link) => link.href === href)?.label ?? href;
}

function localizedToolLinks(locale: Locale) {
  return nutritionToolLinks.map((link) => ({ ...link, label: translateToolLabel(link.href, locale) }));
}

function localizedFastFoodLinks(locale: Locale) {
  const prefix = locale === "es-419" ? "Comida rapida" : locale === "pt-BR" ? "Fast food" : "Fast food";
  return fastFoodGuideLinks.map((link) => {
    const view = link.href.split("/").filter(Boolean).at(-1) ?? "all";
    return { ...link, label: `${prefix}: ${translateViewLabel(view, locale)}` };
  });
}

function localizedRestaurantViewLinks(
  restaurantName: string,
  restaurantSlug: string,
  locale: Locale,
  currentView: "all" | "high-protein" | "low-calorie" | "under-500-calories" | "low-carb" = "all",
) {
  return getRestaurantViewLinks(restaurantName, restaurantSlug, currentView).map((link) => {
    const view = link.href.split("/").filter(Boolean).at(-1);
    const normalizedView = view === restaurantSlug ? "all" : view ?? "all";
    const prefix = locale === "es-419" ? "Nutricion de" : locale === "pt-BR" ? "Nutricao de" : "Nutrition for";
    return { ...link, label: `${prefix} ${restaurantName}: ${translateViewLabel(normalizedView, locale)}` };
  });
}

function localizedRelatedRestaurantLinks(restaurants: Array<{ slug: string; name: string }>, locale: Locale) {
  const suffix = locale === "es-419" ? "informacion nutricional" : locale === "pt-BR" ? "informacoes nutricionais" : "nutrition facts";
  return restaurants.map((restaurant) => ({ href: `/nutrition/${restaurant.slug}`, label: `${restaurant.name}: ${suffix}` }));
}

function variantCopy(name: string | null, view: NutritionVariant, locale: Locale) {
  const label = translateViewLabel(view, locale).toLocaleLowerCase(locale);
  const subject = name ?? (locale === "es-419" ? "comida rapida" : locale === "pt-BR" ? "fast food" : "fast food");
  if (locale === "es-419") return {
    title: `${subject}: opciones de ${label}`,
    description: `Compara opciones de ${label} de ${subject}, incluidas calorias, proteina, carbohidratos, grasa y porciones.`,
    headline: `Opciones de ${label} de ${subject}.`,
    intro: `Usa esta vista para comparar productos de ${subject} segun calorias, proteina, carbohidratos, grasa y tamano de porcion.`,
  };
  if (locale === "pt-BR") return {
    title: `${subject}: opcoes de ${label}`,
    description: `Compare opcoes de ${label} de ${subject}, incluindo calorias, proteina, carboidratos, gordura e porcoes.`,
    headline: `Opcoes de ${label} de ${subject}.`,
    intro: `Use esta pagina para comparar produtos de ${subject} por calorias, proteina, carboidratos, gordura e tamanho da porcao.`,
  };
  return { title: `${subject}: ${label}`, description: `Compare ${label} options from ${subject}.`, headline: `${label} options from ${subject}.`, intro: `Compare calories and macros across this view.` };
}

function HeroStats({ locale, itemCount, categoryCount }: { locale: Locale; itemCount: number; categoryCount?: number }) {
  const messages = getCatalogMessages(locale).nutrition.restaurant;
  return (
    <div className="hero-proof">
      <article className="proof-card"><span className="proof-label">{messages.menuItems}</span><div className="proof-value">{formatNumber(itemCount, locale)}</div><p className="proof-copy">{messages.menuItemsCopy}</p></article>
      {categoryCount != null ? <article className="proof-card"><span className="proof-label">{messages.categories}</span><div className="proof-value">{formatNumber(categoryCount, locale)}</div><p className="proof-copy">{messages.categoriesCopy}</p></article> : null}
      <article className="proof-card"><span className="proof-label">{messages.macros}</span><div className="proof-value">{messages.macrosValue}</div><p className="proof-copy">{messages.macrosCopy}</p></article>
    </div>
  );
}

async function NutritionIndex({ locale }: { locale: Locale }) {
  const [products, restaurants, popularData] = await Promise.all([getAllNutritionProducts(), getNutritionRestaurants(), getPopularNutritionData()]);
  const messages = getCatalogMessages(locale).nutrition;
  const pathname = localizePathname("/nutrition/", locale);
  return (
    <div className="container">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: messages.seo.indexTitle, url: absoluteUrl(pathname), description: messages.seo.indexDescription, mainEntity: { "@type": "ItemList", itemListElement: popularData.popularRestaurants.map((restaurant, index) => ({ "@type": "ListItem", position: index + 1, name: restaurant.name, url: absoluteUrl(localizePathname(`/nutrition/${restaurant.slug}`, locale)) })) } }} />
      <section className="hero">
        <div className="eyebrow">{messages.index.eyebrow}</div><h1>{messages.index.title}</h1><p className="page-intro">{messages.index.intro}</p>
        <div className="hero-actions"><TrackedLink className="button button-primary" href={localizePathname("/nutrition/fast-food/high-protein/", locale)} eventName="nutrition_nav_click" eventParams={{ source_page: "localized_nutrition_index", destination_page: "fast_food_high_protein" }}>{messages.index.highProteinCta}</TrackedLink><TrackedLink className="button button-secondary" href="/calculators/calorie-calculator/" hrefLang="en" eventName="nutrition_nav_click" eventParams={{ source_page: "localized_nutrition_index", destination_page: "calorie_calculator" }}>{messages.index.calculatorCta}</TrackedLink></div>
        <div className="hero-proof"><article className="proof-card"><span className="proof-label">{messages.index.restaurants}</span><div className="proof-value">{formatNumber(restaurants.length, locale)}</div><p className="proof-copy">{messages.index.restaurantsCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.index.items}</span><div className="proof-value">{formatNumber(products.length, locale)}</div><p className="proof-copy">{messages.index.itemsCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.index.popularSearches}</span><div className="proof-value">{messages.index.popularValue}</div><p className="proof-copy">{messages.index.popularCopy}</p></article></div>
      </section>
      <NutritionSearch restaurants={restaurants} locale={locale} />
      <section className="section"><div className="section-head"><div className="eyebrow">{messages.index.popularEyebrow}</div><h2 className="section-title">{messages.index.popularTitle}</h2><p className="section-copy">{messages.index.popularSectionCopy}</p></div><div className="nutrition-restaurant-grid">{popularData.popularRestaurants.map((restaurant) => <RestaurantCard key={restaurant.slug} restaurant={restaurant} sourcePage="localized_nutrition_index" locale={locale} />)}</div></section>
      <section className="section"><div className="section-head"><div className="eyebrow">{messages.index.popularEyebrow}</div><h2 className="section-title">{messages.index.quickLinksTitle}</h2><p className="section-copy">{messages.index.quickLinksCopy}</p></div><PopularRestaurantLinks restaurants={popularData.popularRestaurants} sourcePage="localized_nutrition_index_links" locale={locale} /></section>
      <RelatedNutritionLinks title={messages.links.fastFoodGuides} description={messages.links.fastFoodGuidesCopy} links={localizedFastFoodLinks(locale)} sourcePage="localized_nutrition_fast_food" locale={locale} />
      <RelatedNutritionLinks title={messages.links.relatedTools} description={messages.links.relatedToolsCopy} links={localizedToolLinks(locale)} sourcePage="localized_nutrition_tools" locale={locale} />
      <LogbookCTA context="localized_nutrition_index" locale={locale} /><NutritionDisclaimer locale={locale} />
    </div>
  );
}

async function RestaurantPage({ locale, restaurantSlug }: { locale: Locale; restaurantSlug: string }) {
  const data = await getRestaurantBySlug(restaurantSlug);
  if (!data) notFound();
  const messages = getCatalogMessages(locale).nutrition;
  const related = await getRelatedRestaurants(data.summary);
  const items = filterAndSortNutritionItems({ items: data.items, variant: "all", filters: emptyFilters, sort: "lowest-calories" });
  const pathname = localizePathname(`/nutrition/${restaurantSlug}/`, locale);
  return (
    <div className="container">
      <StructuredData data={buildNutritionItemListSchema({ items, pageUrl: absoluteUrl(pathname) })} />
      <section className="hero"><div className="eyebrow">{messages.restaurant.eyebrow}</div><h1>{interpolate(messages.restaurant.headline, { restaurant: data.summary.name })}</h1><p className="page-intro">{interpolate(messages.restaurant.intro, { restaurant: data.summary.name })}</p><div className="hero-actions"><TrackedLink className="button button-primary" href={localizePathname(`/nutrition/${restaurantSlug}/high-protein/`, locale)} eventName="nutrition_nav_click" eventParams={{ source_page: `localized_restaurant_${restaurantSlug}`, destination_page: "high_protein" }}>{messages.restaurant.highProteinCta}</TrackedLink><TrackedLink className="button button-secondary" href={localizePathname(`/nutrition/${restaurantSlug}/under-500-calories/`, locale)} eventName="nutrition_nav_click" eventParams={{ source_page: `localized_restaurant_${restaurantSlug}`, destination_page: "under_500" }}>{messages.restaurant.under500Cta}</TrackedLink></div><HeroStats locale={locale} itemCount={data.summary.itemCount} categoryCount={data.summary.categoryCount} /></section>
      <Suspense fallback={<NutritionExplorerFallback locale={locale} />}><NutritionExplorer items={data.items} locale={locale} /></Suspense>
      <RelatedNutritionLinks title={interpolate(messages.restaurant.moreViews, { restaurant: data.summary.name })} description={messages.restaurant.moreViewsCopy} links={localizedRestaurantViewLinks(data.summary.name, restaurantSlug, locale)} sourcePage={`localized_restaurant_${restaurantSlug}_views`} locale={locale} />
      <RelatedNutritionLinks title={messages.restaurant.moreRestaurants} description={messages.restaurant.moreRestaurantsCopy} links={localizedRelatedRestaurantLinks(related, locale)} sourcePage={`localized_restaurant_${restaurantSlug}_related`} locale={locale} />
      <RelatedNutritionLinks title={messages.restaurant.relatedTools} description={messages.restaurant.relatedToolsCopy} links={localizedToolLinks(locale)} sourcePage={`localized_restaurant_${restaurantSlug}_tools`} locale={locale} />
      <LogbookCTA context={`localized_restaurant_${restaurantSlug}`} locale={locale} /><NutritionDisclaimer locale={locale} />
    </div>
  );
}

async function VariantPage({ locale, restaurantSlug, view }: { locale: Locale; restaurantSlug: string | null; view: string }) {
  const messages = getCatalogMessages(locale).nutrition;
  const fastFood = restaurantSlug == null;
  if ((fastFood && !isFastFoodNutritionView(view)) || (!fastFood && !isRestaurantNutritionView(view))) notFound();
  let name: string | null = null;
  let categoryCount: number | undefined;
  let items;
  let restaurants: RestaurantSummary[];
  if (fastFood) {
    const data = await getFastFoodRestaurantData();
    items = data.items;
    restaurants = getPopularRestaurants(data.restaurants);
  } else {
    const data = await getRestaurantBySlug(restaurantSlug!);
    if (!data) notFound();
    name = data.summary.name;
    categoryCount = data.summary.categoryCount;
    items = data.items;
    restaurants = await getRelatedRestaurants(data.summary);
  }
  const variant = view as NutritionVariant;
  const filtered = filterAndSortNutritionItems({ items, variant, filters: emptyFilters, sort: nutritionVariantConfig[variant].defaultSort });
  const copy = variantCopy(name, variant, locale);
  const basePath = fastFood ? "/nutrition/fast-food/" : `/nutrition/${restaurantSlug}/`;
  const pathname = localizePathname(`${basePath}${view}/`, locale);
  const relatedLinks = fastFood
    ? getFastFoodViewLinks(view as "high-protein" | "low-calorie" | "under-500-calories").map((link) => ({ ...link, label: `${messages.variant.fastFoodGuides}: ${translateViewLabel(link.href.split("/").at(-1) ?? "all", locale)}` }))
    : localizedRestaurantViewLinks(name!, restaurantSlug!, locale, view as "high-protein" | "low-calorie" | "under-500-calories" | "low-carb");
  return (
    <div className="container">
      <StructuredData data={buildNutritionItemListSchema({ items: filtered, pageUrl: absoluteUrl(pathname) })} />
      <section className="hero"><div className="eyebrow">{fastFood ? messages.variant.fastFoodEyebrow : messages.variant.restaurantEyebrow}</div><h1>{copy.headline}</h1><p className="page-intro">{copy.intro}</p><div className="hero-actions"><TrackedLink className="button button-primary" href={localizePathname(basePath, locale)} eventName="nutrition_nav_click" eventParams={{ source_page: "localized_nutrition_variant", destination_page: "all_items" }}>{messages.variant.allFacts}</TrackedLink>{relatedLinks[0] ? <TrackedLink className="button button-secondary" href={localizePathname(relatedLinks[0].href, locale)} eventName="nutrition_nav_click" eventParams={{ source_page: "localized_nutrition_variant", destination_page: relatedLinks[0].href }}>{messages.variant.anotherView}</TrackedLink> : null}</div><HeroStats locale={locale} itemCount={filtered.length} categoryCount={categoryCount} /></section>
      <Suspense fallback={<NutritionExplorerFallback locale={locale} />}><NutritionExplorer items={items} variant={variant} locale={locale} /></Suspense>
      {fastFood ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.variant.popularRestaurants}</div><h2 className="section-title">{messages.variant.popularRestaurantsTitle}</h2><p className="section-copy">{messages.variant.popularRestaurantsCopy}</p></div><PopularRestaurantLinks restaurants={restaurants} sourcePage="localized_fast_food_restaurants" locale={locale} /></section> : null}
      <RelatedNutritionLinks title={fastFood ? messages.variant.fastFoodGuides : interpolate(messages.restaurant.moreViews, { restaurant: name! })} description={fastFood ? messages.variant.fastFoodGuidesCopy : messages.restaurant.moreViewsCopy} links={relatedLinks} sourcePage="localized_nutrition_variant_links" locale={locale} />
      <RelatedNutritionLinks title={messages.restaurant.relatedTools} description={messages.restaurant.relatedToolsCopy} links={localizedToolLinks(locale)} sourcePage="localized_nutrition_variant_tools" locale={locale} />
      <LogbookCTA context="localized_nutrition_variant" locale={locale} /><NutritionDisclaimer locale={locale} />
    </div>
  );
}

function MethodologyPage({ locale }: { locale: Locale }) {
  const messages = getCatalogMessages(locale).nutrition;
  const pathname = localizePathname("/nutrition/methodology/", locale);
  return (
    <div className="container">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "WebPage", name: messages.seo.methodologyTitle, url: absoluteUrl(pathname), description: messages.seo.methodologyDescription }} />
      <section className="hero"><div className="eyebrow">{messages.methodology.eyebrow}</div><h1>{messages.methodology.title}</h1><p className="page-intro">{messages.methodology.intro}</p><div className="hero-actions"><TrackedLink className="button button-primary" href={localizePathname("/nutrition/", locale)} eventName="nutrition_nav_click" eventParams={{ source_page: "localized_nutrition_methodology", destination_page: "nutrition_index" }}>{messages.methodology.browse}</TrackedLink></div></section>
      <section className="section trust-layout"><div className="trust-list">{messages.methodology.sections.map((section) => <article className="panel" key={section.title}><h2>{section.title}</h2><p>{section.body}</p></article>)}</div></section>
      <NutritionDisclaimer locale={locale} />
    </div>
  );
}

export async function LocalizedNutritionPage({ locale, segments }: Props) {
  if (segments.length === 0) return <NutritionIndex locale={locale} />;
  if (segments.length === 1 && segments[0] === "methodology") return <MethodologyPage locale={locale} />;
  if (segments.length === 2 && segments[0] === "fast-food") return <VariantPage locale={locale} restaurantSlug={null} view={segments[1]} />;
  if (segments.length === 1) return <RestaurantPage locale={locale} restaurantSlug={segments[0]} />;
  if (segments.length === 2) return <VariantPage locale={locale} restaurantSlug={segments[0]} view={segments[1]} />;
  notFound();
}
