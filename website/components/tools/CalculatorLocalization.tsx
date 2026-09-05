"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import { translateCalculatorText } from "@/lib/i18n/calculator-content";
import type { Locale } from "@/lib/i18n/config";
import type { ToolSlug } from "@/lib/tools";

type CalculatorLocaleState = { locale: Locale; toolSlug?: ToolSlug };

const CalculatorLocaleContext = createContext<CalculatorLocaleState>({ locale: "en" });

export function CalculatorLocaleProvider({ locale, toolSlug, children }: { locale: Locale; toolSlug?: ToolSlug; children: ReactNode }) {
  return <CalculatorLocaleContext.Provider value={{ locale, toolSlug }}>{children}</CalculatorLocaleContext.Provider>;
}

export function useCalculatorLocale() {
  return useContext(CalculatorLocaleContext).locale;
}

export function useCalculatorToolSlug() {
  return useContext(CalculatorLocaleContext).toolSlug;
}

export function useCalculatorTranslation() {
  const locale = useCalculatorLocale();
  return (value: string) => translateCalculatorText(value, locale);
}

const translatableProps = [
  "aria-label",
  "buttonText",
  "description",
  "eyebrow",
  "heading",
  "label",
  "message",
  "placeholder",
  "submitLabel",
  "title",
] as const;

export function localizeCalculatorNode(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translateCalculatorText(node, locale);
  if (Array.isArray(node)) return node.map((child) => localizeCalculatorNode(child, locale));
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const nextProps: Record<string, unknown> = {};

  for (const prop of translatableProps) {
    const value = element.props[prop];
    if (typeof value === "string") nextProps[prop] = translateCalculatorText(value, locale);
  }

  if ("children" in element.props) {
    nextProps.children = Children.map(element.props.children as ReactNode, (child) =>
      localizeCalculatorNode(child, locale),
    );
  }

  return cloneElement(element, nextProps);
}
