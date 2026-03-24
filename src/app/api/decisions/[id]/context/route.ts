import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { context: newContext, rerun = false } = body;

  if (!newContext?.trim()) {
    return NextResponse.json({ error: 'context is required' }, { status: 400 });
  }

  const supabase = createClient();

  // Fetch the decision
  const { data: decision, error: fetchError } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !decision) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  }

  const existingContextUpdates: string[] = decision.context_updates ?? [];
  const updatedContexts = [...existingContextUpdates, newContext.trim()];

  // Update context_updates in Supabase
  const { data: updated, error: updateError } = await supabase
    .from('decisions')
    .update({ context_updates: updatedContexts })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If rerun=true, trigger a new round with the updated context
  if (rerun) {
    const roundRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/decisions/${id}/round`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: newContext.trim() })
      }
    );
    if (roundRes.ok) {
      const roundData = await roundRes.json();
      return NextResponse.json({ success: true, decision: roundData.decision, rerun: true });
    }
  }

  return NextResponse.json({ success: true, decision: updated });
}
