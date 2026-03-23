import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ─── GET: Fetch all decisions ─────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ─── POST: Run decision council ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    question,
    context = "",
    type = "strategy",
    reversibility = "moderate",
    pressure = "no_rush"
  } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  // Escape args for shell
  const escape = (s: string) => `'${String(s).replace(/'/g, "'\\''")}'`;

  const script = `${process.env.HOME}/clawd/agents/decision-council/decision-council.mjs`;
  const cmd = [
    "node",
    escape(script),
    escape(question),
    "--context", escape(context),
    "--type", escape(type),
    "--reversibility", escape(reversibility),
    "--pressure", escape(pressure)
  ].join(" ");

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 5 * 60 * 1000, // 5 minute timeout
      env: {
        ...process.env,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

    // Parse report for key fields
    const report = stdout.trim();
    const verdictMatch = report.match(/\*\*Verdict:\*\*\s*(.+)/);
    const verdict = verdictMatch ? verdictMatch[1].trim() : "Unknown";

    // Fetch the newly created record from Supabase
    const supabase = createClient();
    const { data } = await supabase
      .from("decisions")
      .select("*")
      .eq("question", question)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      report,
      verdict,
      decision: data ?? null,
      stderr: stderr ? stderr.slice(0, 1000) : undefined
    });
  } catch (err: unknown) {
    const error = err as Error & { stdout?: string; stderr?: string };
    return NextResponse.json({
      error: "Council failed",
      details: error.message,
      stdout: error.stdout?.slice(0, 2000),
      stderr: error.stderr?.slice(0, 1000)
    }, { status: 500 });
  }
}

// ─── PATCH: Update outcome ────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, outcome, outcome_notes } = body;

  if (!id || !outcome) {
    return NextResponse.json({ error: "id and outcome are required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisions")
    .update({
      outcome,
      outcome_notes: outcome_notes ?? null,
      resolved_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
