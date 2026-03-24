import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const maxDuration = 120;

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const KIMI_KEY   = process.env.KIMI_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const SEAT_MAP: Record<string, { name: string; emoji: string; provider: 'gemini' | 'openai' | 'kimi'; modelName: string }> = {
  devils_advocate: { name: "Devil's Advocate", emoji: '🔴', provider: 'gemini', modelName: 'Gemini 3.1 Pro' },
  opportunist:     { name: 'Opportunist',      emoji: '🟢', provider: 'openai', modelName: 'GPT-5.4' },
  operator:        { name: 'Operator',         emoji: '🔵', provider: 'kimi',   modelName: 'Kimi moonshot-v1-32k' },
  historian:       { name: 'Historian',        emoji: '🟡', provider: 'gemini', modelName: 'Gemini 3.1 Pro' },
  second_order:    { name: 'Second-Order Thinker', emoji: '🟣', provider: 'kimi', modelName: 'Kimi moonshot-v1-32k' },
};

const BRIEF_FRAMEWORKS: Record<string, string> = {
  devils_advocate: `# 🔴 Devil's Advocate\nYou find risks others miss. Use pre-mortem, inversion, and via negativa. Be direct, specific, uncomfortable.`,
  opportunist: `# 🟢 Opportunist\nYou find asymmetric upside. Use EV calculation, asymmetric bets, regret minimization. Be energetic and numbers-driven.`,
  operator: `# 🔵 Operator\nYou assess execution feasibility. Use theory of constraints, execution risk checklist, RICE. Be practical and sequenced.`,
  historian: `# 🟡 Historian\nYou find historical precedents. Use reference class forecasting, pattern matching, survivorship bias. Be evidence-based.`,
  second_order: `# 🟣 Second-Order Thinker\nYou trace consequences 3-4 levels deep. Use "and then what?", Chesterton's fence, incentive analysis. Think in systems.`,
};

function followUpPrompt(framework: string, question: string, previousResponse: string, followUpQ: string): string {
  return `${framework}

---

You previously analyzed this decision: "${question}"

Your response was:
${previousResponse}

---

The decision-maker asks you specifically:
"${followUpQ}"

Respond directly. If your position has changed, end with updated Score: X/10`;
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 2048 } }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join('');
}

async function callKimi(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KIMI_KEY}` },
    body: JSON.stringify({
      model: 'moonshot-v1-32k',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 1500,
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`Kimi error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-5.4',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 2000
    })
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { seat: seatId, question: followUpQ } = body;

  if (!seatId || !followUpQ) {
    return NextResponse.json({ error: 'seat and question are required' }, { status: 400 });
  }

  const seatInfo = SEAT_MAP[seatId];
  if (!seatInfo) {
    return NextResponse.json({ error: `Unknown seat: ${seatId}` }, { status: 400 });
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

  // Get this seat's most recent response
  const rounds: Array<Array<{ seatId: string; response: string; score: number }>> = decision.rounds ?? [];
  let previousResponse = '';

  if (rounds.length > 0) {
    const lastRound = rounds[rounds.length - 1];
    const seatResp = lastRound.find(r => r.seatId === seatId);
    previousResponse = seatResp?.response ?? '';
  }

  if (!previousResponse) {
    // Fall back to initial responses
    const rawResponses = decision.responses ?? {};
    const raw = rawResponses[seatId];
    previousResponse = typeof raw === 'string' ? raw : (raw?.response ?? '(no prior response)');
  }

  const framework = BRIEF_FRAMEWORKS[seatId] ?? '';
  const prompt = followUpPrompt(framework, decision.question, previousResponse, followUpQ);

  let responseText = '';
  try {
    if (seatInfo.provider === 'gemini') {
      responseText = await callGemini(prompt);
    } else if (seatInfo.provider === 'openai') {
      responseText = await callOpenAI(prompt);
    } else if (seatInfo.provider === 'kimi') {
      responseText = await callKimi(framework, prompt.replace(framework, '').trim());
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    responseText = `(error: ${msg.slice(0, 200)})`;
  }

  const followUpEntry = {
    seatId,
    seatName: seatInfo.name,
    seatEmoji: seatInfo.emoji,
    question: followUpQ,
    response: responseText.trim() || '(no response)',
    timestamp: new Date().toISOString(),
  };

  // Append to follow_ups array
  const existingFollowUps: Array<Record<string, unknown>> = decision.follow_ups ?? [];
  const updatedFollowUps = [...existingFollowUps, followUpEntry];

  const { data: updated, error: updateError } = await supabase
    .from('decisions')
    .update({ follow_ups: updatedFollowUps })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, followUp: followUpEntry, decision: updated });
}
