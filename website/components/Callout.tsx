import type { ReactNode } from "react";

type CalloutProps = {
  title: string;
  children: ReactNode;
  label?: string;
};

export function Callout({ title, children, label = "Callout" }: CalloutProps) {
  return (
    <aside className="callout">
      <span className="meta-pill">{label}</span>
      <h2>{title}</h2>
      <div>{children}</div>
    </aside>
  );
}
