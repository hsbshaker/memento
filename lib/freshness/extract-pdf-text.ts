/**
 * PDF text extraction via unpdf (serverless-friendly pdf.js build). The
 * extractor is injectable so unit/e2e tests never load the dependency, and
 * per-page text is preserved so chunking can record page numbers.
 */

export interface PdfTextResult {
  pages: string[];
}

export type PdfExtractor = (bytes: Uint8Array) => Promise<PdfTextResult>;

const defaultExtractor: PdfExtractor = async (bytes) => {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const document = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(document, { mergePages: false });
  return { pages: Array.isArray(text) ? text : [String(text)] };
};

export async function extractPdfText(
  bytes: Uint8Array,
  extractImpl: PdfExtractor = defaultExtractor,
): Promise<PdfTextResult> {
  return extractImpl(bytes);
}

/**
 * Assembles per-page text into a single normalized document, recording where
 * each page starts so chunks can carry page numbers (1-indexed).
 */
export function assemblePdfDocument(pages: string[]): {
  text: string;
  pageOffsets: Array<{ page: number; offset: number }>;
} {
  const pageOffsets: Array<{ page: number; offset: number }> = [];
  const normalizedPages: string[] = [];
  let offset = 0;

  pages.forEach((page, index) => {
    const normalized = page
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 0)
      .join("\n");

    pageOffsets.push({ page: index + 1, offset });
    normalizedPages.push(normalized);
    offset += normalized.length + 1;
  });

  return { text: normalizedPages.join("\n"), pageOffsets };
}
