import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Create a DOM window for server-side DOMPurify
const window = new JSDOM("").window;
const purify = DOMPurify(window as any);

/**
 * Sanitizes HTML content to prevent XSS attacks on the backend
 * Allows basic formatting tags while removing dangerous elements
 */
export function sanitizeHtml(dirty: string): string {
  // Configure DOMPurify to allow basic formatting
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "code",
      "br",
      "p",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "alt"],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Convert basic markdown-like syntax to HTML
 * This provides a simple rich text experience
 */
// export function markdownToHtml(text: string): string {
//   return (
//     text
//       // Bold text **text** -> <strong>text</strong>
//       .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//       // Italic text *text* -> <em>text</em>
//       .replace(/\*(.*?)\*/g, "<em>$1</em>")
//       // Inline code `code` -> <code>code</code>
//       .replace(/`(.*?)`/g, "<code>$1</code>")
//       // Line breaks
//       .replace(/\n/g, "<br>")
//   );
// }

/**
 * Process comment content for storage
 * Converts markdown-like syntax to HTML and sanitizes it
 */
export function processCommentContent(content: string): string {
  return sanitizeHtml(content);
}
