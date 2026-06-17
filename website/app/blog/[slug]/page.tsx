import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";
import { ArticleLayout } from "@/components/ArticleLayout";
import { ProductCTA } from "@/components/ProductCTA";
import { StructuredData } from "@/components/StructuredData";
import { getAllPosts, getBlogFeaturedImagePath, getPostBySlug } from "@/lib/blog";
import { absoluteUrl, buildMetadata, siteConfig } from "@/lib/site";
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

  const featuredImagePath = getBlogFeaturedImagePath(post.slug);
  const featuredImageUrl = featuredImagePath ? absoluteUrl(featuredImagePath) : undefined;

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
      url: absoluteUrl(`/blog/${post.slug}`),
      siteName: siteConfig.title,
      type: "article",
      publishedTime: post.date,
      tags: [post.category, post.product],
      ...(featuredImageUrl ? { images: [{ url: featuredImageUrl, alt: post.title }] } : {}),
    },
  };
}

function buildBlogStructuredData(post: NonNullable<ReturnType<typeof getPostBySlug>>) {
  const featuredImagePath = getBlogFeaturedImagePath(post.slug);
  const featuredImageUrl = featuredImagePath ? absoluteUrl(featuredImagePath) : undefined;

  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: absoluteUrl("/blog"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: absoluteUrl(`/blog/${post.slug}`),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "en-US",
      articleSection: post.category,
      keywords: [post.category, post.product],
      author: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/logo_transparent.png"),
        },
      },
      ...(featuredImageUrl ? { image: [featuredImageUrl] } : {}),
    },
  ];
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const components = getMDXComponents({});
  const structuredData = buildBlogStructuredData(post);

  return (
    <div className="container">
      <StructuredData data={structuredData} />

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

      {!post.hasInlineProductCTA ? <ProductCTA product={post.product} context={`blog_post_${post.slug}`} /> : null}
    </div>
  );
}
