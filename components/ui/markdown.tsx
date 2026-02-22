"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
  variant?: "default" | "inline";
}

export function Markdown({
  children,
  className,
  variant = "default",
}: MarkdownProps) {
  // 性能优化：检测是否真的包含 Markdown 字符
  // 如果不含特殊字符，直接渲染纯文本，跳过复杂的解析引擎
  const hasMarkdown = /[#*_[\]`|]/.test(children || "");

  if (!hasMarkdown) {
    if (variant === "inline") {
      return <span className={className}>{children}</span>;
    }
    return (
      <div className={cn("markdown-content w-full overflow-hidden", className)}>
        <p className='mb-4 last:mb-0 leading-relaxed text-foreground/90 break-words'>
          {children}
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span className='inline'>{children}</span>,
          a: ({ ...props }) => (
            <a
              {...props}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary underline decoration-primary/30 transition-colors hover:text-primary/80'
            />
          ),
          h1: ({ children }) => <span className='font-bold'>{children}</span>,
          h2: ({ children }) => <span className='font-bold'>{children}</span>,
          h3: ({ children }) => <span className='font-bold'>{children}</span>,
          ul: ({ children }) => <span className='inline'>{children}</span>,
          ol: ({ children }) => <span className='inline'>{children}</span>,
          li: ({ children }) => (
            <span className="after:content-[','] last:after:content-none ml-1">
              {children}
            </span>
          ),
          blockquote: ({ children }) => (
            <span className='italic opacity-80 italic'>{children}</span>
          ),
          code: ({ children }) => (
            <code className='bg-muted px-1.5 py-0.5 rounded text-[0.9em] font-mono font-medium break-all'>
              {children}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    );
  }

  return (
    <div className={cn("markdown-content w-full overflow-hidden", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary font-medium hover:underline decoration-primary/30 underline-offset-4 transition-all'
            />
          ),
          p: ({ ...props }) => (
            <p
              {...props}
              className='mb-4 last:mb-0 leading-relaxed text-foreground/90 break-words'
            />
          ),
          ul: ({ ...props }) => (
            <ul
              {...props}
              className='list-disc list-outside ml-5 mb-4 space-y-2 text-foreground/90'
            />
          ),
          ol: ({ ...props }) => (
            <ol
              {...props}
              className='list-decimal list-outside ml-5 mb-4 space-y-2 text-foreground/90'
            />
          ),
          li: ({ ...props }) => (
            <li
              {...props}
              className='pl-1 break-words marker:text-primary/50 marker:font-bold'
            />
          ),
          h1: ({ ...props }) => (
            <h1
              {...props}
              className='text-2xl font-black mb-4 mt-8 first:mt-0 text-foreground tracking-tight border-b border-border/50 pb-2'
            />
          ),
          h2: ({ ...props }) => (
            <h2
              {...props}
              className='text-xl font-bold mb-3 mt-6 text-foreground tracking-tight'
            />
          ),
          h3: ({ ...props }) => (
            <h3
              {...props}
              className='text-lg font-bold mb-2 mt-4 text-foreground/90 tracking-tight'
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className='border-l-4 border-primary/20 bg-primary/5 px-5 py-3 rounded-r-xl italic text-foreground/70 my-4 font-serif'
            />
          ),
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className;
            return isInline ? (
              <code
                {...props}
                className='bg-muted px-1.5 py-0.5 rounded text-[0.85em] font-mono font-semibold text-foreground/80 break-all whitespace-normal border border-border/50 shadow-sm'
              >
                {children}
              </code>
            ) : (
              <div className='relative group my-5'>
                <div className='absolute -inset-1 bg-gradient-to-r from-primary/5 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500' />
                <code
                  {...props}
                  className={cn(
                    "block bg-zinc-950 dark:bg-black/40 text-zinc-100 p-5 rounded-xl text-[13px] font-mono overflow-x-auto border border-white/10 shadow-2xl relative",
                    match && `language-${match[1]}`,
                  )}
                >
                  {children}
                </code>
              </div>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ ...props }) => (
            <div className='overflow-x-auto w-full my-6 border rounded-xl border-border bg-card shadow-sm'>
              <table
                {...props}
                className='w-full border-collapse text-sm'
              />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead
              {...props}
              className='bg-muted/50 border-b border-border'
            />
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className='px-4 py-3 text-left font-bold text-foreground/80 uppercase tracking-widest text-[10px]'
            />
          ),
          td: ({ ...props }) => (
            <td
              {...props}
              className='px-4 py-3 text-foreground/70 border-t border-border/40 transition-colors hover:bg-muted/20'
            />
          ),
          hr: () => <hr className='my-8 border-border/50' />,
          img: ({ ...props }) => (
            <img
              {...props}
              alt={props.alt || ""}
              className='rounded-2xl border border-border/50 shadow-lg my-6 max-w-full hover:scale-[1.01] transition-transform duration-500'
              loading='lazy'
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
