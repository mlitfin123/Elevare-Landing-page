import type { ReactNode } from "react";

type CalloutProps = {
  title: string;
  children: ReactNode;
};

export function Callout({ title, children }: CalloutProps) {
  return (
    <aside className="callout">
      <span className="meta-pill">Callout</span>
      <h2>{title}</h2>
      <div>{children}</div>
    </aside>
  );
}
