"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { QuickAnalysisCTA } from "@/components/quick-analysis/QuickAnalysisCTA";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";
import {
  getCalculatorPath,
  getToolsByGroup,
  TOOL_GROUPS,
  tools,
  type ToolGroupKey,
} from "@/lib/tools";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import { getLocalizedTool } from "@/lib/i18n/calculator-content";
import { formatNumber, localizePathname, type Locale } from "@/lib/i18n/config";

const orderedGroups: ToolGroupKey[] = ["nutrition", "strength", "prep"];

type CalculatorDirectoryProps = {
  sourcePage: "calculators_index" | "tools_index";
  locale?: Locale;
};

function matchesCalculatorSearch(query: string, group: { title: string; description: string }) {

  return (title: string, description: string, intro: string) =>
    `${title} ${description} ${intro} ${group.title} ${group.description}`.toLowerCase().includes(query);
}

export function CalculatorDirectory({ sourcePage, locale = "en" }: CalculatorDirectoryProps) {
  const messages = getCalculatorMessages(locale);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const lastTrackedQuery = useRef("");
  const hasQuery = deferredQuery.length > 0;

  const groupedTools = orderedGroups.map((groupKey) => {
    const group = { ...TOOL_GROUPS[groupKey], ...messages.groups[groupKey] };
    const groupTools = getToolsByGroup(groupKey).map((tool) => getLocalizedTool(tool.slug, locale));
    const isMatch = matchesCalculatorSearch(deferredQuery, group);

    return {
      group,
      tools: hasQuery
        ? groupTools.filter((tool) => isMatch(tool.title, tool.metaDescription, tool.intro))
        : groupTools,
    };
  });

  const filteredCount = groupedTools.reduce((total, entry) => total + entry.tools.length, 0);

  useEffect(() => {
    if (!deferredQuery || deferredQuery === lastTrackedQuery.current) {
      return;
    }

    trackEvent("calculator_search", {
      source_page: sourcePage,
      query_length: deferredQuery.length,
      results_count: filteredCount,
    });

    lastTrackedQuery.current = deferredQuery;
  }, [deferredQuery, filteredCount, sourcePage]);

  return (
    <>
      <section className="section">
        <article className="panel training-directory-card">
          <div className="section-head tool-form-head">
            <div className="eyebrow">{messages.index.finderEyebrow}</div>
            <h2 className="section-title">{messages.index.finderTitle}</h2>
            <p className="section-copy">{messages.index.finderCopy}</p>
          </div>

          <div className="tool-form-grid training-filter-grid">
            <label className="field">
              <span className="field-label">{messages.index.searchLabel}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={messages.index.searchPlaceholder}
              />
            </label>
          </div>

          <div className="training-results-head">
            <strong>
              {messages.index.countTemplate
                .replace("{count}", formatNumber(filteredCount, locale))
                .replace("{total}", formatNumber(tools.length, locale))}
            </strong>
            <span>
              {hasQuery
                ? messages.index.matchesTemplate.replace("{query}", query.trim())
                : messages.index.searchHint}
            </span>
          </div>

          {hasQuery && filteredCount === 0 ? (
            <div className="tool-warning">
              {messages.index.noMatches}
            </div>
          ) : null}
        </article>
      </section>

      {groupedTools.map(({ group, tools: groupTools }) => {
        if (groupTools.length === 0) {
          return null;
        }

        return (
          <section key={group.slug} className="section">
            <div className="section-head">
              <div className="eyebrow">{group.title}</div>
              <h2 className="section-title">{group.title}</h2>
              <p className="section-copy">{group.description}</p>
            </div>

            {group.slug === "bodybuilding-contest-prep" ? (
              <QuickAnalysisCTA
                source="calculators-hub"
                heading={messages.index.quickAnalysisHeading}
                description={messages.index.quickAnalysisDescription}
                buttonText={messages.index.quickAnalysisButton}
                variant="compact"
                headingLevel={3}
                locale={locale}
              />
            ) : null}

            <div className="tool-index-grid">
              {groupTools.map((tool) => (
                <article key={tool.slug} className="panel tool-index-card">
                  <span className="meta-pill">{group.title}</span>
                  <h3>{tool.title}</h3>
                  <p>{tool.metaDescription}</p>
                  <TrackedLink
                    className="button button-secondary"
                    href={localizePathname(getCalculatorPath(tool.slug), locale)}
                    eventName="tool_open"
                    eventParams={{
                      tool_slug: tool.slug,
                      source_page: sourcePage,
                    }}
                  >
                    {messages.index.openCalculator}
                  </TrackedLink>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
