"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Props {
  content: string;
}

export default function MarkdownPreview({ content }: Props) {
  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full opacity-40">
        <p className="zen-quote text-center max-w-xs">
          The paper waits.<br />
          Begin with a single stroke.
        </p>
      </div>
    );
  }

  return (
    <article className="prose prose-invert prose-sm md:prose-base max-w-none animate-fade-in">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
