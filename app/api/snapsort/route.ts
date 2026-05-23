import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SnapSortPayload = {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SnapSortPayload | null;
  if (!body || (!body.text && !body.imageBase64)) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.GEMINI_KEY_SNAPSORT;
  if (!key) {
    return NextResponse.json({ error: 'Snapsort API key not configured' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: `You are SnapGuard AI SnapSortAI, a premium receipt intelligence model specialising in OCR extraction, merchant recognition, and financial categorisation.

Analyse the receipt image or text below and extract all available transaction data. Be meticulous — read every line, including small print, tax breakdowns, and payment method details.

Key Extraction Guidelines:
1. Merchant: Identify the store/business name exactly as printed. If ambiguous, infer from context (e.g. "MCD" → "McDonald's").
2. Transaction Date: Extract in ISO 8601 format (YYYY-MM-DD). If only a partial date is visible, fill missing parts with null.
3. Currency: Detect the currency symbol or code (MYR, USD, SGD, etc.). Default to MYR for Malaysian receipts.
4. Total & Tax: Parse numeric values. Remove currency symbols and commas. Use null if not visible.
5. Category: Classify into one of: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Groceries, Utilities, Other.
6. Payment Method: Detect from receipt footer — Cash, Card, Touch 'n Go, DuitNow QR, FPX, or null.
7. Line Items: Extract each item row as {name, quantity, price}. Quantity defaults to 1 if not shown.
8. Confidence: Score 0–100 indicating how reliable the extraction is. Low confidence when image is blurry, cropped, or text is partially illegible.
9. Summary: One-sentence financial insight about this purchase (e.g. "Weekly grocery run at AEON — largest expense this week in Groceries.").

User-provided notes for additional context: ${body.text ?? 'None provided'}

Return a strict JSON object with the following keys:
- merchant: string or null
- transactionDate: string (YYYY-MM-DD) or null
- currency: string or null
- total: number or null
- tax: number or null
- category: string or null
- paymentMethod: string or null
- items: array of {name: string, quantity: number, price: number} or empty array
- confidence: number (0–100) or null
- summary: string or null
` });

  if (body.imageBase64) {
    parts.push({ inlineData: { mimeType: body.imageMimeType ?? 'image/png', data: body.imageBase64 } });
  }

  try {
    // Retry logic for rate limits / transient errors
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    const maxAttempts = 3;
    let attempt = 0;
    let lastResp: Response | null = null;
    let lastBodyText = '';

    while (attempt < maxAttempts) {
      attempt += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.2 },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        lastResp = resp;
        lastBodyText = await resp.text().catch(() => '');

        if (resp.ok) {
          const data = JSON.parse(lastBodyText || '{}');
          const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
          const parsed = text ? extractJson(text) : null;
          return NextResponse.json({ parsed, raw: data });
        }

        // If rate limited, surface Retry-After and avoid immediate retry unless helpful
        if (resp.status === 429) {
          const retryAfter = resp.headers.get('Retry-After');
          const payload = {
            error: 'Rate limited by upstream AI provider',
            status: 429,
            detail: lastBodyText.slice(0, 1000),
            retryAfter: retryAfter ?? undefined,
          } as any;
          const headers: Record<string, string> = {};
          if (retryAfter) headers['Retry-After'] = retryAfter;
          return NextResponse.json(payload, { status: 429, headers });
        }

        // For other 5xx errors, try again with exponential backoff
        if (resp.status >= 500 && attempt < maxAttempts) {
          const backoff = 500 * Math.pow(2, attempt - 1);
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }

        // Non-retriable error: return the upstream response body and status
        return NextResponse.json({ error: 'Gemini request failed', status: resp.status, detail: lastBodyText.slice(0, 1000) }, { status: resp.status });
      } catch (fetchErr) {
        clearTimeout(timeout);
        // Abort or network error; retry unless we've exhausted attempts
        if (attempt >= maxAttempts) {
          const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          return NextResponse.json({ error: 'AI call failed', detail: message }, { status: 502 });
        }
        const backoff = 500 * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }
    }

    // If we exit loop without success, return last known response or generic error
    if (lastResp) {
      return NextResponse.json({ error: 'AI provider error', status: lastResp.status, detail: lastBodyText.slice(0, 1000) }, { status: lastResp.status });
    }

    return NextResponse.json({ error: 'AI call failed' }, { status: 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'AI call failed', detail: message }, { status: 502 });
  }
}
