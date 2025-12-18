"use client";

import { processCommentContent } from "@/lib/sanitize";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

/**
 * SafeHtml component for rendering sanitized HTML content
 * Automatically processes and sanitizes content to prevent XSS attacks
 */
export function SafeHtml({ content, className }: SafeHtmlProps) {
  const sanitizedContent = processCommentContent(content);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
