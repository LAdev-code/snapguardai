import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../../../lib/geminiClient';

type SnapSortPayload = {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  documentType?: string;
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
  const body = (await req.json().catch(() => null)) as SnapSortPayload | null;
  if (!body || (!body.text && !body.imageBase64)) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const trialMode = body.trialMode === true;
  const authHeader = req.headers.get('authorization');
  if (!authHeader && !trialMode) {
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

  const documentType = body.documentType?.trim() || 'Auto detect';

  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: `You are SnapGuard AI SnapSortAI, a premium receipt and invoice intelligence model specialising in OCR extraction, vendor recognition, business invoices, engineering invoices, and financial categorisation.

Analyse the receipt, business invoice, or engineering invoice below and extract all available transaction data. Be meticulous - read every line, including small print, tax breakdowns, payment terms, PO numbers, project names, and payment method details.

Document type hint from the user: ${documentType}

Key Extraction Guidelines:
1. Merchant / Vendor: Identify the store or vendor name exactly as printed. If ambiguous, infer from context (e.g. "MCD" -> "McDonald's").
2. Transaction Date: Extract in ISO 8601 format (YYYY-MM-DD). If only a partial date is visible, fill missing parts with null.
3. Document Type: Set to receipt, invoice, business_invoice, engineering_invoice, or other when the document clearly matches that type.
4. Invoice Number / PO: Extract invoice number, purchase order number, or reference number when present.
5. Currency: Detect the currency symbol or code (MYR, USD, SGD, etc.). Default to MYR for Malaysian documents.
6. Subtotal / Tax / Total: Parse numeric values. Remove currency symbols and commas. Use null if not visible. For invoices, amountDue may be the final payable amount.
7. Category: Classify into one of: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Groceries, Utilities, Services, Engineering, Business, Other.
8. Payment Method: Detect from footer or terms — Cash, Card, Touch 'n Go, DuitNow QR, FPX, Bank Transfer, or null.
9. Project Name: Extract project, site, or client name when visible, especially for engineering or business invoices.
10. Line Items: Extract each line item as {name, quantity, price}. Quantity defaults to 1 if not shown.
11. Confidence: Score 0-100 indicating how reliable the extraction is. Low confidence when the image is blurry, cropped, or text is partially illegible.
12. Summary: One-sentence financial insight about this purchase or invoice.

User-provided notes for additional context: ${body.text ?? 'None provided'}

Return a strict JSON object with the following keys:
- documentType: string or null
- merchant: string or null
- vendorName: string or null
- invoiceNumber: string or null
- dueDate: string or null
- transactionDate: string (YYYY-MM-DD) or null
- currency: string or null
- subtotal: number or null
- total: number or null
- amountDue: number or null
- tax: number or null
- category: string or null
- paymentMethod: string or null
- projectName: string or null
- purchaseOrderNumber: string or null
- items: array of {name: string, quantity: number, price: number} or empty array
- confidence: number (0–100) or null
- summary: string or null
` });

  if (body.imageBase64) {
    parts.push({ inlineData: { mimeType: body.imageMimeType ?? 'image/png', data: body.imageBase64 } });
  }

  try {
    const { response, bodyText } = await callGemini({
      apiKeys: [
        key,
        process.env.GEMINI_KEY_SCAMSHIELD ?? '',
        process.env.GEMINI_KEY_MONEYCOACH ?? '',
      ],
      model: 'gemini-2.5-flash',
      parts,
      temperature: 0.2,
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      const status = response.status;
      console.error('[snapsort] Gemini request failed', {
        status,
        retryAfter: retryAfter ?? null,
        detail: bodyText.slice(0, 1000),
      });

      const payload = {
        error: status === 429 ? 'Rate limited by upstream AI provider' : 'Gemini request failed',
        status,
        detail: bodyText.slice(0, 1000),
        retryAfter: retryAfter ?? undefined,
      } as any;
      const headers: Record<string, string> = {};
      if (retryAfter) headers['Retry-After'] = retryAfter;
      return NextResponse.json(payload, { status, headers });
    }

    const data = JSON.parse(bodyText || '{}');
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
    const parsed = text ? extractJson(text) : null;
    return NextResponse.json({ parsed, raw: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'AI call failed', detail: message }, { status: 502 });
  }
}
