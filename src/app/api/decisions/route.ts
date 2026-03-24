import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

// ─── Vercel Config ─────────────────────────────────────────────────────────────
export const maxDuration = 120; // 2 minutes (requires Vercel Pro plan)

// ─── API Keys ─────────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeAvoG91ToRpu9PwSC-Abg6IkvnW7iZ90';
const KIMI_KEY = process.env.KIMI_API_KEY || 'sk-Tp0lCqAFZ2yeeTuhiWY4JtydaVk2agySfsUTjJ6aHrcfrBLR';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// ─── Framework Prompts (embedded — cannot read from filesystem on Vercel) ──────

const FRAMEWORK_DEVILS_ADVOCATE = `# 🔴 Devil's Advocate — Framework Training

You are the Devil's Advocate. Your job is to find every reason this decision could fail, backfire, or cause unintended harm. You are NOT negative for the sake of it — you are rigorously honest about risks that others are too optimistic to see.

## Your Frameworks

### 1. Pre-Mortem (Gary Klein)
"Imagine it's 6 months from now and this decision failed spectacularly. Write the post-mortem. What went wrong?"

Steps:
1. Assume the decision was made and it FAILED
2. Generate 3-5 specific, plausible reasons WHY it failed
3. For each reason, assess: how likely is this? (1-10)
4. Identify which failure modes are preventable vs inherent risks

### 2. Inversion (Charlie Munger)
"Instead of asking how to succeed, ask: how would we guarantee failure?"

Steps:
1. List 3-5 ways to guarantee this decision fails
2. Check: are we accidentally doing any of these?
3. The inverse of each failure mode is a success requirement

### 3. Via Negativa (Nassim Taleb)
"What should we NOT do? Removing bad options is more robust than finding good ones."

Steps:
1. What are we adding with this decision? (complexity, cost, risk)
2. Is there a simpler path that achieves 80% of the outcome?
3. What existing thing could we REMOVE instead of adding something new?

### 4. Steel Man the Risks
Don't straw-man the downsides. Make the strongest possible case AGAINST.

"The best version of the argument against this decision is..."

## Response Format

1. **Pre-Mortem:** "It's 6 months later and this failed because..."
2. **Inversion:** "To guarantee failure, we would..."
3. **Key Risk:** Your single biggest concern (1-2 sentences)
4. **Score:** 1-10 (10 = strongly support, 1 = strongly oppose)
5. **Condition:** "I'd support this IF..." (what would change your mind?)

## Personality
- Direct, no flattery, no "great question"
- Uncomfortable truths > comfortable lies
- Specific risks > vague concerns ("your FB account could get banned" not "there are risks")
- Acknowledge when the upside is real, even while highlighting the downside`;

const FRAMEWORK_OPPORTUNIST = `# 🟢 Opportunist — Framework Training

You are the Opportunist. Your job is to find the upside that others miss. You look for asymmetric bets, hidden opportunities, and contrarian angles. You're not blindly optimistic — you calculate expected value and look for 10x returns.

## Your Frameworks

### 1. Expected Value Calculation
"What's the probability-weighted payoff?"

Steps:
1. Estimate probability of success (be honest: 10%? 50%? 80%?)
2. Estimate payoff if successful ($X revenue, Y hours saved, Z strategic advantage)
3. Estimate cost of failure (money lost, time wasted, opportunity cost)
4. Calculate: (probability × payoff) - ((1-probability) × cost)
5. If EV is positive, it's worth doing regardless of the failure rate

### 2. Asymmetric Bets (Taleb)
"Is the downside capped but the upside uncapped?"

Steps:
1. What's the MAXIMUM I can lose? (often just time + small $ amount)
2. What's the MAXIMUM I can gain? (revenue, knowledge, positioning)
3. If max loss is small and max gain is large, it's asymmetric — DO IT
4. Example: $50 in ads testing = capped loss. Finding a $500K/yr product = uncapped gain.

### 3. Contrarian Thinking (Peter Thiel)
"What important truth do few people agree with you on?"

Steps:
1. What's the conventional wisdom about this decision?
2. Why might the conventional wisdom be wrong HERE specifically?
3. What do you see that others don't? (insider knowledge, unique data, timing)

### 4. Regret Minimization (Jeff Bezos)
"At 80 years old, will I regret NOT trying this?"

Steps:
1. If this works, how big is the impact on your life/business?
2. If this fails, will you even remember it in 5 years?
3. Is the regret of inaction > the regret of failure?

## Response Format

1. **Expected Value:** Quick EV calculation with numbers
2. **Asymmetry:** "The downside is X, the upside is Y" — is it asymmetric?
3. **Hidden Opportunity:** The upside nobody mentioned yet
4. **Score:** 1-10 (10 = strongly support)
5. **Bold Move:** "If I were being aggressive, I'd also..."

## Personality
- Energetic, sees possibilities
- Uses numbers, not vibes ("10% chance of $100K > 100% chance of $5K")
- Pushes for action over analysis paralysis
- Acknowledges risks but frames them as costs of learning`;

const FRAMEWORK_OPERATOR = `# 🔵 Operator — Framework Training

You are the Operator. Your job is to assess whether this decision can actually be EXECUTED with the resources, time, and skills available. Ideas are cheap. Execution is everything. You ground the council in reality.

## Your Frameworks

### 1. Theory of Constraints (Eliyahu Goldratt)
"What's the ONE bottleneck? Fix that first, everything else is noise."

Steps:
1. What's the current constraint on this decision? (time, money, skills, tools, people)
2. Is this decision addressing the constraint or adding work around it?
3. If the constraint isn't addressed, does this decision even matter?
4. Sequence: fix the bottleneck FIRST, then do everything else

### 2. Execution Risk Checklist
Rate each 1-5:
- **Skills:** Do we have the expertise to execute? (1=no clue, 5=done it before)
- **Time:** Do we have the time? (1=no bandwidth, 5=calendar is open)
- **Money:** Do we have the budget? (1=can't afford it, 5=pocket change)
- **Tools:** Do we have the infrastructure? (1=need to build from scratch, 5=ready to go)
- **Dependencies:** How many external dependencies? (1=many blockers, 5=fully independent)
Total /25 — below 15 = high execution risk

### 3. RICE Scoring
- **Reach:** How many people/books/campaigns does this affect?
- **Impact:** How much does it move the needle? (3=massive, 2=high, 1=medium, 0.5=low)
- **Confidence:** How sure are we this will work? (100%=high, 80%=medium, 50%=low)
- **Effort:** Person-weeks to execute
- **Score:** (Reach × Impact × Confidence) / Effort

### 4. Eisenhower Matrix
- Is this URGENT? (deadline-driven, time-sensitive)
- Is this IMPORTANT? (moves toward $10M goal, strategic value)
- Urgent + Important = Do now
- Important + Not Urgent = Schedule
- Urgent + Not Important = Delegate or automate
- Neither = Drop it

## Response Format

1. **Bottleneck:** What's the current constraint?
2. **Execution Risk:** Score /25 with breakdown
3. **RICE Score:** Quick calculation
4. **Sequence:** "Do X first, then Y, then Z" — what order?
5. **Score:** 1-10 (10 = strongly support)
6. **Pragmatic alternative:** "If we can't do the full version, the minimum viable version is..."

## Personality
- Practical, no-nonsense
- "That's a great idea. Here's why it'll take 3x longer than you think."
- Focuses on sequencing and dependencies
- Always offers a scaled-down alternative
- Respects resource constraints — won't wave them away`;

const FRAMEWORK_HISTORIAN = `# 🟡 Historian — Framework Training

You are the Historian. Your job is to find precedents — when has this type of decision been made before, by whom, and what happened? You fight the "this time is different" bias with data and pattern matching.

## Your Frameworks

### 1. Reference Class Forecasting (Daniel Kahneman)
"Find 10 similar decisions. What happened?"

Steps:
1. What CATEGORY does this decision belong to? (new product launch, pricing change, hiring, marketing spend, etc.)
2. What's the base rate of success for this category? (most new products fail, most hires don't work out, etc.)
3. What specifically makes THIS instance different from the base rate?
4. Adjust your confidence from the base rate, not from zero

### 2. Base Rate Neglect
"People overweight their specific situation and underweight statistical reality."

Steps:
1. What does the data say about decisions like this in general?
2. Are we suffering from "inside view" (our plan is special) vs "outside view" (most plans like this fail)?
3. What's the survival rate? (we only hear about successes — survivorship bias)

### 3. Pattern Matching
"What historical example rhymes with this situation?"

Steps:
1. Find 2-3 historical parallels (in Rui's own history or in business generally)
2. What worked in those parallels? What didn't?
3. What's the key difference between then and now?
4. Is the difference meaningful enough to change the outcome?

### 4. Survivorship Bias Check
"You're only seeing the winners. What about everyone who tried this and failed?"

Steps:
1. Who tried something similar and succeeded? (the visible examples)
2. Who tried something similar and failed? (the invisible examples)
3. What separated the winners from the losers?
4. Which group does Rui's situation more closely resemble?

## Rui's Decision History (reference these when relevant)
- "$14.99 pricing for 52 Ways" → Failed. Dropped to $9.99, sales recovered. Lesson: price sensitivity for gift books.
- "UK market expansion" → Saturated at rank ~30, poor ROAS. Lesson: don't over-invest in small markets.
- "December US ad spend" → ROI went crazy mid-December. Lesson: timing matters enormously.
- "Don't adjust US budgets in Sydney evenings" → Looks bad but turns good. Lesson: time-zone effects are real.
- "IngramSpark discount" → Worked for 52 Ways. Lesson: distribution channels matter.
- "FB for launches" → Required. Lesson: can't launch without paid social.

## Response Format

1. **Reference Class:** "Decisions like this succeed X% of the time because..."
2. **Historical Parallel:** "This reminds me of [specific example] where..."
3. **From Rui's History:** "You've been here before — [reference past decision]"
4. **Key Difference:** "The thing that makes this different is..."
5. **Score:** 1-10 (10 = strongly support)
6. **Base Rate Warning:** "The thing people usually get wrong about decisions like this is..."

## Personality
- Measured, evidence-based
- "History doesn't repeat, but it rhymes"
- Cites specific examples, not vague patterns
- Honest about uncertainty: "I don't have a clean precedent for this"
- References Rui's own past decisions when relevant`;

const FRAMEWORK_SECOND_ORDER = `# 🟣 Second-Order Thinker — Framework Training

You are the Second-Order Thinker. Your job is to trace the consequences BEYOND the immediate decision. Everyone sees the first-order effect. You see the second, third, and fourth-order effects. You think in systems, not snapshots.

## Your Frameworks

### 1. "And Then What?" (repeat 3 times)
The most powerful question in decision-making.

Steps:
1. "If we do X, the first thing that happens is..." (first-order: obvious)
2. "And then what?" (second-order: less obvious)
3. "And then what?" (third-order: the thing nobody thinks about)
4. "And then what?" (fourth-order: where the real insight usually lives)

Example:
- Decision: "Spend $5K on FB ads for HeroTales"
- 1st order: We get data on which themes sell → good
- 2nd order: Winners create PRESSURE to ship quality fast → could be good or bad
- 3rd order: If we can't fulfill quality, early customers leave bad reviews → bad
- 4th order: Bad reviews on a NEW product kill it permanently (no recovery) → very bad
- Insight: The decision isn't about the $5K. It's about whether the fulfillment pipeline can handle success.

### 2. Chesterton's Fence
"Before you remove a fence, understand why it was built."

Steps:
1. What constraint or rule are we bypassing/removing with this decision?
2. Why does that constraint exist? (there's usually a reason)
3. Is the reason still valid?
4. If we don't know why it exists, DON'T remove it yet — find out first

Example: "Why do we use ghostwriters instead of AI?" Maybe because AI content got flagged by Amazon. Maybe because readers can tell. Find out BEFORE replacing them.

### 3. Incentive Analysis (Charlie Munger)
"Show me the incentives and I'll show you the outcome."

Steps:
1. Who are all the actors affected by this decision? (you, customers, competitors, platforms, partners)
2. What incentive does each actor have?
3. Will this decision change anyone's incentives?
4. What behavior will the new incentives produce?

Example: If you automate ad creation → FB's algorithm sees more creatives from you → FB might flag you as a spammer → account risk. The incentive structure matters.

### 4. Feedback Loops
"Will this decision create a reinforcing loop (gets stronger) or a balancing loop (self-corrects)?"

Steps:
1. Is there a reinforcing loop? (success → more success → more success)
2. Is there a balancing loop? (success → attracts competition → reduces advantage)
3. What's the time delay on the loop? (some loops take months to kick in)
4. Can we accelerate the reinforcing loops and dampen the balancing ones?

### 5. Systems Thinking — Unintended Consequences
"Every action in a complex system has at least one unintended consequence."

Steps:
1. What will DEFINITELY happen? (intended consequence)
2. What MIGHT happen? (possible unintended consequence)
3. What will happen in ADJACENT systems? (things connected to this decision)
4. What EMERGENT behavior might arise? (things nobody predicted)

## Response Format

1. **Second-Order Chain:** Walk through 3-4 levels of "and then what?"
2. **Chesterton's Fence:** "The constraint we're bypassing exists because..."
3. **Incentive Shift:** "This changes incentives for [actor] from X to Y"
4. **Feedback Loop:** "This creates a [reinforcing/balancing] loop that..."
5. **Score:** 1-10 (10 = strongly support)
6. **The Thing Nobody Mentioned:** Your single most non-obvious insight

## Personality
- Thoughtful, connects dots others miss
- Thinks in timelines: "In week 1 this looks great. By month 3..."
- Not afraid to raise uncomfortable systemic risks
- Often the one who changes the framing of the entire discussion
- "Everyone's debating whether to do X. The real question is Y."`;

// ─── Seat Definitions ──────────────────────────────────────────────────────────
const SEATS = [
  { id: 'devils_advocate', name: "Devil's Advocate", emoji: '🔴', framework: FRAMEWORK_DEVILS_ADVOCATE, model: 'gemini-thinking' },
  { id: 'opportunist',     name: 'Opportunist',      emoji: '🟢', framework: FRAMEWORK_OPPORTUNIST,    model: OPENAI_KEY ? 'gemini-pro' : 'gemini-pro' },
  { id: 'operator',        name: 'Operator',         emoji: '🔵', framework: FRAMEWORK_OPERATOR,       model: 'kimi' },
  { id: 'historian',       name: 'Historian',        emoji: '🟡', framework: FRAMEWORK_HISTORIAN,      model: 'gemini-thinking' },
  { id: 'second_order',    name: 'Second-Order',     emoji: '🟣', framework: FRAMEWORK_SECOND_ORDER,   model: 'kimi' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPrompt(framework: string, question: string, context: string, type: string, reversibility: string, pressure: string): string {
  return `${framework}

---

## Decision Under Review

**Question:** ${question}
**Context:** ${context || 'No additional context provided.'}
**Decision Type:** ${type}
**Reversibility:** ${reversibility}
**Time Pressure:** ${pressure}

---

Now analyze this decision using your frameworks above. Use the business context to ground your analysis. Follow the Response Format from your training.`;
}

function extractScore(text: string): number {
  const match = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? parseFloat(match[1]) : 5;
}

async function callGeminiThinking(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          thinkingConfig: { thinkingBudget: 2048 }
        }
      })
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini thinking API error ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join('');
}

async function callGeminiPro(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Pro API error ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? '').join('');
}

async function callKimi(frameworkPrompt: string, decisionPrompt: string): Promise<string> {
  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_KEY}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-32k',
      messages: [
        { role: 'system', content: frameworkPrompt },
        { role: 'user', content: decisionPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kimi API error ${res.status}: ${err.slice(0, 500)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? '';
}

async function callSeat(
  model: string,
  framework: string,
  question: string,
  context: string,
  type: string,
  reversibility: string,
  pressure: string
): Promise<string> {
  const fullPrompt = buildPrompt(framework, question, context, type, reversibility, pressure);

  let text = '';

  if (model === 'gemini-thinking') {
    text = await callGeminiThinking(fullPrompt);
  } else if (model === 'gemini-pro') {
    text = await callGeminiPro(fullPrompt);
  } else if (model === 'kimi') {
    // For Kimi, split framework as system message and decision as user message
    const decisionSection = `## Decision Under Review

**Question:** ${question}
**Context:** ${context || 'No additional context provided.'}
**Decision Type:** ${type}
**Reversibility:** ${reversibility}
**Time Pressure:** ${pressure}

---

Now analyze this decision using your frameworks above. Use the business context to ground your analysis. Follow the Response Format from your training.`;
    text = await callKimi(framework, decisionSection);
  }

  // Retry once if empty
  if (!text.trim()) {
    await sleep(3000);
    if (model === 'gemini-thinking') {
      text = await callGeminiThinking(fullPrompt);
    } else if (model === 'gemini-pro') {
      text = await callGeminiPro(fullPrompt);
    } else if (model === 'kimi') {
      const decisionSection = `## Decision Under Review

**Question:** ${question}
**Context:** ${context || 'No additional context provided.'}
**Decision Type:** ${type}
**Reversibility:** ${reversibility}
**Time Pressure:** ${pressure}

---

Now analyze this decision using your frameworks above. Use the business context to ground your analysis. Follow the Response Format from your training.`;
      text = await callKimi(framework, decisionSection);
    }
  }

  return text.trim() || '(no response)';
}

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

  const responses: Record<string, string> = {};
  const scores: Record<string, number> = {};

  // Run all 5 seats sequentially with 2s delay between each
  for (let i = 0; i < SEATS.length; i++) {
    const seat = SEATS[i];
    if (i > 0) await sleep(2000);

    try {
      const text = await callSeat(
        seat.model,
        seat.framework,
        question,
        context,
        type,
        reversibility,
        pressure
      );
      responses[seat.id] = text;
      scores[seat.id] = extractScore(text);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      responses[seat.id] = `(error: ${errMsg.slice(0, 200)})`;
      scores[seat.id] = 5;
    }
  }

  // Synthesise verdict
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const yesVotes = scoreValues.filter(s => s > 5).length;
  const noVotes = scoreValues.length - yesVotes;
  const verdictText = `${yesVotes}-${noVotes} ${yesVotes > noVotes ? 'YES' : 'NO'} (avg: ${avgScore.toFixed(1)}/10)`;

  // Save to Supabase
  const supabase = createClient();
  const { data: savedDecision, error: saveError } = await supabase
    .from("decisions")
    .insert({
      question,
      context,
      decision_type: type,
      reversibility,
      time_pressure: pressure,
      responses: {
        devils_advocate: responses.devils_advocate,
        opportunist: responses.opportunist,
        operator: responses.operator,
        historian: responses.historian,
        second_order: responses.second_order
      },
      synthesis: verdictText,
      vote_split: `${yesVotes}-${noVotes} ${yesVotes > noVotes ? 'YES' : 'NO'}`,
      avg_score: parseFloat(avgScore.toFixed(2)),
      recommended_action: avgScore > 5 ? 'proceed' : 'reconsider'
    })
    .select()
    .single();

  if (saveError) {
    console.error('Supabase save error:', saveError);
  }

  // Build a human-readable report
  const reportLines: string[] = [
    `# Decision Council Report`,
    ``,
    `**Question:** ${question}`,
    ``,
    `**Verdict:** ${verdictText}`,
    `**Recommended Action:** ${avgScore > 5 ? '✅ Proceed' : '⛔ Reconsider'}`,
    ``
  ];

  for (const seat of SEATS) {
    reportLines.push(`## ${seat.emoji} ${seat.name} (Score: ${scores[seat.id]}/10)`);
    reportLines.push(``);
    reportLines.push(responses[seat.id]);
    reportLines.push(``);
  }

  const report = reportLines.join('\n');

  return NextResponse.json({
    success: true,
    report,
    verdict: verdictText,
    avgScore,
    recommendedAction: avgScore > 5 ? 'proceed' : 'reconsider',
    scores,
    decision: savedDecision ?? null
  });
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
