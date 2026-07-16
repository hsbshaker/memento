import { CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from "@/lib/freshness/constants";

/**
 * Bounded, deterministic chunking for long HTML/PDF documents. Chunks preserve
 * page numbers, nearest section headings, stable chunk ids, and offsets into
 * the normalized document text so evidence can be located exactly. Splits
 * prefer line boundaries; consecutive chunks overlap so terms straddling a
 * boundary are still seen in one request.
 */

export interface ChunkingInput {
  text: string;
  headings?: Array<{ text: string; offset: number }>;
  /** For PDFs: offset in `text` where each page starts. */
  pageOffsets?: Array<{ page: number; offset: number }>;
  /** SHA-256 of the normalized text; chunk ids are `<sha>#<index>`. */
  normalizedSha256: string;
}

export interface ChunkingOptions {
  maxChars?: number;
  overlapChars?: number;
}

export interface DocumentChunk {
  index: number;
  chunkId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  sectionHeading: string | null;
  pageNumber: number | null;
}

const nearestAtOrBefore = <T extends { offset: number }>(
  items: T[] | undefined,
  offset: number,
): T | null => {
  if (!items || items.length === 0) return null;
  let best: T | null = null;
  for (const item of items) {
    if (item.offset <= offset && (best === null || item.offset > best.offset)) {
      best = item;
    }
  }
  return best;
};

export function chunkDocument(
  input: ChunkingInput,
  options: ChunkingOptions = {},
): DocumentChunk[] {
  const maxChars = options.maxChars ?? CHUNK_MAX_CHARS;
  const overlap = Math.min(options.overlapChars ?? CHUNK_OVERLAP_CHARS, Math.floor(maxChars / 4));
  const { text } = input;

  if (text.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    if (end < text.length) {
      // Prefer breaking at the last line boundary inside the window (but keep
      // at least half the window so a pathological single line still advances).
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start + Math.floor(maxChars / 2)) {
        end = lastNewline;
      }
    }

    const heading = nearestAtOrBefore(
      input.headings?.map((h) => ({ offset: h.offset, value: h.text })),
      start,
    );
    const page = nearestAtOrBefore(
      input.pageOffsets?.map((p) => ({ offset: p.offset, value: p.page })),
      start,
    );

    chunks.push({
      index,
      chunkId: `${input.normalizedSha256}#${index}`,
      text: text.slice(start, end),
      startOffset: start,
      endOffset: end,
      sectionHeading: heading?.value ?? null,
      pageNumber: page?.value ?? null,
    });

    if (end >= text.length) break;

    // Overlap the next chunk, aligned back to a line start where possible.
    let nextStart = Math.max(end - overlap, start + 1);
    const lineStart = text.lastIndexOf("\n", nextStart);
    if (lineStart > start) {
      nextStart = lineStart + 1;
    }
    start = nextStart;
    index += 1;
  }

  return chunks;
}
