import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

async function fetchYahooPrice(ticker: string) {
  try {
    const cleanTicker = ticker.replace(".AX", ".AX"); // keep ASX tickers as-is
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanTicker)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MissionControl/1.0)"
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    return {
      price: meta?.regularMarketPrice ?? null,
      company_name: meta?.shortName ?? meta?.longName ?? null,
      market_cap: meta?.marketCap
        ? formatMarketCap(meta.marketCap)
        : null,
      sector: null // Yahoo v8 doesn't include sector in chart endpoint
    };
  } catch {
    return null;
  }
}

function formatMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

function extractTicker(text: string): string | null {
  const match = text.match(/\$([A-Z][A-Z0-9.\-]{0,9})/);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);

  const ticker = searchParams.get("ticker");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let query = supabase
    .from("stock_signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ticker) query = query.ilike("ticker", ticker);
  if (source) query = query.ilike("source", source);
  if (search) query = query.ilike("raw_text", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  let body: {
    text?: string;
    ticker?: string;
    source?: string;
    category?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const ticker = body.ticker?.toUpperCase() ?? extractTicker(text);
  if (!ticker) {
    return NextResponse.json(
      { error: "Could not extract ticker. Use $TICKER in text or provide ticker field." },
      { status: 400 }
    );
  }

  const yahooData = await fetchYahooPrice(ticker);

  const record = {
    ticker: ticker.toUpperCase(),
    raw_text: text,
    source: body.source ?? "manual",
    category: body.category ?? "thesis",
    price_at_post: yahooData?.price ?? null,
    company_name: yahooData?.company_name ?? null,
    market_cap: yahooData?.market_cap ?? null,
    sector: yahooData?.sector ?? null
  };

  const { data, error } = await supabase
    .from("stock_signals")
    .insert(record)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
