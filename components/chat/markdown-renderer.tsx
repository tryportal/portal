"use client"

import { memo, Suspense, lazy, type ReactNode, type ComponentType } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { sanitizeSchema } from "@/lib/markdown-config"

/**
 * Markdown Renderer
 * 
 * Optimized markdown rendering component with:
 * - Hoisted component definitions (created once at module load)
 * - Lazy-loaded syntax highlighter (Prism)
 * - Memoized renderer to prevent re-renders
 * - Style variants for own/other messages in bubble layout
 */

// =============================================================================
// LAZY-LOADED SYNTAX HIGHLIGHTER
// =============================================================================

// Lazy load Prism syntax highlighter to reduce initial bundle size
const SyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((mod) => ({
    default: mod.Prism,
  }))
)

// Lazy load the oneDark theme
const oneDarkStylePromise = import(
  "react-syntax-highlighter/dist/esm/styles/prism"
).then((mod) => mod.oneDark)

// Cache the resolved style
let cachedOneDarkStyle: Record<string, React.CSSProperties> | null = null

// Component that uses the lazy-loaded highlighter
function CodeBlockWithHighlighting({
  language,
  code,
}: {
  language: string
  code: string
}) {
  // Use cached style if available, otherwise trigger load
  if (!cachedOneDarkStyle) {
    oneDarkStylePromise.then((style) => {
      cachedOneDarkStyle = style
    })
  }

  return (
    <Suspense fallback={<CodeBlockFallback code={code} />}>
      <SyntaxHighlighterWrapper language={language} code={code} />
    </Suspense>
  )
}

// Wrapper that loads the style
function SyntaxHighlighterWrapper({
  language,
  code,
}: {
  language: string
  code: string
}) {
  // Dynamic import for style - will be cached after first load
  const LazyHighlighter = lazy(async () => {
    const [{ Prism }, { oneDark }] = await Promise.all([
      import("react-syntax-highlighter"),
      import("react-syntax-highlighter/dist/esm/styles/prism"),
    ])

    // Return a component that uses the loaded modules
    return {
      default: function HighlighterComponent() {
        return (
          <Prism
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: "0.5rem",
              fontSize: "13px",
              borderRadius: "0.375rem",
              border: "1px solid hsl(var(--border))",
            }}
          >
            {code}
          </Prism>
        )
      },
    }
  })

  return (
    <Suspense fallback={<CodeBlockFallback code={code} />}>
      <LazyHighlighter />
    </Suspense>
  )
}

// Fallback while syntax highlighter loads
function CodeBlockFallback({ code }: { code: string }) {
  return (
    <div
      className="rounded-md overflow-x-auto my-1.5 bg-[#282c34] text-[#abb2bf] p-2 text-[13px] font-mono"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      <pre className="m-0">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// =============================================================================
// HOISTED MARKDOWN COMPONENTS (Module-level constants)
// =============================================================================

// These component definitions are created once at module load time,
// not on every render. This is a key performance optimization.

// Paragraph component
const MarkdownParagraph = ({ children }: { children?: ReactNode }) => (
  <p className="mb-1 last:mb-0 [overflow-wrap:anywhere]">{children}</p>
)

// Pre block (wrapper for code)
const MarkdownPre = ({ children }: { children?: ReactNode }) => (
  <pre className="rounded-md overflow-x-auto my-1.5 [&>code]:p-0 [&>code]:bg-transparent [&>code]:rounded-none">
    {children}
  </pre>
)

// List components
const MarkdownUl = ({ children }: { children?: ReactNode }) => (
  <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
)

const MarkdownOl = ({
  children,
  start,
}: {
  children?: ReactNode
  start?: number
}) => (
  <ol start={start} className="list-decimal list-inside my-1 space-y-0.5">
    {children}
  </ol>
)

// Blockquote - base style, variants override colors
const MarkdownBlockquote = ({ children }: { children?: ReactNode }) => (
  <blockquote className="pl-2.5 py-0.5 my-1 border-l-2 border-border text-muted-foreground italic">
    {children}
  </blockquote>
)

// =============================================================================
// STYLE VARIANT FACTORY
// =============================================================================

// Factory function to create markdown components with style variants
function createMarkdownComponents(isOwn: boolean = false) {
  const textColor = isOwn ? "text-primary-foreground" : "text-foreground"
  const mutedTextColor = isOwn
    ? "text-primary-foreground/90"
    : "text-foreground/90"
  const linkColor = isOwn
    ? "text-primary-foreground/90 hover:text-primary-foreground"
    : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
  const inlineCodeBg = isOwn ? "bg-primary-foreground/20" : "bg-muted"
  const inlineCodeText = isOwn ? "text-primary-foreground" : "text-foreground/90"
  const mentionBg = isOwn ? "bg-primary-foreground/20" : "bg-primary/10"
  const mentionText = isOwn ? "text-primary-foreground" : "text-foreground/80"
  const blockquoteBorder = isOwn
    ? "border-primary-foreground/30"
    : "border-border"
  const blockquoteText = isOwn
    ? "text-primary-foreground/80"
    : "text-muted-foreground"

  return {
    p: MarkdownParagraph,
    pre: MarkdownPre,
    ul: MarkdownUl,
    ol: MarkdownOl,

    a: ({ href, children }: { href?: string; children?: ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkColor} hover:underline font-medium break-words`}
      >
        {children}
      </a>
    ),

    h1: ({ children }: { children?: ReactNode }) => (
      <h1 className={`text-2xl font-bold mb-2 mt-3 first:mt-0 ${textColor}`}>
        {children}
      </h1>
    ),

    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className={`text-xl font-bold mb-1.5 mt-2.5 first:mt-0 ${textColor}`}>
        {children}
      </h2>
    ),

    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className={`text-lg font-semibold mb-1 mt-2 first:mt-0 ${textColor}`}>
        {children}
      </h3>
    ),

    h4: ({ children }: { children?: ReactNode }) => (
      <h4
        className={`text-base font-semibold mb-1 mt-1.5 first:mt-0 ${textColor}`}
      >
        {children}
      </h4>
    ),

    h5: ({ children }: { children?: ReactNode }) => (
      <h5
        className={`text-sm font-semibold mb-0.5 mt-1 first:mt-0 ${textColor}`}
      >
        {children}
      </h5>
    ),

    h6: ({ children }: { children?: ReactNode }) => (
      <h6
        className={`text-sm font-medium mb-0.5 mt-1 first:mt-0 ${mutedTextColor}`}
      >
        {children}
      </h6>
    ),

    code: ({
      className,
      children,
      ...props
    }: {
      className?: string
      children?: ReactNode
    }) => {
      // Check if this is a code block (has language-* class)
      const match = /language-(\w+)/.exec(className || "")
      const codeString = String(children).replace(/\n$/, "")

      if (match) {
        return <CodeBlockWithHighlighting language={match[1]} code={codeString} />
      }

      // Inline code
      return (
        <code
          className={`px-1 py-0.5 ${inlineCodeBg} rounded text-[13px] font-mono ${inlineCodeText}`}
          {...props}
        >
          {children}
        </code>
      )
    },

    strong: ({ children }: { children?: ReactNode }) => {
      const text = typeof children === "string" ? children : String(children)
      // Check if this is a mention
      if (text.startsWith("@")) {
        return (
          <span
            className={`inline-flex items-center rounded px-1 py-0.5 font-medium ${mentionBg} ${mentionText} hover:opacity-80 transition-colors`}
          >
            {children}
          </span>
        )
      }
      return (
        <strong className={`font-semibold ${textColor}`}>{children}</strong>
      )
    },

    em: ({ children }: { children?: ReactNode }) => (
      <em className={`italic ${mutedTextColor}`}>{children}</em>
    ),

    del: ({ children }: { children?: ReactNode }) => (
      <del className={`line-through ${isOwn ? "text-primary-foreground/70" : "text-foreground/70"}`}>
        {children}
      </del>
    ),

    u: ({ children }: { children?: ReactNode }) => (
      <u className={`underline underline-offset-2 ${textColor}`}>{children}</u>
    ),

    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote
        className={`pl-2.5 py-0.5 my-1 border-l-2 ${blockquoteBorder} ${blockquoteText} italic`}
      >
        {children}
      </blockquote>
    ),
  }
}

// Pre-create the two style variants at module load time
const MARKDOWN_COMPONENTS_DEFAULT = createMarkdownComponents(false)
const MARKDOWN_COMPONENTS_OWN = createMarkdownComponents(true)

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface MarkdownRendererProps {
  content: string
  isOwn?: boolean
  className?: string
}

function MarkdownRendererInner({
  content,
  isOwn = false,
  className,
}: MarkdownRendererProps) {
  const components = isOwn ? MARKDOWN_COMPONENTS_OWN : MARKDOWN_COMPONENTS_DEFAULT

  return (
    <div
      className={`text-sm leading-[1.46] prose prose-sm max-w-none break-words overflow-hidden [overflow-wrap:anywhere] ${
        isOwn ? "text-primary-foreground prose-invert" : "text-foreground/90 dark:prose-invert"
      } ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Memoize the entire renderer
export const MarkdownRenderer = memo(MarkdownRendererInner)

// =============================================================================
// SEARCH HIGHLIGHT VARIANT
// =============================================================================

interface HighlightedTextProps {
  parts: Array<{ text: string; isMatch: boolean }>
  className?: string
}

/**
 * Renders text with search highlights.
 * Used when searching messages (disables markdown rendering for simpler highlight logic).
 */
export const HighlightedText = memo(function HighlightedText({
  parts,
  className,
}: HighlightedTextProps) {
  return (
    <p
      className={`mb-1 last:mb-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${className ?? ""}`}
    >
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800/40 text-foreground rounded px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </p>
  )
})
