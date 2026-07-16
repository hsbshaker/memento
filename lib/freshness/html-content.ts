import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import type { SourceParserConfig } from "@/lib/types/freshness-schema";

/**
 * Deterministic HTML → normalized text extraction on top of cheerio (mature DOM
 * parser). Supports per-source content selectors / ignore selectors and a
 * generic visible-text fallback. Output is stable: block-level elements become
 * newline-separated lines, inline whitespace is collapsed, entities are decoded
 * by the DOM parser.
 *
 * Note: when content_selectors are configured but match nothing, we return
 * empty text on purpose (no silent fallback) — content-validation then flags
 * the snapshot as suspect, which is the correct signal for selector drift.
 */

const STRIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "head",
  "iframe",
  "svg",
  "object",
  "embed",
  "link",
  "meta",
  "picture",
  "source",
  "video",
  "audio",
  "canvas",
]);

const FALLBACK_IGNORE_SELECTOR = "nav, footer, aside";

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "blockquote",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3"]);

export interface ExtractedContent {
  text: string;
  headings: Array<{ text: string; offset: number }>;
}

interface TextBlock {
  text: string;
  isHeading: boolean;
}

const collapseInlineWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const isTextNode = (node: AnyNode): node is AnyNode & { data: string } =>
  node.type === "text" && typeof (node as { data?: unknown }).data === "string";

const isTagNode = (
  node: AnyNode,
): node is AnyNode & { name: string; children: AnyNode[] } =>
  (node.type === "tag" || node.type === "script" || node.type === "style") &&
  typeof (node as { name?: unknown }).name === "string";

export function extractHtmlText(
  html: string,
  config: Pick<SourceParserConfig, "content_selectors" | "ignore_selectors"> = {},
): ExtractedContent {
  const $ = cheerio.load(html);

  $([...STRIP_TAGS].join(", ")).remove();

  for (const selector of config.ignore_selectors ?? []) {
    try {
      $(selector).remove();
    } catch {
      // An invalid configured selector must not break parsing; it is simply skipped.
    }
  }

  let roots: AnyNode[] = [];
  const contentSelectors = (config.content_selectors ?? []).filter(
    (selector) => selector.trim().length > 0,
  );

  if (contentSelectors.length > 0) {
    for (const selector of contentSelectors) {
      try {
        $(selector).each((_, element) => {
          roots.push(element);
        });
      } catch {
        // Invalid selector — skipped; drift is surfaced via content validation.
      }
    }
  } else {
    $(FALLBACK_IGNORE_SELECTOR).remove();
    const body = $("body");
    roots = body.length > 0 ? body.toArray() : $.root().toArray();
  }

  const blocks: TextBlock[] = [];
  let buffer: string[] = [];

  const flush = (isHeading: boolean) => {
    const text = collapseInlineWhitespace(buffer.join(" "));
    buffer = [];
    if (text.length > 0) {
      blocks.push({ text, isHeading });
    }
  };

  const walk = (node: AnyNode, insideHeading: boolean) => {
    if (isTextNode(node)) {
      buffer.push(node.data);
      return;
    }

    if (!isTagNode(node)) return;

    const name = node.name.toLowerCase();
    if (STRIP_TAGS.has(name)) return;

    if (name === "br") {
      flush(insideHeading);
      return;
    }

    const heading = HEADING_TAGS.has(name);
    const block = BLOCK_TAGS.has(name);

    if (block || heading) flush(insideHeading);

    for (const child of node.children ?? []) {
      walk(child, insideHeading || heading);
    }

    if (block || heading) flush(insideHeading || heading);
  };

  for (const root of roots) {
    walk(root, false);
    flush(false);
  }

  const headings: Array<{ text: string; offset: number }> = [];
  let offset = 0;
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.isHeading) {
      headings.push({ text: block.text, offset });
    }
    lines.push(block.text);
    offset += block.text.length + 1; // +1 for the joining newline
  }

  return { text: lines.join("\n"), headings };
}

/** Pure text normalization (idempotent) shared by tests and evidence matching. */
export function normalizeWhitespaceText(text: string): string {
  return text
    .split("\n")
    .map((line) => collapseInlineWhitespace(line))
    .filter((line) => line.length > 0)
    .join("\n");
}
