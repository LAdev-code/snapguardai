const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeUrl(value: string): string {
  const withProtocol = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  return withProtocol.replace(/\/$/, "");
}

export function getBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!candidate) {
    return FALLBACK_SITE_URL;
  }

  try {
    return normalizeUrl(new URL(normalizeUrl(candidate)).toString());
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getMetadataBase(): URL {
  return new URL(getBaseUrl());
}
