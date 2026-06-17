import { notFound } from "next/navigation";
import { ToolCalculatorRenderer } from "@/components/tools/ToolCalculatorRenderer";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { buildMetadata } from "@/lib/site";
import { getCalculatorPath, getTool, tools } from "@/lib/tools";

type CalculatorPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: CalculatorPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);

  if (!tool) {
    return buildMetadata({
      title: "Calculator not found",
      description: "The requested calculator could not be found.",
      pathname: `/calculators/${slug}`,
    });
  }

  return buildMetadata({
    title: tool.title,
    description: tool.metaDescription,
    pathname: getCalculatorPath(tool.slug),
  });
}

export default async function CalculatorPage({ params }: CalculatorPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolPageShell toolSlug={tool.slug}>
      <ToolCalculatorRenderer toolSlug={tool.slug} />
    </ToolPageShell>
  );
}
