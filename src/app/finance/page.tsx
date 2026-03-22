"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

const SOURCES = ["Manual", "@DonDurrett", "@OriginalBraila", "@calvinfroedge", "@puppyeh1", "Buffett", "Other"];
const CATEGORIES = ["Thesis", "News", "Earnings", "Tip", "Alert"];

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
          {signal.company_name && (
            <span className="text-xs text-slate-400">{signal.company_name}</span>
          )}
          {hasPrice && (
            <span className="text-xs font-semibold text-green-400">
              ${signal.price_at_post?.toFixed(2)}
            </span>
          )}
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
    } catch (err) {
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
            <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">
              Signal Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. US leader in pesto sauce with 32% operating margins $AMNF"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
              required
            />
            {extractedTicker && (
              <p className="mt-1 text-xs text-green-400">Auto-detected: ${extractedTicker}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
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
            {latest?.price_at_post && (
              <span className="text-lg font-semibold text-green-400">${latest.price_at_post.toFixed(2)}</span>
            )}
          </div>
          {latest?.company_name && (
            <p className="text-sm text-slate-400 mt-0.5">{latest.company_name}</p>
          )}
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
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${sourceColor(s.source)}`}>
                    {s.source}
                  </span>
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

export default function FinancePage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      ),
    []
  );

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSignals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setSignals((data ?? []) as Signal[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "manual" && s.source.toLowerCase() === "manual") ||
        (filter === "twitter" && s.source.startsWith("@")) ||
        (filter === "buffett" && s.source.toLowerCase() === "buffett");
      const matchesSearch =
        !search ||
        s.raw_text.toLowerCase().includes(search.toLowerCase()) ||
        s.ticker.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [signals, filter, search]);

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "manual", label: "Manual" },
    { key: "twitter", label: "Twitter" },
    { key: "buffett", label: "Buffett" }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mission Control</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Signal Feed</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-indigo-500 hover:text-white"
          >
            + Add Signal
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] transition border ${
                  filter === btn.key
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Signal Feed */}
          <div>
            {loading ? (
              <div className="text-sm text-slate-500">Loading signals...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
                <p className="text-slate-400">No signals found.</p>
                <p className="mt-1 text-xs text-slate-600">Try changing filters or add a new signal.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    isSelected={selectedTicker === signal.ticker}
                    onClick={() =>
                      setSelectedTicker(
                        selectedTicker === signal.ticker ? null : signal.ticker
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Ticker Detail Panel */}
          <div>
            {selectedTicker ? (
              <div className="sticky top-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Ticker Detail</p>
                  <button
                    onClick={() => setSelectedTicker(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    ✕ Close
                  </button>
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
