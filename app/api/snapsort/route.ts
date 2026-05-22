import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null);
  if (!body || !body.text) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });

  const key = process.env.GEMINI_KEY_SNAPSORT;
  if (!key) return NextResponse.json({ error: 'Snapsort API key not configured' }, { status: 500 });

  // Call Gemini (placeholder) - forward the text to the model
  try {
    const res = await fetch('https://generative.googleapis.com/v1beta2/models/text-bison:generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        // model-specific payload — keep minimal
        prompt: { text: body.text },
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    return NextResponse.json({ result: data });
  } catch (e) {
    return NextResponse.json({ error: 'AI call failed' }, { status: 502 });
  }
}
