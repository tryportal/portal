"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { Copy, Check } from "@phosphor-icons/react";
import { useTheme } from "next-themes";

interface ShikiCodeProps {
  code: string;
  language: string;
}

export function ShikiCode({ code, language }: ShikiCodeProps) {
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: language,
      theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
    })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml("");
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, resolvedTheme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!html) {
    return (
      <div className="shiki-wrapper group/code relative">
        <div className="shiki-header">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{language}</span>
          <button onClick={handleCopy} className="shiki-copy">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
        <pre className="shiki-fallback">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="shiki-wrapper group/code relative">
      <div className="shiki-header">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className="shiki-copy">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} className="shiki-content" />
    </div>
  );
}
