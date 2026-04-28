import type { ReactNode } from "react";
import { formatDate, type BlogPost } from "@/lib/blog";

type ArticleLayoutProps = {
  post: BlogPost;
  children: ReactNode;
};

export function ArticleLayout({ post, children }: ArticleLayoutProps) {
  return (
    <article className="article-shell">
      <div className="article-meta">
        <span className="meta-pill">{post.category}</span>
        <span className="meta-pill">{post.product}</span>
        <span className="footer-copy">{formatDate(post.date)}</span>
      </div>
      <h1>{post.title}</h1>
      <p className="page-intro">{post.description}</p>
      <div className="article-body">{children}</div>
    </article>
  );
}
