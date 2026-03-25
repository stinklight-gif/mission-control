"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type ResearchRecord = {
  id: string;
  title: string;
  slug: string;
  topic_tags: string[];
  prompt: string | null;
  model_used: string | null;
  source_date: string;
  findings_summary: string | null;
  full_text: string | null;
  word_count: number;
  relevance_score: number;
  status: string;
  file_path: string | null;
  created_at: string;
  updated_at: string;
};

const statusOptions = ["all", "fresh", "stale", "archived"] as const;

const statusColors: Record<string, string> = {
  fresh: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  stale: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  archived: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const tagColors = [
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
];

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RelevanceStars({ score, onChange }: { score: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onChange(i + 1);
          }}
          className={`text-xs transition ${
            i < score ? "text-amber-400" : "text-slate-700"
          } hover:text-amber-300`}
        >
          ★
        </button>
      ))}
      <span className="ml-1 text-xs text-slate-500">{score}/10</span>
    </div>
  );
}

export default function ResearchPage() {
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createSupabaseClient(url, key, { auth: { persistSession: true } });
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    supabase
      .from("research_library")
      .select("*")
      .order("source_date", { ascending: false })
      .then(({ data }) => {
        setRecords((data ?? []) as ResearchRecord[]);
        setIsLoading(false);
      });
  }, [supabase]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    records.forEach((r) => r.topic_tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (tagFilter && !(r.topic_tags || []).includes(tagFilter)) return false;
      if (q) {
        const haystack = `${r.title} ${r.findings_summary || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, tagFilter, search]);

  async function updateRecord(id: string, updates: Partial<ResearchRecord>) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("research_library")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? (data as ResearchRecord) : r))
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">📚 Research Library</h1>
          <p className="mt-1 text-sm text-slate-400">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Status pills */}
          <div className="flex gap-2">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                  statusFilter === s
                    ? "border-slate-200 text-slate-100"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-600"
            >
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or summary..."
            className="ml-auto rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-600 w-64"
          />
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading research...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No research entries found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border transition ${
                    isExpanded
                      ? "border-slate-600 bg-slate-900/70 md:col-span-2"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  }`}
                >
                  {/* Card header - clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full px-4 py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-100 leading-tight">
                        {r.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          statusColors[r.status] || statusColors.archived
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    {/* Tags */}
                    {r.topic_tags && r.topic_tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.topic_tags.map((tag, i) => (
                          <span
                            key={tag}
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              tagColors[i % tagColors.length]
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{formatDate(r.source_date)}</span>
                      <span>{formatRelativeTime(r.updated_at)}</span>
                      <span>{r.word_count.toLocaleString()} words</span>
                    </div>

                    {/* Relevance */}
                    <div className="mt-2">
                      <RelevanceStars
                        score={r.relevance_score}
                        onChange={(n) => updateRecord(r.id, { relevance_score: n })}
                      />
                    </div>

                    {/* Summary */}
                    {!isExpanded && r.findings_summary && (
                      <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {r.findings_summary.slice(0, 200)}
                        {(r.findings_summary?.length ?? 0) > 200 ? "…" : ""}
                      </p>
                    )}
                  </button>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 border-t border-slate-800/50 px-4 py-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-1">
                      Status:
                    </span>
                    {(["fresh", "stale", "archived"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateRecord(r.id, { status: s })}
                        className={`rounded-full px-2 py-0.5 text-[10px] capitalize transition border ${
                          r.status === s
                            ? statusColors[s]
                            : "border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Expanded full text */}
                  {isExpanded && r.full_text && (
                    <div className="border-t border-slate-800/50 px-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                        {r.full_text.split("\n").map((line, i) => {
                          if (line.startsWith("# "))
                            return (
                              <h1 key={i} className="text-xl font-bold text-slate-100 mt-4 mb-2">
                                {line.replace(/^#\s+/, "")}
                              </h1>
                            );
                          if (line.startsWith("## "))
                            return (
                              <h2 key={i} className="text-lg font-semibold text-slate-100 mt-4 mb-1">
                                {line.replace(/^##\s+/, "")}
                              </h2>
                            );
                          if (line.startsWith("### "))
                            return (
                              <h3 key={i} className="text-base font-semibold text-slate-200 mt-3 mb-1">
                                {line.replace(/^###\s+/, "")}
                              </h3>
                            );
                          if (line.startsWith("**") && line.endsWith("**"))
                            return (
                              <p key={i} className="font-semibold text-slate-200 mt-2">
                                {line.replace(/\*\*/g, "")}
                              </p>
                            );
                          if (line.startsWith("- "))
                            return (
                              <li key={i} className="ml-4 list-disc text-slate-300">
                                {line.replace(/^-\s+/, "")}
                              </li>
                            );
                          if (line.trim() === "") return <br key={i} />;
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
