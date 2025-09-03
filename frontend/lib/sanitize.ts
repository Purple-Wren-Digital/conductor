import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Allows basic formatting tags while removing dangerous elements
 */
export function sanitizeHtml(dirty: string): string {
  // Configure DOMPurify to allow basic formatting
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "code", "br", "p"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Convert basic markdown-like syntax to HTML
 * This provides a simple rich text experience
 */
export function markdownToHtml(text: string): string {
  return (
    text
      // Bold text **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic text *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Inline code `code` -> <code>code</code>
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Line breaks
      .replace(/\n/g, "<br>")
  );
}

/**
 * Process comment content for display
 * Converts markdown-like syntax to HTML and sanitizes it
 */
export function processCommentContent(content: string): string {
  const htmlContent = markdownToHtml(content);
  return sanitizeHtml(htmlContent);
}
