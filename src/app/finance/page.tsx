"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Signal = {
  id: string;
  ticker: string;
  company_name: string | null;
  raw_text: string;
  source: string;
  category: string;
  price_at_post: number | null;
  market_cap: string | null;
  sector: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type Thesis = {
  id: string;
  ticker: string;
  title: string;
  rating: number;
  thesis: string;
  sizing: string | null;
  category: string;
  status: string;
  catalyst: string | null;
  catalyst_date: string | null;
  interacts_with: string[] | null;
  verdict: string;
  entry_price: number | null;
  current_pnl: number | null;
  source: string;
  raw_text: string | null;
  phase: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = ["Manual", "@DonDurrett", "@OriginalBraila", "@calvinfroedge", "@puppyeh1", "Buffett", "Other"];
const CATEGORIES = ["Thesis", "News", "Earnings", "Tip", "Alert"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sourceColor(source: string) {
  const s = source.toLowerCase();
  if (s.includes("dondu")) return "bg-sky-500/20 text-sky-300 border-sky-500/40";
  if (s === "buffett") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (s === "manual") return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  if (s.includes("@")) return "bg-purple-500/20 text-purple-300 border-purple-500/40";
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
}

function categoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "alert": return "bg-red-500/20 text-red-300 border-red-500/40";
    case "tip": return "bg-green-500/20 text-green-300 border-green-500/40";
    case "news": return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "earnings": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    default: return "bg-slate-700/40 text-slate-300 border-slate-600/40";
  }
}

function verdictBadge(verdict: string) {
  switch (verdict) {
    case "add": return "bg-green-500/20 text-green-300 border-green-500/40";
    case "skip": return "bg-red-500/20 text-red-300 border-red-500/40";
    case "consolidate": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    default: return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}

function verdictEmoji(verdict: string) {
  switch (verdict) {
    case "add": return "✅";
    case "skip": return "❌";
    case "consolidate": return "🔄";
    default: return "";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "watchlist": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    case "entered": return "bg-green-500/20 text-green-300 border-green-500/40";
    case "closed": return "bg-slate-500/20 text-slate-400 border-slate-600/40";
    case "skipped": return "bg-red-500/20 text-red-300 border-red-500/40";
    default: return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}

function statusEmoji(status: string) {
  switch (status) {
    case "watchlist": return "🟡";
    case "entered": return "📈";
    case "closed": return "⬛";
    case "skipped": return "🔴";
    default: return "";
  }
}

function thesisCategoryBadge(cat: string) {
  switch (cat) {
    case "recovery_hedge": return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "directional": return "bg-green-500/20 text-green-300 border-green-500/40";
    case "spread": return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "tail_risk": return "bg-red-500/20 text-red-300 border-red-500/40";
    case "diversifier": return "bg-teal-500/20 text-teal-300 border-teal-500/40";
    default: return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}

function thesisCategoryLabel(cat: string) {
  switch (cat) {
    case "recovery_hedge": return "Recovery Hedge";
    case "tail_risk": return "Tail Risk";
    default: return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= rating ? "text-amber-400" : "text-slate-700"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Signal Feed Components ───────────────────────────────────────────────────

function SignalCard({ signal, onClick, isSelected }: { signal: Signal; onClick: () => void; isSelected: boolean }) {
  const hasPrice = signal.price_at_post !== null;
  return (
    <div
      className={`cursor-pointer rounded-xl border p-4 transition hover:border-slate-600 ${
        isSelected ? "border-indigo-500/60 bg-indigo-950/20" : "border-slate-800 bg-slate-900/60"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-100 font-mono">
            ${signal.ticker}
          </span>
          {signal.company_name && <span className="text-xs text-slate-400">{signal.company_name}</span>}
          {hasPrice && <span className="text-xs font-semibold text-green-400">${signal.price_at_post?.toFixed(2)}</span>}
        </div>
        <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(signal.created_at)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-300 leading-5 line-clamp-2">{signal.raw_text}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${sourceColor(signal.source)}`}>
          {signal.source}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${categoryColor(signal.category)}`}>
          {signal.category}
        </span>
      </div>
    </div>
  );
}

function AddSignalModal({ onClose, onAdded }: { onClose: () => void; onAdded: (s: Signal) => void }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("Manual");
  const [category, setCategory] = useState("Thesis");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractedTicker = useMemo(() => {
    const match = text.match(/\$([A-Z][A-Z0-9.\-]{0,9})/);
    return match ? match[1] : null;
  }, [text]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: source.toLowerCase(), category: category.toLowerCase() })
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add signal");
        return;
      }
      const saved = await res.json();
      onAdded(saved);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-100">Add Signal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Signal Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. US leader in pesto sauce with 32% operating margins $AMNF"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
              required
            />
            {extractedTicker && <p className="mt-1 text-xs text-green-400">Auto-detected: ${extractedTicker}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading || !text.trim()} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
            {loading ? "Adding..." : "Add Signal"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TickerDetailPanel({ ticker, allSignals }: { ticker: string; allSignals: Signal[] }) {
  const tickerSignals = allSignals.filter((s) => s.ticker === ticker).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latest = tickerSignals[0];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">${ticker}</span>
            {latest?.price_at_post && <span className="text-lg font-semibold text-green-400">${latest.price_at_post.toFixed(2)}</span>}
          </div>
          {latest?.company_name && <p className="text-sm text-slate-400 mt-0.5">{latest.company_name}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
            {latest?.market_cap && <span>Market Cap: <span className="text-slate-300">{latest.market_cap}</span></span>}
            {latest?.sector && <span>Sector: <span className="text-slate-300">{latest.sector}</span></span>}
          </div>
        </div>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
          {tickerSignals.length} signal{tickerSignals.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-3">Timeline</p>
        <div className="flex flex-col gap-3">
          {tickerSignals.map((s) => (
            <div key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-2 w-2 rounded-full bg-slate-600" />
                <div className="flex-1 w-px bg-slate-800 mt-1" />
              </div>
              <div className="pb-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${sourceColor(s.source)}`}>{s.source}</span>
                  <span className="text-xs text-slate-500">{formatRelativeTime(s.created_at)}</span>
                </div>
                <p className="text-sm text-slate-300 leading-5">{s.raw_text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Trade Theses Components ──────────────────────────────────────────────────

function ThesisCard({ thesis, onStatusUpdate }: { thesis: Thesis; onStatusUpdate: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const shortThesis = thesis.thesis.length > 200 ? thesis.thesis.slice(0, 200) + "…" : thesis.thesis;

  async function markEntered() {
    setUpdating(true);
    try {
      const res = await fetch("/api/theses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: thesis.id, status: "entered" })
      });
      if (res.ok) onStatusUpdate(thesis.id, "entered");
    } finally {
      setUpdating(false);
    }
  }

  async function cycleStatus() {
    const statuses = ["watchlist", "entered", "closed", "skipped"];
    const current = statuses.indexOf(thesis.status);
    const next = statuses[(current + 1) % statuses.length];
    setUpdating(true);
    try {
      const res = await fetch("/api/theses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: thesis.id, status: next })
      });
      if (res.ok) onStatusUpdate(thesis.id, next);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StarRating rating={thesis.rating} />
            <span className="font-mono text-sm font-bold text-slate-100">{thesis.ticker}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${verdictBadge(thesis.verdict)}`}>
              {verdictEmoji(thesis.verdict)} {thesis.verdict}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${statusBadge(thesis.status)}`}>
              {statusEmoji(thesis.status)} {thesis.status}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 leading-snug">{thesis.title}</h3>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(thesis.created_at)}</span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${thesisCategoryBadge(thesis.category)}`}>
          {thesisCategoryLabel(thesis.category)}
        </span>
        {thesis.sizing && <span className="text-slate-300">💰 {thesis.sizing}</span>}
        {thesis.phase && <span className="text-slate-400">📍 {thesis.phase}</span>}
      </div>

      {/* Thesis text */}
      <p className="text-sm text-slate-300 leading-5">
        {expanded ? (thesis.raw_text ?? thesis.thesis) : shortThesis}
      </p>

      {/* Catalyst + Interacts */}
      {thesis.catalyst && (
        <p className="text-xs text-slate-400">📅 <span className="text-slate-300">{thesis.catalyst}</span>
          {thesis.catalyst_date && <span className="ml-1 text-slate-500">({formatDate(thesis.catalyst_date)})</span>}
        </p>
      )}
      {thesis.interacts_with && thesis.interacts_with.length > 0 && (
        <p className="text-xs text-slate-400">🔗 Interacts: <span className="text-slate-300">{thesis.interacts_with.join(", ")}</span></p>
      )}
      <p className="text-xs text-slate-500">Source: {thesis.source} · Added: {formatDate(thesis.created_at)}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-800 flex-wrap">
        {thesis.status === "watchlist" && (
          <button
            onClick={markEntered}
            disabled={updating}
            className="rounded-full border border-green-600/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300 hover:bg-green-500/20 transition disabled:opacity-50"
          >
            📈 Mark Entered
          </button>
        )}
        <button
          onClick={cycleStatus}
          disabled={updating}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100 transition disabled:opacity-50"
        >
          🔄 Edit Status
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
        >
          {expanded ? "⬆ Collapse" : "⬇ Expand Full"}
        </button>
      </div>
    </div>
  );
}

// ─── Portfolio Map Component ───────────────────────────────────────────────────

function PortfolioMap() {
  const rows = [
    { position: "AAL short", crisis: { icon: "✅", label: "Prints" }, escalation: { icon: "✅", label: "Prints" }, resolution: { icon: "❌", label: "-$1,250" } },
    { position: "CCL short", crisis: { icon: "✅", label: "Prints" }, escalation: { icon: "✅", label: "Prints" }, resolution: { icon: "❌", label: "-$1,250" } },
    { position: "CF $9K", crisis: { icon: "✅", label: "Prints" }, escalation: { icon: "✅✅", label: "Surges" }, resolution: { icon: "❌", label: "Gives back" } },
    { position: "Tankers $8K", crisis: { icon: "✅", label: "ATH" }, escalation: { icon: "✅✅", label: "ATH+" }, resolution: { icon: "↘", label: "Normalizes" } },
    { position: "DAL/UAL LEAPS", crisis: { icon: "❌", label: "-$2K" }, escalation: { icon: "❌", label: "-$2K" }, resolution: { icon: "✅", label: "$17-35K 🚀" } },
    { position: "Brent $150", crisis: { icon: "❌", label: "Expires" }, escalation: { icon: "✅", label: "$25K+ 🚀" }, resolution: { icon: "❌", label: "Expires" } },
    { position: "ERII $3K", crisis: { icon: "↗", label: "Steady" }, escalation: { icon: "✅✅", label: "Water crisis" }, resolution: { icon: "↗", label: "Steady" } },
    { position: "Corn/Soy", crisis: { icon: "✅", label: "Spread plays" }, escalation: { icon: "✅", label: "Spread plays" }, resolution: { icon: "↘", label: "Normalizes" } },
  ];

  function cellColor(icon: string) {
    if (icon.startsWith("✅")) return "text-green-400";
    if (icon.startsWith("❌")) return "text-red-400";
    if (icon === "↘") return "text-amber-400";
    if (icon === "↗") return "text-sky-400";
    return "text-slate-300";
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">Portfolio Scenario Map</h2>
        <p className="text-xs text-slate-500 mt-1">How positions perform across 3 macro scenarios</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-4 text-xs uppercase tracking-[0.15em] text-slate-500 font-medium">Position</th>
              <th className="text-center py-2 px-4 text-xs uppercase tracking-[0.15em] text-yellow-500/70 font-medium">Crisis Persists</th>
              <th className="text-center py-2 px-4 text-xs uppercase tracking-[0.15em] text-red-500/70 font-medium">Escalation ($150 oil)</th>
              <th className="text-center py-2 px-4 text-xs uppercase tracking-[0.15em] text-green-500/70 font-medium">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition">
                <td className="py-3 pr-4 font-medium text-slate-200 font-mono text-xs">{row.position}</td>
                {[row.crisis, row.escalation, row.resolution].map((cell, j) => (
                  <td key={j} className={`py-3 px-4 text-center ${cellColor(cell.icon)}`}>
                    <div className="font-semibold">{cell.icon}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{cell.label}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span><span className="text-green-400">✅</span> Profitable</span>
        <span><span className="text-green-400">✅✅</span> Strongly profitable</span>
        <span><span className="text-red-400">❌</span> Loss / expires</span>
        <span><span className="text-amber-400">↘</span> Normalizes</span>
        <span><span className="text-sky-400">↗</span> Steady/mild gain</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "signals" | "theses" | "portfolio";

export default function FinancePage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    ),
    []
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("signals");

  // Signal Feed state
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalFilter, setSignalFilter] = useState("all");
  const [signalSearch, setSignalSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Trade Theses state
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [thesesLoading, setThesesLoading] = useState(false);
  const [thesesLoaded, setThesesLoaded] = useState(false);
  const [thesisFilter, setThesisFilter] = useState("all");
  const [thesisSearch, setThesisSearch] = useState("");

  // Load signals
  const loadSignals = useCallback(async () => {
    setSignalsLoading(true);
    const { data, error } = await supabase
      .from("stock_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setSignals((data ?? []) as Signal[]);
    setSignalsLoading(false);
  }, [supabase]);

  useEffect(() => { loadSignals(); }, [loadSignals]);

  // Load theses (lazy — only when tab is opened)
  const loadTheses = useCallback(async () => {
    if (thesesLoaded) return;
    setThesesLoading(true);
    try {
      const res = await fetch("/api/theses");
      const data = await res.json();
      setTheses(Array.isArray(data) ? data : []);
      setThesesLoaded(true);
    } finally {
      setThesesLoading(false);
    }
  }, [thesesLoaded]);

  useEffect(() => {
    if (activeTab === "theses") loadTheses();
  }, [activeTab, loadTheses]);

  // Signal filters
  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const matchesFilter =
        signalFilter === "all" ||
        (signalFilter === "manual" && s.source.toLowerCase() === "manual") ||
        (signalFilter === "twitter" && s.source.startsWith("@")) ||
        (signalFilter === "buffett" && s.source.toLowerCase() === "buffett");
      const matchesSearch =
        !signalSearch ||
        s.raw_text.toLowerCase().includes(signalSearch.toLowerCase()) ||
        s.ticker.toLowerCase().includes(signalSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [signals, signalFilter, signalSearch]);

  // Thesis filters
  const filteredTheses = useMemo(() => {
    return theses.filter((t) => {
      const matchesFilter =
        thesisFilter === "all" ||
        thesisFilter === t.verdict ||
        (thesisFilter === "entered" && t.status === "entered");
      const matchesSearch =
        !thesisSearch ||
        t.ticker.toLowerCase().includes(thesisSearch.toLowerCase()) ||
        t.title.toLowerCase().includes(thesisSearch.toLowerCase()) ||
        t.thesis.toLowerCase().includes(thesisSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [theses, thesisFilter, thesisSearch]);

  function handleThesisStatusUpdate(id: string, status: string) {
    setTheses((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }

  const signalFilterButtons = [
    { key: "all", label: "All" },
    { key: "manual", label: "Manual" },
    { key: "twitter", label: "Twitter" },
    { key: "buffett", label: "Buffett" }
  ];

  const thesisFilterButtons = [
    { key: "all", label: "All" },
    { key: "add", label: "Add ✅" },
    { key: "skip", label: "Skip ❌" },
    { key: "consolidate", label: "Consolidate 🔄" },
    { key: "entered", label: "Entered 📈" },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "signals", label: "Signal Feed" },
    { key: "theses", label: "Trade Theses" },
    { key: "portfolio", label: "Portfolio Map" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mission Control</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Finance</h1>
          </div>
          {activeTab === "signals" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-indigo-500 hover:text-white"
            >
              + Add Signal
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition rounded-t-lg border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-300 bg-indigo-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Signal Feed Tab ── */}
        {activeTab === "signals" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex gap-1">
                {signalFilterButtons.map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setSignalFilter(btn.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] transition border ${
                      signalFilter === btn.key
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search signals or tickers..."
                value={signalSearch}
                onChange={(e) => setSignalSearch(e.target.value)}
                className="flex-1 min-w-[200px] rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div>
                {signalsLoading ? (
                  <div className="text-sm text-slate-500">Loading signals...</div>
                ) : filteredSignals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
                    <p className="text-slate-400">No signals found.</p>
                    <p className="mt-1 text-xs text-slate-600">Try changing filters or add a new signal.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredSignals.map((signal) => (
                      <SignalCard
                        key={signal.id}
                        signal={signal}
                        isSelected={selectedTicker === signal.ticker}
                        onClick={() => setSelectedTicker(selectedTicker === signal.ticker ? null : signal.ticker)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                {selectedTicker ? (
                  <div className="sticky top-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Ticker Detail</p>
                      <button onClick={() => setSelectedTicker(null)} className="text-xs text-slate-500 hover:text-slate-300">✕ Close</button>
                    </div>
                    <TickerDetailPanel ticker={selectedTicker} allSignals={signals} />
                  </div>
                ) : (
                  <div className="sticky top-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
                    <p className="text-sm text-slate-500">Click any signal to see ticker details</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Trade Theses Tab ── */}
        {activeTab === "theses" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex gap-1 flex-wrap">
                {thesisFilterButtons.map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setThesisFilter(btn.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] transition border ${
                      thesisFilter === btn.key
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search theses..."
                value={thesisSearch}
                onChange={(e) => setThesisSearch(e.target.value)}
                className="flex-1 min-w-[200px] rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {thesesLoading ? (
              <div className="text-sm text-slate-500">Loading theses...</div>
            ) : filteredTheses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
                <p className="text-slate-400">No theses found.</p>
                <p className="mt-1 text-xs text-slate-600">Try changing the filter or check back after seeding.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredTheses.map((thesis) => (
                  <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onStatusUpdate={handleThesisStatusUpdate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Portfolio Map Tab ── */}
        {activeTab === "portfolio" && <PortfolioMap />}
      </section>

      {showAddModal && (
        <AddSignalModal
          onClose={() => setShowAddModal(false)}
          onAdded={(s) => {
            setSignals((prev) => [s, ...prev]);
            setSelectedTicker(s.ticker);
          }}
        />
      )}
    </main>
  );
}
