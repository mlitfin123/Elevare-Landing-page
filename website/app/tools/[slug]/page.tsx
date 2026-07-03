import { notFound } from "next/navigation";
import { ToolCalculatorRenderer } from "@/components/tools/ToolCalculatorRenderer";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { buildMetadata } from "@/lib/site";
import { getCalculatorPath, getTool, tools } from "@/lib/tools";

type ToolPageProps = {
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

export async function generateMetadata({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getTool(slug);

  if (!tool) {
    return buildMetadata({
      title: "Tool not found",
      description: "The requested tool could not be found.",
      pathname: `/tools/${slug}`,
      canonicalPath: `/calculators/${slug}`,
      robots: {
        index: false,
        follow: true,
      },
    });
  }

  return buildMetadata({
    title: tool.title,
    description: tool.metaDescription,
    pathname: `/tools/${tool.slug}`,
    canonicalPath: getCalculatorPath(tool.slug),
    robots: {
      index: false,
      follow: true,
    },
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
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
