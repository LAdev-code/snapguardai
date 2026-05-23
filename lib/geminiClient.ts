type GeminiPart = Record<string, unknown>;

type GeminiRequestOptions = {
  apiKeys: string[];
  model: string;
  parts: GeminiPart[];
  temperature?: number;
  maxAttempts?: number;
  timeoutMs?: number;
};

export type GeminiResponse = {
  response: Response;
  bodyText: string;
};

export async function callGemini({
  apiKeys,
  model,
  parts,
  temperature = 0.2,
  maxAttempts = 3,
  timeoutMs = 25000,
}: GeminiRequestOptions): Promise<GeminiResponse> {
  const uniqueKeys = Array.from(new Set(apiKeys.map((value) => value.trim()).filter(Boolean)));

  if (uniqueKeys.length === 0) {
    throw new Error('No Gemini API keys provided');
  }

  let lastResponse: Response | null = null;
  let lastBodyText = '';

  for (const apiKey of uniqueKeys) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        lastResponse = response;
        lastBodyText = await response.text().catch(() => '');

        if (response.ok) {
          return { response, bodyText: lastBodyText };
        }

        if (response.status === 429 || response.status === 401 || response.status === 403) {
          break;
        }

        if (response.status >= 500 && attempt < maxAttempts) {
          const backoff = 500 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        break;
      } catch (error) {
        clearTimeout(timeout);

        if (attempt >= maxAttempts) {
          if (lastResponse) {
            break;
          }

          throw error instanceof Error ? error : new Error(String(error));
        }

        const backoff = 500 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  if (lastResponse) {
    return { response: lastResponse, bodyText: lastBodyText };
  }

  throw new Error('AI call failed');
}