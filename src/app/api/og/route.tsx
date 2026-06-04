import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.slice(0, 80) ?? 'نیاز فایندر';
  const subtitle =
    searchParams.get('subtitle')?.slice(0, 120) ??
    'پلتفرم هوشمند اتصال نیاز به کسب‌وکار';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          background: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.9, marginBottom: 16 }}>needfinder.ir</div>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 26, marginTop: 24, opacity: 0.92, maxWidth: 900 }}>{subtitle}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
