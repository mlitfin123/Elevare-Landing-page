import Link from "next/link";
import { formatDate, type BlogPostSummary } from "@/lib/blog";

type BlogCardProps = {
  post: BlogPostSummary;
};

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="blog-card">
      <div className="blog-card-top">
        <span className="meta-pill">{post.category}</span>
        <span className="meta-pill">{post.product}</span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <div className="blog-card-footer">
        <span className="footer-copy">{formatDate(post.date)}</span>
        <Link className="blog-link" href={`/blog/${post.slug}`}>
          Read article
        </Link>
      </div>
    </article>
  );
}
