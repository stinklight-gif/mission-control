"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import TaskDrawer from "@/components/TaskDrawer";

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
  blocked: "bg-red-400",
  done: "bg-green-500"
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

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const dotColor = statusDot[task.status] ?? "bg-slate-500";
  const isBlocked = task.status === "blocked";
  const createdAt = formatRelativeTime(task.created_at);
  const dueDate = formatDueDate(task.due_date);

  return (
    <div
      className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600"
      onClick={onClick}
    >
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
  tasks,
  onTaskClick
}: {
  title: string;
  titleClass: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
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
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      ),
    []
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
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

      if (isActive) {
        setTasks((tasksData ?? []) as Task[]);
        setActivity((activityData ?? []) as AgentActivity[]);
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const blocked = tasks.filter((task) => task.status === "blocked");
  const inProgress = tasks.filter((task) => task.status === "in_progress");
  const backlog = tasks.filter((task) => task.status === "todo");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const total = tasks.length;
  const percentDone = total > 0 ? Math.round((doneTasks.length / total) * 100) : 0;

  const handleOpenNew = () => {
    setActiveTask(null);
    setDrawerOpen(true);
  };

  const handleOpenTask = (task: Task) => {
    setActiveTask(task);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setActiveTask(null);
  };

  const handleSaveTask = (saved: Task) => {
    setTasks((prev) => {
      const index = prev.findIndex((task) => task.id === saved.id);
      if (index === -1) return [saved, ...prev];
      const updated = [...prev];
      updated[index] = saved;
      return updated;
    });
    handleCloseDrawer();
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    handleCloseDrawer();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mission Control</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-100">Task Board</h1>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600 hover:text-white"
          >
            + New Task
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Blocked" value={`${blocked.length}`} />
          <StatCard label="In Progress" value={`${inProgress.length}`} />
          <StatCard label="Completed" value={`${doneTasks.length}`} />
          <StatCard label="Done" value={`${percentDone}%`} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-6 lg:grid-cols-3">
            <Column
              title="Backlog"
              titleClass="text-slate-400"
              tasks={backlog}
              onTaskClick={handleOpenTask}
            />
            <Column
              title="In Progress"
              titleClass="text-blue-400"
              tasks={inProgress}
              onTaskClick={handleOpenTask}
            />
            <Column
              title="Blocked 🚫"
              titleClass="text-red-400"
              tasks={blocked}
              onTaskClick={handleOpenTask}
            />
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

      {doneTasks.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm uppercase tracking-[0.2em] text-green-500">Completed ✅</h2>
            <span className="text-xs text-slate-500">{doneTasks.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => handleOpenTask(task)} />
            ))}
          </div>
        </section>
      )}

      <TaskDrawer
        task={activeTask}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </main>
  );
}
