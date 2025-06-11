import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const analyticsFile = path.join(process.cwd(), 'analytics.json');

type AnalyticsData = {
  pv: Record<string, number>;
  uv: Record<string, Record<string, Record<string, true>>>;
};

function readAnalytics(): AnalyticsData {
  if (!fs.existsSync(analyticsFile)) {
    return { pv: {}, uv: {} };
  }
  return JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
}

function writeAnalytics(data: AnalyticsData) {
  fs.writeFileSync(analyticsFile, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  const { slug } = await request.json();
  const ip = request.headers.get('x-forwarded-for') || '';
  const today = new Date().toISOString().slice(0, 10);

  const data = readAnalytics();
  if (!data.pv[slug]) data.pv[slug] = 0;
  if (!data.uv[slug]) data.uv[slug] = {};

  data.pv[slug] += 1;
  data.uv[slug][today] = data.uv[slug][today] || {};
  data.uv[slug][today][ip] = true;

  writeAnalytics(data);
  return NextResponse.json({ message: 'ok' });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const data = readAnalytics();
  if (!slug) {
    return NextResponse.json({ pv: data.pv, uv: data.uv });
  }
  const pv = data.pv[slug] || 0;
  const uv = data.uv[slug]
    ? Object.values(data.uv[slug]).reduce((acc: number, ips: Record<string, true>) => acc + Object.keys(ips).length, 0)
    : 0;
  return NextResponse.json({ pv, uv });
} 