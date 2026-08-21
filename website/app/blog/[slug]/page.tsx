import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";
import { ArticleLayout } from "@/components/ArticleLayout";
import { ProductCTA } from "@/components/ProductCTA";
import { QuickAnalysisCTA } from "@/components/quick-analysis/QuickAnalysisCTA";
import { MarketplaceSupportCta } from "@/components/marketplace/MarketplaceSupportCta";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { getAdjacentPosts, getAllPosts, getBlogFeaturedImagePath, getPostBySlug } from "@/lib/blog";
import { absoluteUrl, buildMetadata, siteConfig } from "@/lib/site";
import { getContextualMarketplaceLink } from "@/lib/marketplace-seo";
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
  const socialImageUrl = featuredImageUrl ?? absoluteUrl("/logo_transparent.png");

  return {
    ...buildMetadata({
      title: post.title,
      description: post.description,
      pathname: `/blog/${post.slug}`,
      type: "article",
      imageUrl: socialImageUrl,
    }),
    openGraph: {
      title: `${post.title} | ${siteConfig.title}`,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      siteName: siteConfig.title,
      type: "article",
      publishedTime: post.date,
      tags: [post.category, post.product],
      images: [{ url: socialImageUrl, alt: post.title }],
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
  const marketplaceLink = getContextualMarketplaceLink(post.category, post.product);
  const prepNavigation = post.category === "prep-files" ? getAdjacentPosts(post) : null;

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

      {post.category === "prep-files" ? (
        <QuickAnalysisCTA
          source="prep-files"
          heading="Where does your physique stand?"
          description="Get a one-time StageLab analysis of visible conditioning, muscularity, symmetry, presentation, and stage-readiness context from 3-5 current photos."
          buttonText="Get My Analysis"
          headingLevel={2}
          className="quick-analysis-article-cta"
        />
      ) : post.category === "prep" ? (
        <QuickAnalysisCTA
          source="prep-blog"
          heading="Add a visual physique checkpoint."
          description="StageLab Quick Analysis provides a one-time visual assessment of current conditioning, muscularity, symmetry, and presentation from 3-5 photos."
          buttonText="Get My Analysis"
          headingLevel={2}
          className="quick-analysis-article-cta"
        />
      ) : null}

      {prepNavigation ? (
        <section className="section" aria-labelledby="prep-files-navigation">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Continue the series</div>
              <h2 id="prep-files-navigation">More Prep Files</h2>
            </div>
          </div>

          <div className="grid-2">
            {prepNavigation.previous ? (
              <TrackedLink
                className="panel link-panel"
                href={`/blog/${prepNavigation.previous.slug}`}
                eventName="article_click"
                eventParams={{
                  article_slug: prepNavigation.previous.slug,
                  source_page: `prep_files_previous_${post.slug}`,
                }}
              >
                <span className="stat-label">Previous</span>
                <h3>{prepNavigation.previous.title}</h3>
                <p>{prepNavigation.previous.description}</p>
              </TrackedLink>
            ) : null}

            {prepNavigation.next ? (
              <TrackedLink
                className="panel link-panel"
                href={`/blog/${prepNavigation.next.slug}`}
                eventName="article_click"
                eventParams={{
                  article_slug: prepNavigation.next.slug,
                  source_page: `prep_files_next_${post.slug}`,
                }}
              >
                <span className="stat-label">Next</span>
                <h3>{prepNavigation.next.title}</h3>
                <p>{prepNavigation.next.description}</p>
              </TrackedLink>
            ) : null}
          </div>

          {prepNavigation.related.length > 0 ? (
            <div className="related-links-block">
              <h3>Related Prep Files</h3>
              <div className="related-links-list">
                {prepNavigation.related.map((relatedPost) => (
                  <TrackedLink
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    eventName="article_click"
                    eventParams={{
                      article_slug: relatedPost.slug,
                      source_page: `prep_files_related_${post.slug}`,
                    }}
                  >
                    {relatedPost.title}
                  </TrackedLink>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!post.hasInlineProductCTA ? <ProductCTA product={post.product} context={`blog_post_${post.slug}`} /> : null}
      <MarketplaceSupportCta
        href={marketplaceLink.href}
        label={marketplaceLink.label}
        context={`blog_post_${post.slug}`}
      />
    </div>
  );
}
