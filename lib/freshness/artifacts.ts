import type { SupabaseClient } from "@supabase/supabase-js";

import { SOURCE_ARTIFACTS_BUCKET } from "@/lib/constants/freshness-schema";

/**
 * Immutable, content-addressed raw source artifacts. Original bytes are
 * uploaded BEFORE extraction; an upload failure is a retrieval failure (no
 * snapshot counts as processed without its artifact). The bucket is private —
 * admin access only via short-lived signed URLs generated server-side.
 */

export interface ArtifactStore {
  /** Stores bytes at the content-addressed path. Idempotent for identical content. */
  put(input: {
    sha256: string;
    bytes: Uint8Array;
    contentType: string | null;
    extension: string;
  }): Promise<{ path: string }>;
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export function artifactPathFor(sha256: string, extension: string): string {
  const normalizedExt = extension.startsWith(".") ? extension : `.${extension}`;
  return `raw/${sha256.slice(0, 2)}/${sha256}${normalizedExt}`;
}

export function extensionForContent(
  contentType: string | null,
  sourceType: "html" | "pdf" | "manual_upload",
): string {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("application/pdf") || sourceType === "pdf") return ".pdf";
  if (normalized.includes("text/html") || normalized.includes("application/xhtml") || sourceType === "html") {
    return ".html";
  }
  return ".bin";
}

export function createSupabaseArtifactStore(client: SupabaseClient): ArtifactStore {
  return {
    async put({ sha256, bytes, contentType, extension }) {
      const path = artifactPathFor(sha256, extension);
      const { error } = await client.storage
        .from(SOURCE_ARTIFACTS_BUCKET)
        .upload(path, bytes, {
          contentType: contentType ?? "application/octet-stream",
          upsert: false,
        });

      // Content addressing: an existing object at this path is byte-identical.
      if (error && !/already exists/i.test(error.message)) {
        throw new Error(`artifact upload failed for ${path}: ${error.message}`);
      }
      return { path };
    },

    async createSignedUrl(path, expiresInSeconds) {
      const { data, error } = await client.storage
        .from(SOURCE_ARTIFACTS_BUCKET)
        .createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) {
        throw new Error(`failed to sign artifact url for ${path}: ${error?.message ?? "no url"}`);
      }
      return data.signedUrl;
    },
  };
}

/** Test double: keeps artifacts in memory; signed URLs are opaque fakes. */
export class InMemoryArtifactStore implements ArtifactStore {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string | null }>();
  failNextPut = false;

  async put(input: {
    sha256: string;
    bytes: Uint8Array;
    contentType: string | null;
    extension: string;
  }): Promise<{ path: string }> {
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error("artifact upload failed (simulated)");
    }
    const path = artifactPathFor(input.sha256, input.extension);
    if (!this.objects.has(path)) {
      this.objects.set(path, { bytes: input.bytes, contentType: input.contentType });
    }
    return { path };
  }

  async createSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    if (!this.objects.has(path)) {
      throw new Error(`no artifact at ${path}`);
    }
    return `memory://signed/${path}?expires_in=${expiresInSeconds}`;
  }
}
