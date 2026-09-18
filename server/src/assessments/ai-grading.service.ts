// FILE PATH: server/src/assessments/ai-grading.service.ts
//
// AI-assisted practical grading (requirement #7B). Provider-agnostic: talks
// to any OpenAI-compatible /chat/completions endpoint over plain fetch, so
// swapping providers is an env-var change, never a code change.
//
//   AI_GRADING_PROVIDER    label only, used in stored results (default: "groq")
//   AI_GRADING_API_KEY     required — server-side only, NEVER sent to the frontend
//   AI_GRADING_BASE_URL    default: https://api.groq.com/openai/v1 (Groq's
//                          currently-free developer tier — see
//                          https://console.groq.com; swap to any other
//                          OpenAI-compatible provider, e.g. OpenRouter,
//                          Together AI, or a local Ollama server, by
//                          changing this + the model name, not this file)
//   AI_GRADING_MODEL       default: llama-3.3-70b-versatile
//
// If AI_GRADING_API_KEY is unset, evaluate() returns a clearly-flagged
// "unavailable" result instead of a fabricated score — deterministic
// test-case results (see CodeRunnerService) remain valid and are never
// blocked by this. Never claims a provider is "permanently free"; document
// whatever the provider's terms currently are when configuring this in a
// real deployment.

import { Injectable, Logger } from '@nestjs/common';

export interface AiEvaluationResult {
  available: boolean;
  score: number | null;
  strengths: string[];
  issues: string[];
  feedback: string;
  provider?: string;
  model?: string;
  error?: string;
}

export interface AiEvaluationInput {
  questionTitle: string;
  instructions: string;
  language: string;
  studentCode: string;
  deterministicSummary?: string; // e.g. "3/5 test cases passed" — extra grounding context
}

@Injectable()
export class AiGradingService {
  private readonly logger = new Logger(AiGradingService.name);
  private readonly provider = process.env.AI_GRADING_PROVIDER || 'groq';
  private readonly apiKey = process.env.AI_GRADING_API_KEY || '';
  private readonly baseUrl = process.env.AI_GRADING_BASE_URL || 'https://api.groq.com/openai/v1';
  private readonly model = process.env.AI_GRADING_MODEL || 'llama-3.3-70b-versatile';

  async evaluate(input: AiEvaluationInput): Promise<AiEvaluationResult> {
    if (!this.apiKey) {
      return {
        available: false,
        score: null,
        strengths: [],
        issues: [],
        feedback:
          'AI-assisted feedback is not configured on this server (AI_GRADING_API_KEY unset). ' +
          'Deterministic test-case results, if any, are unaffected.',
        error: 'not_configured',
      };
    }

    const systemPrompt =
      'You are a strict but fair programming instructor grading a student submission for a coding school. ' +
      'Respond with ONLY a JSON object: {"score": <0-100 integer>, "strengths": [<short strings>], ' +
      '"issues": [<short strings>], "feedback": "<2-4 sentences, encouraging but honest>"}. ' +
      'No prose outside the JSON.';

    const userPrompt = [
      `Question: ${input.questionTitle}`,
      `Instructions: ${input.instructions}`,
      `Language: ${input.language}`,
      input.deterministicSummary ? `Automated test results: ${input.deterministicSummary}` : null,
      '--- Student submission ---',
      input.studentCode,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`AI provider returned ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI provider returned no content');
      const parsed = JSON.parse(content);

      const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
      return {
        available: true,
        score,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8).map(String) : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 8).map(String) : [],
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        provider: this.provider,
        model: this.model,
      };
    } catch (err) {
      this.logger.warn(`AI grading call failed: ${(err as Error).message}`);
      return {
        available: false,
        score: null,
        strengths: [],
        issues: [],
        feedback: 'AI feedback is temporarily unavailable. Deterministic test-case results, if any, are unaffected.',
        error: (err as Error).message,
      };
    }
  }
}
