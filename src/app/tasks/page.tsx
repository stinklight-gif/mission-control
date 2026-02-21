import { createClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  waiting_on?: string;
  due_date?: string;
  created_at?: string;
};

type AgentActivity = {
  id: string;
  summary: string;
  detail?: string;
  category?: string;
  created_at: string;
};

const statusDot: Record<string, string> = {
  todo: "bg-slate-500",
  in_progress: "bg-blue-400",
  blocked: "bg-red-400"
};

function formatRelativeTime(value?: string) {
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

function formatDueDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const dotColor = statusDot[task.status] ?? "bg-slate-500";
  const isBlocked = task.status === "blocked";
  const createdAt = formatRelativeTime(task.created_at);
  const dueDate = formatDueDate(task.due_date);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-100">{task.title}</p>
          {task.description && (
            <p className="mt-2 text-xs leading-5 text-slate-400 max-h-10 overflow-hidden">
              {task.description}
            </p>
          )}
          {isBlocked && task.waiting_on && (
            <p className="mt-2 text-xs text-red-400">Waiting on: {task.waiting_on}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            {dueDate ? <span>Due {dueDate}</span> : <span />}
            {createdAt && <span>{createdAt}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({
  title,
  titleClass,
  tasks
}: {
  title: string;
  titleClass: string;
  tasks: Task[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm uppercase tracking-[0.2em] ${titleClass}`}>{title}</h2>
        <span className="text-xs text-slate-500">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
            No tasks yet.
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

export default async function TasksPage() {
  const supabase = createClient();

  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (tasksError) console.error("Supabase error:", tasksError.message);

  const { data: activityData, error: activityError } = await supabase
    .from("agent_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (activityError) console.error("Supabase error:", activityError.message);

  const tasks = (tasksData ?? []) as Task[];
  const activity = (activityData ?? []) as AgentActivity[];

  const blocked = tasks.filter((task) => task.status === "blocked");
  const inProgress = tasks.filter((task) => task.status === "in_progress");
  const backlog = tasks.filter((task) => task.status === "todo");
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const percentDone = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Blocked" value={`${blocked.length}`} />
          <StatCard label="In Progress" value={`${inProgress.length}`} />
          <StatCard label="Total" value={`${total}`} />
          <StatCard label="Done" value={`${percentDone}%`} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-6 lg:grid-cols-3">
            <Column title="Backlog" titleClass="text-slate-400" tasks={backlog} />
            <Column title="In Progress" titleClass="text-blue-400" tasks={inProgress} />
            <Column title="Blocked 🚫" titleClass="text-red-400" tasks={blocked} />
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-950/60 lg:border-l lg:rounded-l-none lg:pl-6 lg:pr-2">
            <div className="flex items-center justify-between border-b border-slate-800 py-4 pr-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
                Live Activity
              </h3>
              <span className="text-xs text-slate-500">{activity.length}</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto pr-4 pt-4">
              {activity.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No recent activity. Events will appear here as agents work.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-500" />
                      <div>
                        <p className="text-sm text-slate-200">{entry.summary}</p>
                        {entry.detail && (
                          <p className="mt-1 text-xs text-slate-400">
                            {entry.detail}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {formatRelativeTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
