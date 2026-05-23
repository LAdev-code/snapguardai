# SnapGuard AI

A financial intelligence and scam protection web app built with Next.js 16, Supabase, and Google Gemini 2.5 Flash.

## Features

- **SnapSortAI** — Upload receipts or invoices (PNG, JPG, PDF). Client-side OCR extracts text, Gemini parses it into structured data (merchant, totals, line items, category). Results auto-save to Supabase.
- **ScamShield** — Paste suspicious messages or upload payment proof screenshots. OCR extracts text, Gemini analyses for phishing, fraud indicators, and visual forgery. Returns risk score, verdict, red flags, and recommended actions. Includes voice/TTS readout, community threat intel, and sound alerts.
- **Money Coach** — Financial health dashboard that pulls real data from your SnapSort scans. Tracks expenses, income, savings rate, and category breakdown. AI-powered suggestions for savings goals and financial improvement.
- **Dashboard** — Central hub showing monthly spending, health score, and quick links to all features.
- **Public Trial** — Try SnapSortAI and ScamShield without signing in (`?trial=1`). Limited to 1 scan, then prompts sign-up.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (Turbopack), React, TypeScript, Tailwind CSS |
| AI Engine | Google Gemini 2.5 Flash (text-only) via `lib/geminiClient.ts` |
| Image Processing | Tesseract.js (client-side OCR), pdfjs-dist (PDF rendering) |
| Backend | Next.js API routes (`/api/snapsort`, `/api/scamshield`, `/api/moneycoach`) |
| Database | Supabase (PostgreSQL) — tables: `receipts_data`, `scam_reports`, `financial_health` |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_KEY_SNAPSORT=
GEMINI_KEY_SCAMSHIELD=
GEMINI_KEY_MONEYCOACH=
```

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
