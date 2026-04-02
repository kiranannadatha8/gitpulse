import OpenAI from "openai";
import { env } from "../lib/env.js";
import { AIResponseSchema } from "../lib/schemas.js";
import type { AIResponse } from "../lib/schemas.js";
import type { PRDiff } from "./github.js";
import logger from "../lib/logger.js";

export class AIParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIParseError";
    Object.setPrototypeOf(this, AIParseError.prototype);
  }
}

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided GitHub pull request and return a structured JSON review.

Priority order for issues:
1. Security vulnerabilities (authentication, injection, data exposure)
2. Correctness bugs (logic errors, null dereferences, off-by-one)
3. Performance problems (N+1 queries, unnecessary re-renders, memory leaks)
4. Maintainability concerns (complex logic, missing tests, poor naming)
5. Style issues (formatting, conventions) — only note if significant

For each comment, assign a category:
- "bug": logic errors, incorrect behavior
- "security": auth, injection, data exposure, CSRF, XSS
- "performance": slow queries, inefficient algorithms, memory leaks
- "style": formatting, naming, conventions
- "test": missing or incorrect tests
- "docs": missing or outdated documentation
- "other": anything that doesn't fit above

Be specific and actionable. Include line numbers where applicable. Skip nitpicks.`;

// Typed as the json_schema object OpenAI expects
const REVIEW_JSON_SCHEMA: OpenAI.ResponseFormatJSONSchema["json_schema"] = {
  name: "pr_review",
  strict: true,
  schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Overall summary of the PR — what it does and key observations",
      },
      keyChanges: {
        type: "array",
        description: "2–6 concise bullet points summarising the key changes in this PR",
        items: { type: "string" },
        minItems: 1,
        maxItems: 6,
      },
      riskLevel: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description: "Overall risk level of merging this PR",
      },
      fileReviews: {
        type: "array",
        items: {
          type: "object",
          properties: {
            filename: { type: "string" },
            comments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  line: {
                    type: ["integer", "null"],
                    description: "Line number in the diff, or null if not line-specific",
                  },
                  category: {
                    type: "string",
                    enum: ["bug", "security", "performance", "style", "test", "docs", "other"],
                  },
                  severity: {
                    type: "string",
                    enum: ["info", "warning", "error", "critical"],
                  },
                  message: { type: "string" },
                  suggestion: {
                    type: ["string", "null"],
                    description: "Concrete suggestion for fixing the issue, or null",
                  },
                },
                required: ["line", "category", "severity", "message", "suggestion"],
                additionalProperties: false,
              },
            },
          },
          required: ["filename", "comments"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "keyChanges", "riskLevel", "fileReviews"],
    additionalProperties: false,
  },
};

// Singleton — reuses connection pool across requests
const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

function buildUserMessage(
  prTitle: string,
  prBody: string | null,
  files: PRDiff["files"]
): string {
  const descriptionSection =
    prBody && prBody.trim().length > 0
      ? `## PR Description\n${prBody.trim()}\n\n`
      : "";

  const fileSection = files
    .map((f) => {
      const patch = f.patch ?? "(binary or no diff available)";
      return `### ${f.filename} (${f.status})\n\`\`\`diff\n${patch}\n\`\`\``;
    })
    .join("\n\n");

  return `Review this GitHub PR titled: "${prTitle}"\n\n${descriptionSection}## Changed Files\n\n${fileSection || "No files changed."}`;
}

export async function analyzeDiff(
  prTitle: string,
  prBody: string | null,
  files: PRDiff["files"]
): Promise<AIResponse> {
  logger.info({ prTitle, fileCount: files.length }, "Sending diff to OpenAI");

  const userMessage = buildUserMessage(prTitle, prBody, files);

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_schema", json_schema: REVIEW_JSON_SCHEMA },
    });
  } catch (error) {
    logger.error({ error: String(error) }, "OpenAI API call failed");
    throw new AIParseError(`OpenAI API call failed: ${String(error)}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new AIParseError("OpenAI returned no text content");
  }

  // Zod as a safeguard against schema drift
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AIParseError(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
  }

  const result = AIResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.error({ errors: result.error.errors }, "OpenAI response failed Zod validation");
    throw new AIParseError(`OpenAI response schema mismatch: ${result.error.message}`);
  }

  logger.info({ prTitle }, "OpenAI diff analysis complete");
  return result.data;
}
