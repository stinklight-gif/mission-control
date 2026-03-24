import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const maxDuration = 120;

// ─── Seat Definitions ──────────────────────────────────────────────────────────
const SEATS = [
  { id: 'devils_advocate', name: "Devil's Advocate", emoji: '🔴', provider: 'gemini' as const, modelName: 'Gemini 3.1 Pro' },
  { id: 'opportunist',     name: 'Opportunist',      emoji: '🟢', provider: 'openai' as const, modelName: 'GPT-5.4' },
  { id: 'operator',        name: 'Operator',         emoji: '🔵', provider: 'kimi' as const,   modelName: 'Kimi moonshot-v1-32k' },
  { id: 'historian',       name: 'Historian',        emoji: '🟡', provider: 'gemini' as const, modelName: 'Gemini 3.1 Pro' },
  { id: 'second_order',    name: 'Second-Order Thinker', emoji: '🟣', provider: 'kimi' as const, modelName: 'Kimi moonshot-v1-32k' },
];

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const KIMI_KEY   = process.env.KIMI_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractScore(text: string): number {
  const match = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? parseFloat(match[1]) : 5;
}

const round2Prompt = (
  framework: string,
  question: string,
  context: string,
  additionalContexts: string[],
  previousResponses: Array<{ seatId: string; emoji: string; name: string; modelName: string; score: number; response: string }>,
  currentSeatId: string
) => `${framework}

---

## Decision Under Review
**Question:** ${question}
**Context:** ${context}
${additionalContexts.length ? '**Additional Context:**\n' + additionalContexts.join('\n') : ''}

---

## Previous Round Responses

${previousResponses.filter(r => r.seatId !== currentSeatId).map(r =>
  `### ${r.emoji} ${r.name} — ${r.modelName} (${r.score}/10)\n${r.response}`
).join('\n\n')}

---

You've now seen what the other seats said. Respond:
- Where do you agree?
- Where do you disagree?
- Has any information changed your position?
- What's your UPDATED score?

Be specific. End with: Score: X/10
`;

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

// Framework stubs (brief versions for round 2+ — full frameworks are in the initial route)
const BRIEF_FRAMEWORKS: Record<string, string> = {
  devils_advocate: `# 🔴 Devil's Advocate\nYou find risks others miss. Use pre-mortem, inversion, and via negativa. Be direct, specific, uncomfortable.`,
  opportunist: `# 🟢 Opportunist\nYou find asymmetric upside. Use EV calculation, asymmetric bets, regret minimization. Be energetic and numbers-driven.`,
  operator: `# 🔵 Operator\nYou assess execution feasibility. Use theory of constraints, execution risk checklist, RICE. Be practical and sequenced.`,
  historian: `# 🟡 Historian\nYou find historical precedents. Use reference class forecasting, pattern matching, survivorship bias. Be evidence-based.`,
  second_order: `# 🟣 Second-Order Thinker\nYou trace consequences 3-4 levels deep. Use "and then what?", Chesterton's fence, incentive analysis. Think in systems.`,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const additionalContext: string = body.context ?? '';

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

  const question: string = decision.question;
  const context: string = decision.context ?? '';
  const existingRounds: Array<Array<{ seatId: string; name: string; emoji: string; modelName: string; score: number; response: string }>> = decision.rounds ?? [];
  const existingContextUpdates: string[] = decision.context_updates ?? [];

  // Build context list (existing + new)
  const allContexts = additionalContext
    ? [...existingContextUpdates, additionalContext]
    : existingContextUpdates;

  // Get previous round responses (last round)
  let previousResponses: Array<{ seatId: string; name: string; emoji: string; modelName: string; score: number; response: string }> = [];

  if (existingRounds.length > 0) {
    previousResponses = existingRounds[existingRounds.length - 1];
  } else {
    // First round stored in responses field
    const rawResponses = decision.responses ?? {};
    previousResponses = SEATS.map(seat => {
      const raw = rawResponses[seat.id];
      const responseText = typeof raw === 'string' ? raw : (raw?.response ?? '');
      const score = typeof raw === 'object' && raw?.score != null ? raw.score : extractScore(responseText);
      return { seatId: seat.id, name: seat.name, emoji: seat.emoji, modelName: seat.modelName, score, response: responseText };
    }).filter(r => r.response && r.response !== '(no response)');
  }

  // Run new round for all seats
  const newRoundResponses: Array<{ seatId: string; name: string; emoji: string; modelName: string; score: number; response: string }> = [];

  for (let i = 0; i < SEATS.length; i++) {
    const seat = SEATS[i];
    if (i > 0) await sleep(2000);

    const framework = BRIEF_FRAMEWORKS[seat.id] ?? '';
    const prompt = round2Prompt(framework, question, context, allContexts, previousResponses, seat.id);

    let text = '';
    try {
      if (seat.provider === 'gemini') {
        text = await callGemini(prompt);
      } else if (seat.provider === 'openai') {
        text = await callOpenAI(prompt);
      } else if (seat.provider === 'kimi') {
        text = await callKimi(framework, prompt.replace(framework, '').trim());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      text = `(error: ${msg.slice(0, 200)})`;
    }

    const score = extractScore(text || '');
    newRoundResponses.push({ seatId: seat.id, name: seat.name, emoji: seat.emoji, modelName: seat.modelName, score, response: text.trim() || '(no response)' });
  }

  // Append to rounds array
  const updatedRounds = [...existingRounds, newRoundResponses];

  // Compute new synthesis
  const scores = newRoundResponses.map(r => r.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const yesVotes = scores.filter(s => s > 5).length;
  const noVotes = scores.length - yesVotes;
  const voteSplit = `${yesVotes}-${noVotes} ${yesVotes > noVotes ? 'YES' : 'NO'}`;

  // Update Supabase
  const updatePayload: Record<string, unknown> = {
    rounds: updatedRounds,
    vote_split: voteSplit,
    avg_score: parseFloat(avg.toFixed(2)),
  };

  if (additionalContext) {
    updatePayload.context_updates = allContexts;
  }

  const { data: updated, error: updateError } = await supabase
    .from('decisions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, decision: updated, newRound: newRoundResponses, roundNumber: updatedRounds.length });
}
