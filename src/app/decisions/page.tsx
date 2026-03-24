"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoundResponse = {
  seatId: string;
  name: string;
  emoji: string;
  modelName: string;
  score: number;
  response: string;
};

type FollowUp = {
  seatId: string;
  seatName: string;
  seatEmoji: string;
  question: string;
  response: string;
  timestamp: string;
};

type Decision = {
  id: string;
  question: string;
  context: string | null;
  decision_type: string | null;
  reversibility: string | null;
  time_pressure: string | null;
  responses: Record<string, { seat: string; emoji: string; model: string; modelName?: string; response: string; score: number }> | null;
  rounds: RoundResponse[][] | null;
  follow_ups: FollowUp[] | null;
  context_updates: string[] | null;
  pro_mode: boolean | null;
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

const SEAT_IDS = ["devils_advocate", "opportunist", "operator", "historian", "second_order"];
const SEAT_LABELS: Record<string, string> = {
  devils_advocate: "Devil's Advocate",
  opportunist: "Opportunist",
  operator: "Operator",
  historian: "Historian",
  second_order: "Second-Order Thinker",
};
const SEAT_EMOJIS: Record<string, string> = {
  devils_advocate: "🔴",
  opportunist: "🟢",
  operator: "🔵",
  historian: "🟡",
  second_order: "🟣",
};

const OUTCOME_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  good: { emoji: "✅", label: "Good call", color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10" },
  bad: { emoji: "❌", label: "Bad call", color: "text-red-400 border-red-500/50 bg-red-500/10" },
  mixed: { emoji: "🔄", label: "Mixed", color: "text-amber-400 border-amber-500/50 bg-amber-500/10" },
  pending: { emoji: "⏳", label: "Pending", color: "text-slate-400 border-slate-600 bg-slate-800/50" }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function getVerdictColor(verdict: string | null) {
  if (!verdict) return "text-slate-400";
  const upper = verdict.toUpperCase();
  if (upper.includes("YES")) return "text-emerald-400";
  if (upper.includes("NO")) return "text-red-400";
  return "text-amber-400";
}

function getRoundsFromDecision(decision: Decision): RoundResponse[][] {
  if (decision.rounds && decision.rounds.length > 0) return decision.rounds;
  // Fall back: build a round from responses field
  if (!decision.responses) return [];
  const round0: RoundResponse[] = Object.entries(decision.responses).map(([seatId, r]) => ({
    seatId,
    name: r.seat ?? SEAT_LABELS[seatId] ?? seatId,
    emoji: r.emoji ?? SEAT_EMOJIS[seatId] ?? "⚪",
    modelName: r.modelName ?? r.model ?? "?",
    score: r.score ?? 5,
    response: r.response ?? "",
  }));
  return [round0];
}

function scoreArrow(prev: number, curr: number) {
  if (curr > prev + 0.5) return <span className="text-emerald-400 text-xs font-bold ml-1">↑</span>;
  if (curr < prev - 0.5) return <span className="text-red-400 text-xs font-bold ml-1">↓</span>;
  return null;
}

// ─── Loading animation ────────────────────────────────────────────────────────

function CouncilLoading({ activeSeatIndex = 0, total = 5, mode = "initial" }: { activeSeatIndex?: number; total?: number; mode?: string }) {
  const seats = [
    { emoji: "🔴", name: "Devil's Advocate" },
    { emoji: "🟢", name: "Opportunist" },
    { emoji: "🔵", name: "Operator" },
    { emoji: "🟡", name: "Historian" },
    { emoji: "🟣", name: "Second-Order" }
  ];
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".");
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  const label = mode === "round" ? "Running next round" : mode === "followup" ? "Asking follow-up" : "Council deliberating";

  return (
    <div className="border border-amber-500/20 rounded-xl bg-amber-950/10 p-6 text-center">
      <p className="text-slate-200 font-medium text-lg mb-1">{label}{dots}</p>
      <p className="text-slate-500 text-sm mb-6">
        {mode === "initial" ? "30–60 seconds while 5 seats deliberate" : "This may take up to 2 minutes"}
      </p>
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, ((activeSeatIndex + 1) / total) * 100)}%` }}
        />
      </div>
      <div className="flex justify-center gap-6 flex-wrap">
        {seats.map((seat, i) => (
          <div key={seat.name} className={`flex flex-col items-center gap-1.5 transition-all duration-700 ${
            i === activeSeatIndex ? "scale-125 opacity-100" : i < activeSeatIndex ? "scale-100 opacity-70" : "scale-90 opacity-30"
          }`}>
            <span className="text-3xl">{seat.emoji}</span>
            <span className="text-xs text-slate-400 text-center max-w-[70px]">{seat.name}</span>
            {i < activeSeatIndex && <span className="text-xs text-emerald-500">✓</span>}
            {i === activeSeatIndex && <span className="text-xs text-amber-400 animate-pulse">…</span>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4">{activeSeatIndex + 1}/{total} seats</p>
    </div>
  );
}

// ─── Seat Card v2 ─────────────────────────────────────────────────────────────

function SeatCard({
  seat,
  prevScore,
  onAskFollowUp,
  onChallenge,
  loading,
}: {
  seat: RoundResponse;
  prevScore?: number;
  onAskFollowUp: (seatId: string) => void;
  onChallenge: (seatId: string) => void;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = seat.response.slice(0, 280);
  const hasMore = seat.response.length > 280;

  const isYes = seat.score > 5;
  const scoreColor = seat.score > 7 ? "text-emerald-400" : seat.score > 5 ? "text-amber-400" : "text-red-400";
  const voteBadgeClass = isYes
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
    : "bg-red-500/20 text-red-300 border border-red-500/40";

  if (loading) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/30 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{seat.emoji}</span>
          <div>
            <span className="font-medium text-sm text-slate-200">{seat.name}</span>
            <span className="ml-2 text-xs text-amber-400 animate-pulse">Thinking…</span>
          </div>
        </div>
        <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/30">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{seat.emoji}</span>
          <div>
            <span className="font-medium text-sm text-slate-200 block">{seat.name}</span>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">{seat.modelName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {prevScore !== undefined && prevScore !== seat.score && (
            <span className="text-xs text-slate-500">
              {prevScore}
              {scoreArrow(prevScore, seat.score)}
            </span>
          )}
          <span className={`text-2xl font-bold ${scoreColor}`}>{seat.score}/10</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${voteBadgeClass}`}>
            {isYes ? "YES" : "NO"}
          </span>
        </div>
      </div>
      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {expanded ? seat.response : preview}
        {hasMore && !expanded && "..."}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition">
          {expanded ? "Show less ↑" : "Show full response ↓"}
        </button>
      )}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
        <button
          onClick={() => onAskFollowUp(seat.seatId)}
          className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition"
        >
          Ask Follow-up
        </button>
        <button
          onClick={() => onChallenge(seat.seatId)}
          className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-300 transition"
        >
          Challenge This
        </button>
      </div>
    </div>
  );
}

// ─── Active Decision Panel ────────────────────────────────────────────────────

function ActiveDecisionPanel({
  decision,
  onUpdate,
}: {
  decision: Decision;
  onUpdate: (updated: Decision) => void;
}) {
  const rounds = getRoundsFromDecision(decision);
  const [activeRound, setActiveRound] = useState(rounds.length - 1);
  const [interactText, setInteractText] = useState("");
  const [interactTarget, setInteractTarget] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"initial" | "round" | "followup">("round");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const interactRef = useRef<HTMLTextAreaElement>(null);

  const followUps: FollowUp[] = decision.follow_ups ?? [];

  // Update active round when decision updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const newRounds = getRoundsFromDecision(decision);
    setActiveRound(newRounds.length - 1);
  }, [decision.id, decision.rounds?.length]);

  const currentRound = rounds[activeRound] ?? [];
  const prevRound = activeRound > 0 ? rounds[activeRound - 1] : undefined;

  function getPrevScore(seatId: string): number | undefined {
    if (!prevRound) return undefined;
    return prevRound.find(r => r.seatId === seatId)?.score;
  }

  // Compute per-round synthesis
  const roundSummaries = rounds.map((round) => {
    const scores = round.map(r => r.score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const yes = scores.filter(s => s > 5).length;
    const no = scores.length - yes;
    return { yes, no, avg: parseFloat(avg.toFixed(1)), verdict: yes > no ? "YES" : "NO" };
  });

  const handleAskFollowUp = (seatId: string) => {
    setInteractTarget(seatId);
    setInteractText("");
    interactRef.current?.focus();
  };

  const handleChallenge = async (seatId: string) => {
    const seatResp = currentRound.find(r => r.seatId === seatId);
    if (!seatResp) return;
    const challengeContext = `Challenge: ${seatResp.name} said: "${seatResp.response.slice(0, 500)}". All other seats should respond to this position.`;
    await runRound(challengeContext);
  };

  const handleSend = async () => {
    if (!interactText.trim()) return;

    if (interactTarget === "all") {
      await runRound(interactText.trim());
    } else {
      await runFollowUp(interactTarget, interactText.trim());
    }
    setInteractText("");
  };

  const runRound = async (context?: string) => {
    setLoading(true);
    setLoadingMode("round");
    setLoadingProgress(0);
    setError(null);

    // Fake progress animation
    const interval = setInterval(() => {
      setLoadingProgress(p => Math.min(p + 1, 4));
    }, 8000);

    try {
      const res = await fetch(`/api/decisions/${decision.id}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: context ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Round failed");
      onUpdate(data.decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const runFollowUp = async (seatId: string, question: string) => {
    setLoading(true);
    setLoadingMode("followup");
    setLoadingProgress(0);
    setError(null);

    try {
      const res = await fetch(`/api/decisions/${decision.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seat: seatId, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Follow-up failed");
      onUpdate(data.decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const addProSeat = async () => {
    setLoading(true);
    setLoadingMode("followup");
    setError(null);

    const latestRound = rounds[rounds.length - 1] ?? [];
    const opportunistResp = latestRound.find(r => r.seatId === "opportunist");
    const question = opportunistResp
      ? `GPT-5.4 Pro deep analysis of the Opportunist position: ${opportunistResp.response.slice(0, 400)}`
      : "Provide a deep GPT-5.4 Pro analysis of this decision with high reasoning effort.";

    try {
      const res = await fetch(`/api/decisions/${decision.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seat: "opportunist", question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GPT-5.4 Pro failed");
      onUpdate(data.decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-indigo-500/20 rounded-xl bg-slate-900/80 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-700/50 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-100 text-lg leading-snug">{decision.question}</h3>
          <p className="text-xs text-slate-500 mt-1">{formatDate(decision.created_at)}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            Round {rounds.length}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* Synthesis */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">📊 Synthesis</p>
          <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/40 space-y-1.5">
            {roundSummaries.map((s, i) => {
              const prev = i > 0 ? roundSummaries[i - 1] : null;
              const shifted = prev && ((s.verdict !== prev.verdict) || Math.abs(s.avg - prev.avg) >= 1.5);
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 text-xs w-16 flex-shrink-0">Round {i + 1}:</span>
                  <span className={`font-semibold ${getVerdictColor(s.verdict)}`}>
                    {s.yes}-{s.no} {s.verdict}
                  </span>
                  <span className="text-slate-400 text-xs">(avg {s.avg}/10)</span>
                  {shifted && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      ← verdict shifted!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Round tabs */}
        {rounds.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {rounds.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveRound(i)}
                className={`px-3 py-1.5 text-xs rounded border transition ${
                  activeRound === i
                    ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300"
                    : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                Round {i + 1}
                {i === rounds.length - 1 && <span className="ml-1 text-slate-600">▼</span>}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <CouncilLoading activeSeatIndex={loadingProgress} total={5} mode={loadingMode} />
        )}

        {/* Seat cards */}
        {!loading && (
          <div className="space-y-3">
            {currentRound.map((seat) => (
              <SeatCard
                key={seat.seatId}
                seat={seat}
                prevScore={getPrevScore(seat.seatId)}
                onAskFollowUp={handleAskFollowUp}
                onChallenge={handleChallenge}
                loading={false}
              />
            ))}
          </div>
        )}

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Follow-ups</p>
            <div className="space-y-3">
              {followUps.map((fu, i) => (
                <div key={i} className="border border-slate-700/40 rounded-lg p-4 bg-slate-800/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{fu.seatEmoji}</span>
                    <span className="text-sm font-medium text-slate-300">{fu.seatName}</span>
                    <span className="text-xs text-slate-500">follow-up</span>
                  </div>
                  <p className="text-xs text-slate-400 italic mb-2">&ldquo;{fu.question}&rdquo;</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{fu.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* Interact bar */}
        <div className="border-t border-slate-700/50 pt-5 space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">💬 Interact</p>
          <textarea
            ref={interactRef}
            value={interactText}
            onChange={e => setInteractText(e.target.value)}
            placeholder="Type a follow-up or add context..."
            rows={3}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />

          {/* Target selector */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-500 self-center mr-1">To:</span>
            <button
              onClick={() => setInteractTarget("all")}
              className={`text-xs px-3 py-1.5 rounded border transition ${
                interactTarget === "all"
                  ? "bg-slate-600 border-slate-500 text-slate-100"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              All Seats
            </button>
            {SEAT_IDS.map(seatId => (
              <button
                key={seatId}
                onClick={() => setInteractTarget(seatId)}
                className={`text-xs px-3 py-1.5 rounded border transition ${
                  interactTarget === seatId
                    ? "bg-slate-600 border-slate-500 text-slate-100"
                    : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {SEAT_EMOJIS[seatId]} {SEAT_LABELS[seatId]}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSend}
              disabled={!interactText.trim() || loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            >
              Send →
            </button>
            <button
              onClick={() => runRound()}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ▶ Run Next Round
            </button>
            <button
              onClick={addProSeat}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-orange-700/50 text-orange-400 hover:border-orange-500 hover:text-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              🔥 Add GPT-5.4 Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Past Decision Card ───────────────────────────────────────────────────────

function PastDecisionCard({
  decision,
  onSelect,
  onOutcomeUpdate,
}: {
  decision: Decision;
  onSelect: (d: Decision) => void;
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
  const rounds = getRoundsFromDecision(decision);
  const roundCount = rounds.length;

  return (
    <div className="border border-slate-700/50 rounded-xl bg-slate-900/60 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        {/* Click to load */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(decision)}>
          <p className="text-slate-200 font-medium leading-snug">{decision.question}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="text-xs text-slate-500">{formatDate(decision.created_at)}</span>
            {decision.decision_type && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded capitalize">
                {decision.decision_type}
              </span>
            )}
            <span className="text-xs text-slate-500">
              {roundCount} {roundCount === 1 ? "round" : "rounds"}
            </span>
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
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 text-sm hover:text-slate-300 transition"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/50 p-4">
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
      )}
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
  const [proMode, setProMode] = useState(false);

  // Running state
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active decision
  const [activeDecision, setActiveDecision] = useState<Decision | null>(null);

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
    setError(null);
    setActiveDecision(null);

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim(),
          type: decisionType,
          reversibility,
          pressure,
          pro: proMode,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Council failed. Check server logs.");
        return;
      }

      if (data.decision) {
        setActiveDecision(data.decision);
      }
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
    // Update active decision if it's the same one
    if (activeDecision?.id === id) {
      setActiveDecision(prev => prev ? { ...prev, outcome } : prev);
    }
  };

  const handleActiveDecisionUpdate = useCallback((updated: Decision) => {
    setActiveDecision(updated);
    setDecisions(prev => prev.map(d => d.id === updated.id ? updated : d));
  }, []);

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
          5 AI seats, each trained on a decision-making framework. Multi-round debate, follow-ups, challenge mode.
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
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Context (optional)</label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Any background that helps the council understand the situation..."
            rows={2}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-5">
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

        {/* Pro mode toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setProMode(!proMode)}
            className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
              proMode ? "bg-orange-500" : "bg-slate-700"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${proMode ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <span className="text-sm text-slate-400 group-hover:text-slate-300 transition">
            🔥 Include GPT-5.4 Pro
            <span className="ml-1.5 text-xs text-slate-600">(slower, deeper analysis for Opportunist seat)</span>
          </span>
        </label>

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
      {running && <CouncilLoading mode="initial" />}

      {/* Active Decision Panel */}
      {activeDecision && !running && (
        <ActiveDecisionPanel
          decision={activeDecision}
          onUpdate={handleActiveDecisionUpdate}
        />
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
              <PastDecisionCard
                key={d.id}
                decision={d}
                onSelect={(selected) => {
                  setActiveDecision(selected);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onOutcomeUpdate={handleOutcomeUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
