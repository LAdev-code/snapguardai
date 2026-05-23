import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

async function getLogoDataUrl() {
  const logoPath = join(process.cwd(), 'public', 'logo.png');
  const fileBuffer = await readFile(logoPath);
  return `data:image/png;base64,${Buffer.from(fileBuffer).toString('base64')}`;
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
