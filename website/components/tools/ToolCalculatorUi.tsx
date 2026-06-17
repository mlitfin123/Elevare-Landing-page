"use client";

import { trackEvent } from "@/lib/analytics";

export function formatDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function parseNumber(value: string) {
  return Number(value);
}

export function trackToolCalculation(toolSlug: string) {
  trackEvent("tool_calculation", {
    tool_slug: toolSlug,
  });
}

export function ToolFormCard({
  eyebrow = "Calculator",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <article className="panel tool-form-card">
        <div className="section-head tool-form-head">
          <span className="meta-pill">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
      </article>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <div className="form-feedback is-error">{message}</div>;
}

export function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel tool-result-card">
      <span className="meta-pill">Result</span>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export function ResultGrid({ children }: { children: React.ReactNode }) {
  return <div className="tool-result-grid">{children}</div>;
}

export function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="tool-result-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FormActions({
  toolSlug,
  submitLabel = "Calculate",
  children,
}: {
  toolSlug: string;
  submitLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="form-actions">
      <button
        className="button button-primary"
        type="submit"
        onClick={() => trackToolCalculation(toolSlug)}
      >
        {submitLabel}
      </button>
      {children}
    </div>
  );
}
