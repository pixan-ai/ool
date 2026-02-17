"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function MarkdownPreview({ content }: Props) {
  if (!content.trim()) {
    return (
      <p className="text-[var(--text-secondary)] text-sm italic">
        Nothing to preview
      </p>
    );
  }

  return (
    <article className="prose prose-invert prose-sm md:prose-base max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
