import Anthropic from "@anthropic-ai/sdk";

import type { ExtractedCandidate } from "@/lib/freshness/extraction-schema";
import {
  EXTRACTION_TOOL_SCHEMA,
  validateExtractionOutput,
} from "@/lib/freshness/extraction-schema";
import {
  buildExtractionUserContent,
  EXTRACTION_SYSTEM_PROMPT,
  type ExtractionPromptInput,
} from "@/lib/freshness/extraction-prompt";

/**
 * Provider-agnostic extraction seam. The model id is always supplied by the
 * caller (env-configured — never hardcoded here); the orchestrator's two-pass
 * flow passes the routine model first and the escalation model for flagged
 * chunks. Output is schema-constrained via strict tool use AND re-validated by
 * the hand-rolled validator (defense in depth; the only gate for non-Anthropic
 * providers). Any invalid output throws — the extraction attempt fails closed.
 */

export interface ExtractionRequest extends ExtractionPromptInput {
  model: string;
}

export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface ExtractionResult {
  candidates: ExtractedCandidate[];
  model: string;
  usage: ExtractionUsage;
}

export interface ExtractionProvider {
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}

const EXTRACTION_TOOL_NAME = "report_benefit_extraction";
const MAX_OUTPUT_TOKENS = 8192;

export function createAnthropicExtractionProvider(config: {
  apiKey: string;
}): ExtractionProvider {
  const client = new Anthropic({ apiKey: config.apiKey });

  return {
    async extract(request) {
      const response = await client.messages.create({
        model: request.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [
          {
            type: "text",
            text: EXTRACTION_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: buildExtractionUserContent(request) }],
        tools: [
          {
            name: EXTRACTION_TOOL_NAME,
            description:
              "Report the structured benefit candidates extracted from the provided document chunk.",
            strict: true,
            input_schema: EXTRACTION_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      });

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (!toolUse) {
        throw new Error(
          `extraction returned no tool_use block (stop_reason: ${response.stop_reason})`,
        );
      }

      const validated = validateExtractionOutput(toolUse.input);
      if (!validated.ok) {
        throw new Error(`extraction output failed validation: ${validated.errors.join("; ")}`);
      }

      return {
        candidates: validated.value.candidates,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        },
      };
    },
  };
}

/** Scripted fake for tests and the eval harness's offline mode. */
export function createFakeExtractionProvider(
  script: (request: ExtractionRequest) => ExtractedCandidate[] | Error,
  usage: ExtractionUsage = { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 0 },
): ExtractionProvider {
  return {
    async extract(request) {
      const result = script(request);
      if (result instanceof Error) throw result;
      const validated = validateExtractionOutput({ candidates: result });
      if (!validated.ok) {
        throw new Error(`fake extraction output failed validation: ${validated.errors.join("; ")}`);
      }
      return { candidates: validated.value.candidates, model: request.model, usage };
    },
  };
}
