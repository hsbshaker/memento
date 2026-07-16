import Anthropic from "@anthropic-ai/sdk";

import type { ModelConfig } from "@/lib/freshness/constants";

/**
 * Validates the configured extraction models BEFORE any extraction work, so a
 * bad model id or missing key surfaces as a clear configuration error (run
 * summary + alert + admin config check) instead of failing mid-extraction.
 * Successful validations are cached per process.
 */

export interface ModelInfoFetcher {
  retrieve(modelId: string): Promise<{ id: string }>;
}

export interface ModelValidationResult {
  ok: boolean;
  errors: string[];
}

const validatedModels = new Set<string>();

export function createAnthropicModelInfoFetcher(apiKey: string): ModelInfoFetcher {
  const client = new Anthropic({ apiKey });
  return {
    async retrieve(modelId) {
      const model = await client.models.retrieve(modelId);
      return { id: model.id };
    },
  };
}

export function clearModelValidationCache(): void {
  validatedModels.clear();
}

export async function validateModelConfig(
  config: ModelConfig,
  fetcher?: ModelInfoFetcher,
): Promise<ModelValidationResult> {
  const errors: string[] = [];

  if (!config.apiKey) errors.push("ANTHROPIC_API_KEY is not set");
  if (!config.model) errors.push("FRESHNESS_MODEL is not set");
  if (errors.length > 0) return { ok: false, errors };

  const resolvedFetcher = fetcher ?? createAnthropicModelInfoFetcher(config.apiKey as string);
  const modelsToCheck = [config.model as string];
  if (config.escalationModel) modelsToCheck.push(config.escalationModel);

  for (const modelId of modelsToCheck) {
    if (validatedModels.has(modelId)) continue;
    try {
      await resolvedFetcher.retrieve(modelId);
      validatedModels.add(modelId);
    } catch (error) {
      errors.push(
        `model "${modelId}" failed validation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
