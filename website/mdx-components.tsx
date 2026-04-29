import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/Callout";
import { ProductCTA } from "@/components/ProductCTA";

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: (props) => <a {...props} />,
    Callout,
    ProductCTA,
    ...components,
  };
}
