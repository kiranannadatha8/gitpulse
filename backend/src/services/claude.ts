import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { ClaudeResponseSchema } from "../lib/schemas.js";
import type { ClaudeResponse } from "../lib/schemas.js";
import type { PRDiff } from "./github.js";
import logger from "../lib/logger.js";

export class ClaudeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeParseError";
    Object.setPrototypeOf(this, ClaudeParseError.prototype);
  }
}

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided GitHub pull request diff and return a structured JSON review.

Your response MUST be valid JSON matching this exact schema:
{
  "summary": "string — overall summary of the PR",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "fileReviews": [
    {
      "filename": "string",
      "comments": [
        {
          "line": number | null,
          "severity": "info" | "warning" | "error" | "critical",
          "message": "string",
          "suggestion": "string | null"
        }
      ]
    }
  ]
}

Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.`;

const RETRY_SYSTEM_PROMPT = `You are an expert code reviewer. Your previous response was not valid JSON.

You MUST return ONLY a valid JSON object matching this EXACT schema — no markdown, no backticks, no extra text:

{
  "summary": "Brief overall summary of the PR",
  "riskLevel": "low",
  "fileReviews": [
    {
      "filename": "example.ts",
      "comments": [
        {
          "line": 10,
          "severity": "warning",
          "message": "Describe the issue here",
          "suggestion": "Describe the fix here or null"
        }
      ]
    }
  ]
}

Valid values for riskLevel: "low", "medium", "high", "critical"
Valid values for severity: "info", "warning", "error", "critical"

Return ONLY the JSON object. Start your response with { and end with }.`;

function buildUserMessage(prTitle: string, files: PRDiff["files"]): string {
  const fileSection = files
    .map((f) => {
      const patch = f.patch ?? "(binary or no diff available)";
      return `### ${f.filename} (${f.status})\n\`\`\`diff\n${patch}\n\`\`\``;
    })
    .join("\n\n");

  return `Review this GitHub PR titled: "${prTitle}"\n\n${fileSection || "No files changed."}`;
}

function buildRetryUserMessage(
  prTitle: string,
  files: PRDiff["files"]
): string {
  const base = buildUserMessage(prTitle, files);
  return `${base}\n\nIMPORTANT: Your previous response was not valid JSON. Please respond with ONLY a valid JSON object. Do NOT include any text outside the JSON. Start immediately with { and end with }.`;
}

function parseClaudeText(text: string): ClaudeResponse {
  let jsonText = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  const parsed: unknown = JSON.parse(jsonText);
  return ClaudeResponseSchema.parse(parsed);
}

export async function analyzeDiff(
  prTitle: string,
  files: PRDiff["files"]
): Promise<ClaudeResponse> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  logger.info({ prTitle, fileCount: files.length }, "Sending diff to Claude");

  const userMessage = buildUserMessage(prTitle, files);

  let firstError: unknown;

  // First attempt
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new ClaudeParseError("Claude returned no text content");
    }

    return parseClaudeText(textBlock.text);
  } catch (error) {
    if (error instanceof ClaudeParseError) {
      firstError = error;
    } else if (error instanceof SyntaxError) {
      firstError = error;
    } else {
      // Zod validation error or other
      firstError = error;
    }
    logger.warn({ error: String(error) }, "First Claude attempt failed, retrying");
  }

  // Second attempt with stricter prompt
  try {
    const retryUserMessage = buildRetryUserMessage(prTitle, files);

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: RETRY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: retryUserMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new ClaudeParseError("Claude returned no text content on retry");
    }

    return parseClaudeText(textBlock.text);
  } catch (error) {
    logger.error(
      { firstError: String(firstError), retryError: String(error) },
      "Both Claude attempts failed"
    );
    throw new ClaudeParseError(
      `Failed to parse Claude response after 2 attempts. Last error: ${String(error)}`
    );
  }
}
