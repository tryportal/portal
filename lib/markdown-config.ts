import { defaultSchema } from "rehype-sanitize"

// Restrictive sanitize schema for markdown content
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    // Basic formatting
    "b", "i", "strong", "em", "code", "pre",
    // Links
    "a",
    // Lists
    "ul", "ol", "li",
    // Block elements
    "p", "br", "blockquote",
    // Headings
    "h1", "h2", "h3", "h4", "h5", "h6",
    // Tables (for GFM)
    "table", "thead", "tbody", "tr", "th", "td",
    // Code blocks
    "span", "div",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ["href", "title"],
    code: ["className"],
    pre: ["className"],
    span: ["className", "style"],
    div: ["className"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
  strip: ["script", "style", "iframe", "object", "embed", "form", "input"],
}
