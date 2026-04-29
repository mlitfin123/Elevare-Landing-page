import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";
import { ArticleLayout } from "@/components/ArticleLayout";
import { ProductCTA } from "@/components/ProductCTA";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { buildMetadata, siteConfig } from "@/lib/site";
import { getMDXComponents } from "@/mdx-components";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: "Post not found",
      description: "The requested article could not be found.",
      pathname: `/blog/${slug}`,
    });
  }

  return {
    ...buildMetadata({
      title: post.title,
      description: post.description,
      pathname: `/blog/${post.slug}`,
      type: "article",
    }),
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      siteName: siteConfig.title,
      type: "article",
      publishedTime: post.date,
      tags: [post.category, post.product],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const components = getMDXComponents({});

  return (
    <div className="container">
      <ArticleLayout post={post}>
        <MDXRemote
          source={post.content}
          components={components}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
            },
          }}
        />
      </ArticleLayout>

      {!post.hasInlineProductCTA ? <ProductCTA product={post.product} /> : null}
    </div>
  );
}
