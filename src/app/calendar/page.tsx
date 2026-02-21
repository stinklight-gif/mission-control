import { createClient } from "@/lib/supabase";

type ScheduledTask = {
  id: string;
  name: string;
  schedule_type: "cron" | "always";
  cron_human?: string | null;
  days_of_week?: string[] | null;
  time_of_day?: string | null;
  color?: string | null;
  status?: string | null;
  next_run?: string | null;
  last_run?: string | null;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const colorStyles: Record<string, { card: string; text: string; pill: string }> = {
  blue: {
    card: "border-blue-500/40 bg-blue-500/10",
    text: "text-blue-300",
    pill: "border-blue-500/40 text-blue-300"
  },
  green: {
    card: "border-emerald-500/40 bg-emerald-500/10",
    text: "text-emerald-300",
    pill: "border-emerald-500/40 text-emerald-300"
  },
  purple: {
    card: "border-purple-500/40 bg-purple-500/10",
    text: "text-purple-300",
    pill: "border-purple-500/40 text-purple-300"
  },
  orange: {
    card: "border-orange-500/40 bg-orange-500/10",
    text: "text-orange-300",
    pill: "border-orange-500/40 text-orange-300"
  },
  yellow: {
    card: "border-yellow-500/40 bg-yellow-500/10",
    text: "text-yellow-300",
    pill: "border-yellow-500/40 text-yellow-300"
  },
  red: {
    card: "border-red-500/40 bg-red-500/10",
    text: "text-red-300",
    pill: "border-red-500/40 text-red-300"
  }
};

function formatRelativeFuture(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const diffMs = time - Date.now();
  if (diffMs <= 0) return "now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `in ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `in ${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `in ${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `in ${months}mo`;

  const years = Math.floor(days / 365);
  return `in ${years}y`;
}

export default async function CalendarPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("scheduled_tasks")
    .select("*")
    .order("next_run", { ascending: true, nullsFirst: false });

  if (error) console.error("Supabase error:", error.message);

  const tasks = (data ?? []) as ScheduledTask[];
  const alwaysRunning = tasks.filter((task) => task.schedule_type === "always");
  const nextUp = tasks.filter((task) => Boolean(task.next_run));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-10">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Calendar</p>
        <h1 className="mt-2 text-3xl font-semibold">Scheduled Tasks</h1>
        <p className="mt-2 text-sm text-slate-400">Samanthas automated routines</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Always Running
            </h2>
            <span className="text-xs text-slate-500">{alwaysRunning.length}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {alwaysRunning.length === 0 ? (
              <p className="text-sm text-slate-500">No always-on routines.</p>
            ) : (
              alwaysRunning.map((task) => {
                const colorKey = (task.color ?? "").toLowerCase();
                const styles = colorStyles[colorKey] ?? {
                  card: "border-slate-700 bg-slate-800/40",
                  text: "text-slate-200",
                  pill: "border-slate-700 text-slate-200"
                };
                const label = task.cron_human ? `${task.name} * ${task.cron_human}` : task.name;
                return (
                  <span
                    key={task.id}
                    className={`rounded-full border px-3 py-1 text-xs ${styles.pill}`}
                  >
                    {label}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Weekly Grid
            </h2>
            <span className="text-xs text-slate-500">{tasks.length}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-7">
            {dayLabels.map((day) => {
              const dayTasks = tasks.filter((task) =>
                Array.isArray(task.days_of_week)
                  ? task.days_of_week.includes(day)
                  : false
              );
              return (
                <div key={day} className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{day}</p>
                  {dayTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-4 text-xs text-slate-500">
                      No tasks
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const colorKey = (task.color ?? "").toLowerCase();
                      const styles = colorStyles[colorKey] ?? {
                        card: "border-slate-700 bg-slate-800/40",
                        text: "text-slate-200",
                        pill: "border-slate-700 text-slate-200"
                      };
                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl border px-3 py-3 ${styles.card}`}
                        >
                          <p className={`text-sm font-semibold ${styles.text}`}>{task.name}</p>
                          <p className="mt-2 text-xs text-slate-300">
                            {task.time_of_day || "Time TBD"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Next Up
            </h2>
            <span className="text-xs text-slate-500">{nextUp.length}</span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {nextUp.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming runs.</p>
            ) : (
              nextUp.map((task) => {
                const colorKey = (task.color ?? "").toLowerCase();
                const styles = colorStyles[colorKey] ?? {
                  card: "border-slate-700 bg-slate-800/40",
                  text: "text-slate-200",
                  pill: "border-slate-700 text-slate-200"
                };
                const relative = formatRelativeFuture(task.next_run);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    <p className={`text-sm font-semibold ${styles.text}`}>{task.name}</p>
                    <p className="text-xs text-slate-400">{relative}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
