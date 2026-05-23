import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../../../lib/geminiClient';

type ScamShieldPayload = {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  trialMode?: boolean;
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
  const body = (await req.json().catch(() => null)) as ScamShieldPayload | null;
  if (!body || (!body.text && !body.imageBase64)) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const trialMode = body.trialMode === true;
  const authHeader = req.headers.get('authorization');
  if (!authHeader && !trialMode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.GEMINI_KEY_SCAMSHIELD;
  if (!key) {
    return NextResponse.json({ error: 'ScamShield API key not configured' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
  }

  if (authHeader) {
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
  }

  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: `You are SnapGuard AI ScamShield, a premium financial security intelligence model.
Analyze the message text or payment proof image below for scam indicators, fraudulent patterns, or visual forgery tells.

Key Areas of Analysis:
1. SMS/WhatsApp/Email Text Phishing: Check for high-pressure tactics, artificial urgency, threats of account suspension, suspicious/mismatched links, bank impersonation, fake lucky draws, or requests for OTP/personal info.
2. Fake Payment Proof/Screenshots: Carefully check the provided image for tells of image manipulation, incorrect or mismatched font sizes/types, unnatural text alignment, fake transaction status badges, suspicious transaction reference formats, or altered receipt layouts.

Analyze the input and return a strict, valid JSON object with the following keys:
- riskScore: integer between 0 and 100.
- riskLevel: "low", "medium", "high", or "critical".
- verdict: A short, high-level, clear safety verdict (e.g., "Mismatched font layouts suggest payment screenshot alteration").
- summary: A detailed, human-friendly explanation of why it is flagged or safe.
- reasons: An array of strings explaining specific indicators found.
- recommendedAction: What concrete action the user should take immediately.
- redFlags: An array of strings listing specific suspicious signals (e.g., "Urgent tone detected", "Mismatched logo fonts").

Input text: ${body.text ?? 'None provided'}
` });

  if (body.imageBase64) {
    parts.push({ inlineData: { mimeType: body.imageMimeType ?? 'image/png', data: body.imageBase64 } });
  }

  try {
    const { response, bodyText } = await callGemini({
      apiKeys: [
        key,
        process.env.GEMINI_KEY_SNAPSORT ?? '',
        process.env.GEMINI_KEY_MONEYCOACH ?? '',
      ],
      model: 'gemini-2.5-flash',
      parts,
      temperature: 0,
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      console.error('[scamshield] Gemini request failed', {
        status: response.status,
        retryAfter: retryAfter ?? null,
        detail: bodyText.slice(0, 1000),
      });

      return NextResponse.json({
        error: response.status === 429 ? 'Rate limited by upstream AI provider' : 'Gemini request failed',
        status: response.status,
        detail: bodyText.slice(0, 500),
        retryAfter: retryAfter ?? undefined,
      }, { status: response.status, headers: retryAfter ? { 'Retry-After': retryAfter } : undefined });
    }

    const data = JSON.parse(bodyText || '{}');
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
