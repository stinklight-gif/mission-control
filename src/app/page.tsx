import { UserButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  waiting_on?: string;
  due_date?: string;
};

type HeatMap = Record<string, number>;

type StockRecommendation = {
  id: string;
  date: string;
  tickers: string[];
  heat_map: HeatMap | null;
  new_picks: unknown;
  summary: string;
  raw_data?: unknown | null;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function normalizeHeatMap(heatMap: HeatMap | null): [string, number][] {
  if (!heatMap) return [];
  return Object.entries(heatMap).sort((a, b) => b[1] - a[1]);
}

type Pick = { ticker: string; thesis?: string; action?: string };

function normalizeNewPicks(newPicks: unknown): Pick[] {
  if (!newPicks) return [];
  if (Array.isArray(newPicks)) {
    return newPicks.map((p) => {
      if (typeof p === "object" && p !== null) {
        const obj = p as Record<string, unknown>;
        return {
          ticker: String(obj.ticker || obj.name || "?"),
          thesis: String(obj.thesis || obj.catalyst || obj.note || ""),
          action: String(obj.action || "BUY"),
        };
      }
      return { ticker: String(p) };
    });
  }
  return [];
}

function heatBadgeClass(count: number) {
  if (count >= 3) return "bg-red-500/20 text-red-200 border-red-500/40";
  if (count === 2) return "bg-orange-500/20 text-orange-200 border-orange-500/40";
  return "bg-yellow-400/20 text-yellow-200 border-yellow-400/40";
}

export default async function Home() {
  const supabase = createClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startDateString = startDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("stock_recommendations")
    .select("id, date, tickers, heat_map, new_picks, summary, raw_data, created_at")
    .gte("date", startDateString)
    .order("date", { ascending: false });

  if (error) console.error("Supabase error:", error.message);

  const records = (data ?? []) as StockRecommendation[];

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "done")
    .order("priority", { ascending: true });

  const tasks = (tasksData ?? []) as Task[];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Market Ops
            </p>
            <h1 className="text-2xl font-semibold">Mission Control</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <p className="mt-3 text-sm text-slate-400 italic">
          An autonomous organization of AI agents that does work for me and produces value 24/7
        </p>
      </header>

      {/* Tasks & Blockers */}
      <section className="mx-auto w-full max-w-5xl px-6 pt-8">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">Tasks & Blockers</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No open tasks.</p>
          ) : (
            tasks.map((task) => {
              const isBlocked = task.status === "blocked";
              const isHigh = task.priority === "high";
              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 ${
                    isBlocked
                      ? "border-red-500/30 bg-red-950/20"
                      : isHigh
                      ? "border-orange-500/20 bg-slate-900/60"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-5 text-slate-100">{task.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${
                      isBlocked ? "bg-red-500/20 text-red-300" :
                      task.status === "in_progress" ? "bg-blue-500/20 text-blue-300" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {isBlocked ? "🚫 Blocked" : task.status === "in_progress" ? "In Progress" : "To Do"}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-2 text-xs leading-5 text-slate-400">{task.description}</p>
                  )}
                  {task.waiting_on && (
                    <p className="mt-2 text-xs text-red-400">⏳ Waiting on: {task.waiting_on}</p>
                  )}
                  {task.due_date && (
                    <p className="mt-1 text-xs text-slate-500">Due: {new Date(task.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Stock Feed */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400">📈 Daily Stock Picks</h2>
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
            <h2 className="text-xl font-semibold">No recommendations yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Once you load data into Supabase, the last 7 days of summaries will
              appear here.
            </p>
          </div>
        ) : (
          records.map((record) => {
            const heatEntries = normalizeHeatMap(record.heat_map);
            const newPicks = normalizeNewPicks(record.new_picks);

            return (
              <article
                key={record.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {formatDate(record.date)}
                      </p>
                      <h2 className="text-lg font-semibold text-slate-100">
                        Daily Briefing
                      </h2>
                    </div>
                    <div className="rounded-full border border-slate-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {record.tickers.join(", ")}
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-200">
                    {record.summary}
                  </p>

                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Heat Map
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {heatEntries.length === 0 ? (
                          <span className="text-sm text-slate-500">
                            No heat data
                          </span>
                        ) : (
                          heatEntries.map(([ticker, count]) => (
                            <span
                              key={ticker}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${heatBadgeClass(
                                count
                              )}`}
                            >
                              {ticker} · {count}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        New Picks
                      </p>
                      <ul className="mt-3 grid gap-2">
                        {newPicks.length === 0 ? (
                          <li className="text-sm text-slate-500">
                            No new picks
                          </li>
                        ) : (
                          newPicks.map((pick, i) => (
                            <li
                              key={i}
                              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                            >
                              <span className="font-semibold text-slate-100">{pick.ticker}</span>
                              {pick.action && (
                                <span className="ml-2 text-xs uppercase tracking-wider text-green-400">{pick.action}</span>
                              )}
                              {pick.thesis && (
                                <p className="mt-1 text-xs text-slate-400 leading-5">{pick.thesis}</p>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
