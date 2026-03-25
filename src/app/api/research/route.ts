import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const status = req.nextUrl.searchParams.get("status");
  const tag = req.nextUrl.searchParams.get("tag");

  let query = supabase
    .from("research_library")
    .select("*")
    .order("source_date", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (tag) {
    query = query.contains("topic_tags", [tag]);
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("research_library")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
