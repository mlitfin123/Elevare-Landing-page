import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/Callout";

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: (props) => <a {...props} />,
    Callout,
    ...components,
  };
}
