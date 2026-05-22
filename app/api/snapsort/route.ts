import { NextResponse } from 'next/server';

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

  const key = process.env.GEMINI_KEY_SNAPSORT;
  if (!key) {
    return NextResponse.json({ error: 'Snapsort API key not configured' }, { status: 500 });
  }

  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: `Extract receipt data and return strict JSON with keys: merchant, transactionDate, currency, total, tax, category, paymentMethod, items, confidence, summary. The items field should be an array of objects with name, quantity, price. If a field is unknown, use null or an empty array. User notes: ${body.text ?? ''}` });

  if (body.imageBase64) {
    parts.push({ inlineData: { mimeType: body.imageMimeType ?? 'image/png', data: body.imageBase64 } });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Gemini request failed' }, { status: response.status });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
    const parsed = text ? extractJson(text) : null;

    return NextResponse.json({
      parsed,
      raw: data,
    });
  } catch {
    return NextResponse.json({ error: 'AI call failed' }, { status: 502 });
  }
}
