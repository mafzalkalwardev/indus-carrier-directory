"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

type Props = {
  value: string;
  children?: ReactNode;
  className?: string;
  title?: string;
  as?: "button" | "span";
};

async function writeClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export function Copyable({ value, children, className, title, as = "button" }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = value.trim();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!text) return null;

  async function copy(event: MouseEvent | KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await writeClipboard(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const label = title ?? `Copy ${text}`;
  const classes = ["copyable", copied ? "is-copied" : "", className].filter(Boolean).join(" ");
  const content = (
    <>
      <span className="copyable-value">{children ?? text}</span>
      <span className="copyable-hint" aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </>
  );

  if (as === "span") {
    return (
      <span
        className={classes}
        role="button"
        tabIndex={0}
        title={label}
        aria-label={label}
        onClick={copy}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") copy(event);
        }}
      >
        {content}
      </span>
    );
  }

  return (
    <button type="button" className={classes} title={label} aria-label={label} onClick={copy}>
      {content}
    </button>
  );
}
