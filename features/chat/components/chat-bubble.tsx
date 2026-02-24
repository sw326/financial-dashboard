"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const markdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <code {...props} className="block bg-muted p-3 rounded-lg overflow-x-auto my-2 text-sm">
        {children}
      </code>
    ) : (
      <code {...props} className="bg-muted px-1.5 py-0.5 rounded text-sm">
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre {...props} className="bg-muted rounded-lg overflow-x-auto my-2">
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <table {...props} className="border-collapse border border-border my-2 w-full">
      {children}
    </table>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="border border-border px-3 py-2 bg-muted text-left text-sm font-medium">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border border-border px-3 py-2 text-sm">
      {children}
    </td>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="list-disc list-inside my-2 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="list-decimal list-inside my-2 space-y-1">
      {children}
    </ol>
  ),
  h1: ({ children, ...props }) => <h1 {...props} className="text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children, ...props }) => <h2 {...props} className="text-lg font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children, ...props }) => <h3 {...props} className="text-base font-bold mt-3 mb-1">{children}</h3>,
  blockquote: ({ children, ...props }) => (
    <blockquote {...props} className="border-l-4 border-border pl-4 italic my-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  p: ({ children, ...props }) => <p {...props} className="my-1">{children}</p>,
};

export function ChatBubble({ role, content, loading }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-none w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg mt-1">
          🦞
        </div>
      )}
      <div className={cn("max-w-[75%] rounded-2xl px-4 py-3", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        {loading ? (
          <div className="flex gap-1.5 py-1">
            <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : isUser ? (
          <span className="whitespace-pre-wrap text-sm">{content}</span>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
