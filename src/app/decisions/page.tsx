"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SeatResponse = {
  seat: string;
  emoji: string;
  model: string;
  response: string;
  score: number | null;
};

type Decision = {
  id: string;
  question: string;
  context: string | null;
  decision_type: string | null;
  reversibility: string | null;
  time_pressure: string | null;
  responses: Record<string, SeatResponse> | null;
  synthesis: string | null;
  vote_split: string | null;
  avg_score: number | null;
  recommended_action: string | null;
  conditions: string[] | null;
  decision_made: string | null;
  outcome: string;
  outcome_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DECISION_TYPES = ["spend", "build", "hire", "launch", "strategy"];
const REVERSIBILITY = ["easy", "moderate", "hard"];
const PRESSURE = ["today", "this_week", "no_rush"];

const OUTCOME_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  good: { emoji: "✅", label: "Good call", color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10" },
  bad: { emoji: "❌", label: "Bad call", color: "text-red-400 border-red-500/50 bg-red-500/10" },
  mixed: { emoji: "🔄", label: "Mixed", color: "text-amber-400 border-amber-500/50 bg-amber-500/10" },
  pending: { emoji: "⏳", label: "Pending", color: "text-slate-400 border-slate-600 bg-slate-800/50" }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function getVerdictColor(verdict: string | null) {
  if (!verdict) return "text-slate-400";
  const upper = verdict.toUpperCase();
  if (upper.includes("YES")) return "text-emerald-400";
  if (upper.includes("NO")) return "text-red-400";
  return "text-amber-400";
}

function parseSynthesis(synthesis: string | null) {
  if (!synthesis) return { voteDisplay: null, avgDisplay: null, verdictText: "", conditions: [] };

  const voteMatch = synthesis.match(/\*\*Vote:\*\*\s*(.+?)(?:\n|$)/);
  const voteDisplay = voteMatch ? voteMatch[1].trim() : null;

  const avgMatch = synthesis.match(/avg:\s*([\d.]+)\/10/);
  const avgDisplay = avgMatch ? avgMatch[1] : null;

  // Extract conditions block
  const condMatch = synthesis.match(/\*\*Conditions mentioned by the council:\*\*\n([\s\S]+?)(?:\n\n|\*\*|$)/);
  const conditions: string[] = condMatch
    ? condMatch[1].split("\n").map(l => l.trim()).filter(Boolean)
    : [];

  // Verdict text: the paragraph after the vote line
  const lines = synthesis.split("\n\n");
  const verdictText = lines.length > 1 ? lines[1].trim() : "";

  return { voteDisplay, avgDisplay, verdictText, conditions };
}

// ─── Seat Card ────────────────────────────────────────────────────────────────

function SeatCard({ seat }: { seat: SeatResponse }) {
  const [expanded, setExpanded] = useState(false);
  const preview = seat.response.slice(0, 280);
  const hasMore = seat.response.length > 280;

  const modelLabel = seat.model === "gemini-pro" ? "Gemini 2.5 Pro"
    : seat.model === "gemini-flash" ? "Gemini 2.5 Flash"
    : "Kimi";

  const isYes = seat.score !== null && seat.score > 5;
  const voteBadgeClass = isYes
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
    : "bg-red-500/20 text-red-300 border border-red-500/40";

  const scoreColor = seat.score === null ? "text-slate-400"
    : seat.score > 7 ? "text-emerald-400"
    : seat.score > 5 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/30">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{seat.emoji}</span>
          <div>
            <span className="font-medium text-sm text-slate-200 block">{seat.seat}</span>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">{modelLabel}</span>
          </div>
        </div>
        {seat.score !== null && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-2xl font-bold ${scoreColor}`}>{seat.score}/10</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${voteBadgeClass}`}>
              {isYes ? "YES" : "NO"}
            </span>
          </div>
        )}
      </div>
      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {expanded ? seat.response : preview}
        {hasMore && !expanded && "..."}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition"
        >
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}

// ─── Synthesis Block ──────────────────────────────────────────────────────────

function SynthesisBlock({ decision }: { decision: Decision }) {
  const { voteDisplay, avgDisplay, verdictText, conditions } = parseSynthesis(decision.synthesis);
  const voteColor = getVerdictColor(voteDisplay);

  return (
    <div className="border border-slate-600/50 rounded-lg p-5 bg-slate-800/60 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {voteDisplay && (
          <span className={`text-lg font-bold ${voteColor}`}>{voteDisplay}</span>
        )}
        {avgDisplay && (
          <span className="text-sm text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded">
            avg {avgDisplay}/10
          </span>
        )}
      </div>
      {verdictText && (
        <p className="text-sm text-slate-300 leading-relaxed">{verdictText}</p>
      )}
      {conditions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Conditions</p>
          <ul className="space-y-1">
            {conditions.map((c, i) => (
              <li key={i} className="text-sm text-slate-400 flex gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Decision Card (Past) ─────────────────────────────────────────────────────

function DecisionCard({
  decision,
  onOutcomeUpdate
}: {
  decision: Decision;
  onOutcomeUpdate: (id: string, outcome: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null);

  const handleOutcome = async (outcome: string) => {
    setUpdatingOutcome(outcome);
    await onOutcomeUpdate(decision.id, outcome);
    setUpdatingOutcome(null);
  };

  const outcomeInfo = OUTCOME_LABELS[decision.outcome] ?? OUTCOME_LABELS.pending;
  const seatList = decision.responses ? Object.values(decision.responses) : [];

  return (
    <div className="border border-slate-700/50 rounded-xl bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div
        className="p-5 cursor-pointer hover:bg-slate-800/30 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 font-medium leading-snug">{decision.question}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">{formatDate(decision.created_at)}</span>
              {decision.decision_type && (
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded capitalize">
                  {decision.decision_type}
                </span>
              )}
              {decision.vote_split && (
                <span className={`text-xs font-semibold ${getVerdictColor(decision.vote_split)}`}>
                  {decision.vote_split}
                </span>
              )}
              {decision.avg_score !== null && (
                <span className="text-xs text-slate-400">avg {Number(decision.avg_score).toFixed(1)}/10</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded border ${outcomeInfo.color}`}>
              {outcomeInfo.emoji} {outcomeInfo.label}
            </span>
            <span className="text-slate-500 text-sm">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-5 space-y-5">
          {/* Synthesis first */}
          {decision.synthesis && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Synthesis</p>
              <SynthesisBlock decision={decision} />
            </div>
          )}

          {/* Context */}
          {decision.context && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Context</p>
              <p className="text-sm text-slate-400">{decision.context}</p>
            </div>
          )}

          {/* Seat responses */}
          {seatList.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Council Responses</p>
              <div className="space-y-3">
                {seatList.map((seat) => (
                  <SeatCard key={seat.seat} seat={seat} />
                ))}
              </div>
            </div>
          )}

          {/* Outcome buttons */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Outcome</p>
            <div className="flex flex-wrap gap-2">
              {["good", "bad", "mixed", "pending"].map((o) => {
                const info = OUTCOME_LABELS[o];
                const isActive = decision.outcome === o;
                return (
                  <button
                    key={o}
                    disabled={updatingOutcome !== null}
                    onClick={() => handleOutcome(o)}
                    className={`text-xs px-3 py-1.5 rounded border transition ${
                      isActive
                        ? info.color + " font-semibold"
                        : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    } ${updatingOutcome === o ? "opacity-50" : ""}`}
                  >
                    {info.emoji} {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading animation ────────────────────────────────────────────────────────

function CouncilLoading() {
  const seats = [
    { emoji: "🔴", name: "Devil's Advocate" },
    { emoji: "🟢", name: "Opportunist" },
    { emoji: "🔵", name: "Operator" },
    { emoji: "🟡", name: "Historian" },
    { emoji: "🟣", name: "Second-Order" }
  ];
  const [activeSeat, setActiveSeat] = useState(0);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const seatInterval = setInterval(() => {
      setActiveSeat(prev => (prev + 1) % seats.length);
    }, 8000);
    return () => clearInterval(seatInterval);
  }, [seats.length]);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".");
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div className="border border-amber-500/20 rounded-xl bg-amber-950/10 p-8 text-center">
      <p className="text-slate-200 font-medium text-lg mb-1">Council is deliberating{dots}</p>
      <p className="text-slate-500 text-sm mb-8">This takes 30–60 seconds while 5 seats deliberate</p>
      
      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"
          style={{ width: `${((activeSeat + 1) / seats.length) * 100}%`, transition: "width 7s ease" }}
        />
      </div>

      <div className="flex justify-center gap-6 flex-wrap">
        {seats.map((seat, i) => (
          <div
            key={seat.name}
            className={`flex flex-col items-center gap-1.5 transition-all duration-700 ${
              i === activeSeat
                ? "scale-125 opacity-100"
                : i < activeSeat
                ? "scale-100 opacity-70"
                : "scale-90 opacity-30"
            }`}
          >
            <span className="text-3xl">{seat.emoji}</span>
            <span className="text-xs text-slate-400 text-center max-w-[70px]">{seat.name}</span>
            {i < activeSeat && <span className="text-xs text-emerald-500">✓</span>}
            {i === activeSeat && <span className="text-xs text-amber-400 animate-pulse">…</span>}
          </div>
        ))}
      </div>
      <p className="text-amber-400/70 text-sm mt-6 italic">
        {seats[activeSeat].emoji} {seats[activeSeat].name} is analyzing...
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DecisionsPage() {
  // Form state
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [decisionType, setDecisionType] = useState("strategy");
  const [reversibility, setReversibility] = useState("moderate");
  const [pressure, setPressure] = useState("this_week");

  // Council state
  const [running, setRunning] = useState(false);
  const [currentReport, setCurrentReport] = useState<string | null>(null);
  const [currentDecision, setCurrentDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Past decisions
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/decisions");
      if (res.ok) {
        const data = await res.json();
        setDecisions(data);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const handleRunCouncil = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setCurrentReport(null);
    setCurrentDecision(null);
    setError(null);

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim(),
          type: decisionType,
          reversibility,
          pressure
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Council failed. Check server logs.");
        return;
      }

      setCurrentReport(data.report);
      setCurrentDecision(data.decision ?? null);
      await fetchDecisions();

      // Clear form
      setQuestion("");
      setContext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const handleOutcomeUpdate = async (id: string, outcome: string) => {
    await fetch("/api/decisions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outcome })
    });
    await fetchDecisions();
  };

  // Stats
  const totalDecisions = decisions.length;
  const resolvedDecisions = decisions.filter(d => d.outcome !== "pending");
  const goodCalls = decisions.filter(d => d.outcome === "good").length;
  const pendingCount = decisions.filter(d => d.outcome === "pending").length;
  const goodPct = resolvedDecisions.length > 0
    ? Math.round((goodCalls / resolvedDecisions.length) * 100)
    : 0;

  // Button helper
  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded text-sm border transition cursor-pointer ${
      active
        ? "bg-slate-600 border-slate-500 text-slate-100"
        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
    }`;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">🏛️ Decision Council</h2>
        <p className="text-slate-400 mt-1 text-sm">
          5 AI seats, each trained on a decision-making framework. Pre-mortem, EV calc, constraints, base rates, second-order effects.
        </p>
      </div>

      {/* Stats banner */}
      {totalDecisions > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-2.5">
          <span className="text-slate-200 font-medium">{totalDecisions}</span>
          <span>decisions tracked</span>
          {resolvedDecisions.length > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-emerald-400 font-medium">{goodPct}%</span>
              <span>good calls</span>
            </>
          )}
          <span className="text-slate-700">·</span>
          <span className="text-amber-400 font-medium">{pendingCount}</span>
          <span>pending</span>
        </div>
      )}

      {/* New Decision Form */}
      <div className="border border-slate-700/50 rounded-xl bg-slate-900/60 p-6 space-y-5">
        <h3 className="text-slate-200 font-medium">New Decision</h3>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
            What decision do you need help with?
          </label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Should I spend $5K on FB ads for HeroTales?"
            rows={4}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
            Context (optional)
          </label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Any background that helps the council understand the situation..."
            rows={2}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-5">
          {/* Type */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {DECISION_TYPES.map(t => (
                <button key={t} className={btnClass(decisionType === t)} onClick={() => setDecisionType(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reversibility */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Reversibility</p>
            <div className="flex flex-wrap gap-1.5">
              {REVERSIBILITY.map(r => (
                <button key={r} className={btnClass(reversibility === r)} onClick={() => setReversibility(r)}>
                  {r === "easy" ? "Easy to undo" : r === "moderate" ? "Moderate" : "Hard to undo"}
                </button>
              ))}
            </div>
          </div>

          {/* Pressure */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Time Pressure</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESSURE.map(p => (
                <button key={p} className={btnClass(pressure === p)} onClick={() => setPressure(p)}>
                  {p === "today" ? "Today" : p === "this_week" ? "This week" : "No rush"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleRunCouncil}
          disabled={!question.trim() || running}
          style={{ background: question.trim() && !running ? "linear-gradient(135deg, #f59e0b, #ea580c)" : undefined }}
          className="px-6 py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-700 text-sm font-semibold rounded-lg transition text-white shadow-lg hover:opacity-90"
        >
          {running ? "⏳ Council deliberating..." : "Run Council →"}
        </button>
      </div>

      {/* Loading state */}
      {running && <CouncilLoading />}

      {/* Current report */}
      {currentDecision && !running && (
        <div className="border border-emerald-500/20 rounded-xl bg-emerald-950/20 p-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-emerald-300 text-lg">✅ Council Report</h3>
            {currentDecision.vote_split && (
              <span className={`text-base font-bold ${getVerdictColor(currentDecision.vote_split)}`}>
                {currentDecision.vote_split}
                {currentDecision.avg_score !== null && (
                  <span className="text-slate-400 text-sm font-normal ml-2">
                    avg {Number(currentDecision.avg_score).toFixed(1)}/10
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Synthesis at top */}
          {currentDecision.synthesis && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Synthesis</p>
              <SynthesisBlock decision={currentDecision} />
            </div>
          )}

          {/* Seat responses */}
          {currentDecision.responses && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Council Responses</p>
              <div className="space-y-3">
                {Object.values(currentDecision.responses).map((seat) => (
                  <SeatCard key={seat.seat} seat={seat} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback: raw report if decision not saved */}
      {currentReport && !currentDecision && !running && (
        <div className="border border-slate-700/50 rounded-xl bg-slate-900/60 p-5">
          <h3 className="font-medium text-slate-200 mb-3">Council Report</h3>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono overflow-auto">
            {currentReport}
          </pre>
        </div>
      )}

      {/* Past decisions */}
      <div>
        <h3 className="font-medium text-slate-200 mb-4">Past Decisions</h3>

        {loadingHistory ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : decisions.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No decisions yet. Run your first council above.</p>
        ) : (
          <div className="space-y-3">
            {decisions.map(d => (
              <DecisionCard
                key={d.id}
                decision={d}
                onOutcomeUpdate={handleOutcomeUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
