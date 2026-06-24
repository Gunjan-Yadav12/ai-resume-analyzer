import { jsonrepair } from 'jsonrepair';

const GEMINI_MODELS = ['gemini-2.0-flash'] as const;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

type GeminiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldRetry(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  throw new Error('Gemini did not return a JSON object.');
}

function normalizeAndRepairJson(text: string): string {
  const extracted = extractJsonCandidate(text);

  try {
    JSON.parse(extracted);
    return extracted;
  } catch {
    const repaired = jsonrepair(extracted);
    JSON.parse(repaired);
    return repaired;
  }
}

async function callGemini({
  model,
  apiKey,
  prompt,
}: {
  model: string;
  apiKey: string;
  prompt: string;
}): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as GeminiErrorBody;
    const message = errorBody?.error?.message || `Gemini API error ${response.status}`;

    const error = new Error(message) as Error & {
      status?: number;
      body?: GeminiErrorBody;
    };

    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== 'string') {
    console.error('Unexpected Gemini response:', data);
    throw new Error('Gemini returned an empty or invalid response.');
  }

  return text;
}

export async function analyzeResume(
  resumeText: string,
  instructions: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  console.log('Gemini key loaded:', apiKey?.slice(0, 8));

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing from your .env file');
  }

  const prompt = `${instructions}\n\nResume content to analyze:\n${resumeText}`;

  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const rawText = await callGemini({
          model,
          apiKey,
          prompt,
        });

        const repairedJson = normalizeAndRepairJson(rawText);
        JSON.parse(repairedJson);
        return repairedJson;
      } catch (err) {
        lastError = err;

        const status =
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status?: number }).status === 'number'
            ? (err as { status?: number }).status
            : undefined;

        const message = err instanceof Error ? err.message : String(err);

        console.warn(
          `Gemini failed | model=${model} | attempt=${attempt} | status=${status ?? 'unknown'} | ${message}`
        );

        if (status && shouldRetry(status) && attempt < 2) {
          await sleep(1000 * attempt);
          continue;
        }

        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Resume analysis failed after retries. ${lastError.message}`);
  }

  throw new Error('Resume analysis failed.');
}