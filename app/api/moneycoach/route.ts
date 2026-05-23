import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../../../lib/geminiClient';

type RawMoneyCoachSuggestion = string | { tip?: unknown; details?: unknown; [key: string]: unknown };

function stringifySuggestion(item: RawMoneyCoachSuggestion): string {
  if (typeof item === 'string') return item;

  const tip = typeof item.tip === 'string' ? item.tip.trim() : '';
  const details = typeof item.details === 'string' ? item.details.trim() : '';

  if (tip && details) return `${tip}: ${details}`;
  if (tip) return tip;
  if (details) return details;

  return JSON.stringify(item);
}

function normalizeMoneyCoachParsed(parsed: unknown) {
  const source = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
  const suggestions = Array.isArray(source.suggestions)
    ? source.suggestions.map((item) => stringifySuggestion(item as RawMoneyCoachSuggestion))
    : [];

  return {
    summary: typeof source.summary === 'string' ? source.summary : '',
    suggestions,
    goalFeasibility: typeof source.goalFeasibility === 'string' ? source.goalFeasibility : 'needs_adjustment',
    adjustedGoal: typeof source.adjustedGoal === 'number' ? source.adjustedGoal : null,
    riskNote: typeof source.riskNote === 'string' ? source.riskNote : '',
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    income?: number;
    expenses?: number;
    savingsGoal?: number;
    topCategory?: string;
  } | null;

  if (!body || body.income == null || body.expenses == null || body.savingsGoal == null) {
    return NextResponse.json({ error: 'Missing required fields: income, expenses, savingsGoal' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.GEMINI_KEY_MONEYCOACH;
  if (!key) {
    return NextResponse.json({ error: 'MoneyCoach API key not configured' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { income, expenses, savingsGoal, topCategory } = body;
  const savingsRate = Math.max(0, Math.round(((income - expenses) / income) * 100));
  const monthlySurplus = Math.max(0, income - expenses);

  try {
    const { response, bodyText } = await callGemini({
      apiKeys: [
        key,
        process.env.GEMINI_KEY_SNAPSORT ?? '',
        process.env.GEMINI_KEY_SCAMSHIELD ?? '',
      ],
      model: 'gemini-2.5-flash',
      parts: [{
        text: `You are SnapGuard AI MoneyCoach, a personal financial advisor for Malaysian users.

User's Financial Profile:
- Monthly Income: RM${income.toLocaleString()}
- Monthly Expenses: RM${expenses.toLocaleString()}
- Top Spending Category: ${topCategory || 'Unknown'}
- Current Savings Rate: ${savingsRate}%
- Monthly Surplus: RM${monthlySurplus.toLocaleString()}
- Monthly Savings Goal: RM${savingsGoal.toLocaleString()}

Provide personalised financial advice in JSON format with these keys:
- summary: A one-sentence overview of their financial health.
- suggestions: An array of 3-5 actionable, specific suggestions in Malaysian context (mention MYR amounts, local banks if relevant, e.g. ASNB, Tabung Haji, EPF).
- goalFeasibility: "on_track", "needs_adjustment", or "unrealistic" based on whether the savings goal is achievable.
- adjustedGoal: A suggested realistic monthly savings goal in RM if the current goal needs adjustment (number or null).
- riskNote: A short note about any financial risk patterns detected (e.g. spending exceeds income, too much on one category).

Return ONLY valid JSON, no markdown formatting.`,
      }],
      temperature: 0.3,
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      return NextResponse.json({
        error: response.status === 429 ? 'Rate limited by upstream AI provider' : 'Gemini request failed',
        status: response.status,
        detail: bodyText.slice(0, 500),
        retryAfter: retryAfter ?? undefined,
      }, { status: response.status, headers: retryAfter ? { 'Retry-After': retryAfter } : undefined });
    }

    const data = JSON.parse(bodyText || '{}');
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
    const parsed = text ? normalizeMoneyCoachParsed(JSON.parse(text)) : null;

    return NextResponse.json({ parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'AI call failed', detail: message }, { status: 502 });
  }
}
