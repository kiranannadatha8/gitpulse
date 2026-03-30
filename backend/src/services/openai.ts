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

// Singleton — reuses connection pool across requests
const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

function buildUserMessage(prTitle: string, files: PRDiff["files"]): string {
  const fileSection = files
    .map((f) => {
      const patch = f.patch ?? "(binary or no diff available)";
      return `### ${f.filename} (${f.status})\n\`\`\`diff\n${patch}\n\`\`\``;
    })
    .join("\n\n");

  return `Review this GitHub PR titled: "${prTitle}"\n\n${fileSection || "No files changed."}`;
}

function buildRetryUserMessage(prTitle: string, files: PRDiff["files"]): string {
  const base = buildUserMessage(prTitle, files);
  return `${base}\n\nIMPORTANT: Your previous response was not valid JSON. Please respond with ONLY a valid JSON object. Do NOT include any text outside the JSON. Start immediately with { and end with }.`;
}

function parseResponseText(text: string): AIResponse {
  let jsonText = text.trim();

  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  const parsed: unknown = JSON.parse(jsonText);
  return AIResponseSchema.parse(parsed);
}

export async function analyzeDiff(
  prTitle: string,
  files: PRDiff["files"]
): Promise<AIResponse> {
  logger.info({ prTitle, fileCount: files.length }, "Sending diff to OpenAI");

  const userMessage = buildUserMessage(prTitle, files);

  let firstError: unknown;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AIParseError("OpenAI returned no text content");
    }

    return parseResponseText(content);
  } catch (error) {
    firstError = error;
    logger.warn({ error: String(error) }, "First OpenAI attempt failed, retrying");
  }

  try {
    const retryUserMessage = buildRetryUserMessage(prTitle, files);

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: RETRY_SYSTEM_PROMPT },
        { role: "user", content: retryUserMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AIParseError("OpenAI returned no text content on retry");
    }

    return parseResponseText(content);
  } catch (error) {
    logger.error(
      { firstError: String(firstError), retryError: String(error) },
      "Both OpenAI attempts failed"
    );
    throw new AIParseError(
      `Failed to parse OpenAI response after 2 attempts. Last error: ${String(error)}`
    );
  }
}
