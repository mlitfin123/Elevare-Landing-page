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

const orderedGroups: ToolGroupKey[] = ["nutrition", "strength", "prep"];

type CalculatorDirectoryProps = {
  sourcePage: "calculators_index" | "tools_index";
};

function matchesCalculatorSearch(query: string, groupKey: ToolGroupKey) {
  const group = TOOL_GROUPS[groupKey];

  return (title: string, description: string, intro: string) =>
    `${title} ${description} ${intro} ${group.title} ${group.description}`.toLowerCase().includes(query);
}

export function CalculatorDirectory({ sourcePage }: CalculatorDirectoryProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const lastTrackedQuery = useRef("");
  const hasQuery = deferredQuery.length > 0;

  const groupedTools = orderedGroups.map((groupKey) => {
    const group = TOOL_GROUPS[groupKey];
    const groupTools = getToolsByGroup(groupKey);
    const isMatch = matchesCalculatorSearch(deferredQuery, groupKey);

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
            <div className="eyebrow">Calculator finder</div>
            <h2 className="section-title">Search for the calculator you need.</h2>
            <p className="section-copy">
              Find calculators faster by searching for calories, protein, body fat, strength, cardio, or contest
              prep topics.
            </p>
          </div>

          <div className="tool-form-grid training-filter-grid">
            <label className="field">
              <span className="field-label">Search calculators</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search calorie, protein, body fat, strength..."
              />
            </label>
          </div>

          <div className="training-results-head">
            <strong>
              {filteredCount.toLocaleString()} of {tools.length.toLocaleString()} calculators
            </strong>
            <span>
              {hasQuery
                ? `Showing matches for "${query.trim()}".`
                : "Search by calculator name, topic, or goal."}
            </span>
          </div>

          {hasQuery && filteredCount === 0 ? (
            <div className="tool-warning">
              No calculators matched that search. Try a broader keyword like calories, macros, body fat, strength,
              cardio, or prep.
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

            <div className="tool-index-grid">
              {groupTools.map((tool) => (
                <article key={tool.slug} className="panel tool-index-card">
                  <span className="meta-pill">{group.title}</span>
                  <h3>{tool.title}</h3>
                  <p>{tool.metaDescription}</p>
                  <TrackedLink
                    className="button button-secondary"
                    href={getCalculatorPath(tool.slug)}
                    eventName="tool_open"
                    eventParams={{
                      tool_slug: tool.slug,
                      source_page: sourcePage,
                    }}
                  >
                    Open calculator
                  </TrackedLink>
                </article>
              ))}
            </div>

            {group.slug === "bodybuilding-contest-prep" ? (
              <QuickAnalysisCTA
                source="calculators-hub"
                heading="Calculators use your numbers. StageLab looks at your physique."
                description="Upload 3-5 current photos for a one-time visual assessment of conditioning, muscularity, symmetry, and presentation."
                buttonText="Analyze My Physique"
                variant="compact"
                headingLevel={3}
              />
            ) : null}
          </section>
        );
      })}
    </>
  );
}
