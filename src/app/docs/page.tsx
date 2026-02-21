"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type DocumentRecord = {
  id: string;
  title: string;
  filename: string;
  content: string;
  category: string;
  word_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

const categories = ["All", "Research", "Strategy", "Daily", "Other"];

function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const diffMs = Date.now() - time;
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

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    const supabase = createSupabaseClient(url, key, {
      auth: { persistSession: true }
    });

    supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setDocuments((data ?? []) as DocumentRecord[]);
        setIsLoading(false);
      });
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesCategory = category === "All" || doc.category === category;
      if (!matchesCategory) return false;

      if (!normalizedSearch) return true;
      return (
        doc.title.toLowerCase().includes(normalizedSearch) ||
        doc.filename.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [documents, search, category]);

  const selectedDoc = filteredDocuments.find((doc) => doc.id === selectedId) ?? null;
  const selectedDate = formatDate(selectedDoc?.updated_at || selectedDoc?.created_at || "");

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="h-screen w-80 shrink-0 border-r border-slate-800 bg-slate-950/80 px-4 py-6 sticky top-0 overflow-y-auto">
        <h1 className="text-lg font-semibold">Docs Vault</h1>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search docs"
          className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-600"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => {
            const isActive = item === category;
            return (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  isActive
                    ? "border-slate-200 text-slate-100"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading documents...</p>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-sm text-slate-500">No documents yet.</p>
          ) : (
            filteredDocuments.map((doc) => {
              const isActive = doc.id === selectedId;
              const relative = formatRelativeTime(doc.updated_at || doc.created_at);
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedId(doc.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-slate-200 bg-slate-900/70"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{doc.filename}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                      {doc.category}
                    </span>
                    <span>{relative}</span>
                    <span>{doc.word_count} words</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto p-6">
        {selectedDoc ? (
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="text-2xl font-semibold">{selectedDoc.title}</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{selectedDoc.word_count} words</span>
              <span>{selectedDoc.category}</span>
              {selectedDate ? <span>{selectedDate}</span> : null}
            </div>
            <div className="mt-6 whitespace-pre-wrap text-sm text-slate-300">
              {selectedDoc.content}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Select a document to read it
          </div>
        )}
      </section>
    </main>
  );
}
