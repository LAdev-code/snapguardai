import { ImageResponse } from 'next/og';

async function getLogoDataUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'http://localhost:3000';
  const response = await fetch(new URL('/logo.png', baseUrl));
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return `data:image/png;base64,${btoa(binary)}`;
}

export default async function Icon() {
  const logoDataUrl = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08101b',
        }}
      >
        <img
          src={logoDataUrl}
          alt="SnapGuard AI"
          width={256}
          height={256}
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
        />
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
