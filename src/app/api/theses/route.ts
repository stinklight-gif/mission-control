import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const verdict = searchParams.get("verdict");
  const ticker = searchParams.get("ticker");
  const category = searchParams.get("category");

  const supabase = createClient();
  let query = supabase
    .from("trade_theses")
    .select("*")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (verdict) query = query.eq("verdict", verdict);
  if (ticker) query = query.eq("ticker", ticker);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    ticker, title, rating, thesis, sizing, category, status, catalyst,
    catalyst_date, interacts_with, verdict, phase, source, raw_text
  } = body;

  if (!ticker || !title || !thesis) {
    return NextResponse.json({ error: "ticker, title, and thesis are required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("trade_theses")
    .insert([{
      ticker, title, rating, thesis, sizing,
      category: category ?? "directional",
      status: status ?? "watchlist",
      catalyst, catalyst_date: catalyst_date || null,
      interacts_with: interacts_with ?? [],
      verdict: verdict ?? "add",
      phase, source: source ?? "LLM Analysis", raw_text
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, entry_price, current_pnl } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (entry_price !== undefined) updates.entry_price = entry_price;
  if (current_pnl !== undefined) updates.current_pnl = current_pnl;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("trade_theses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
