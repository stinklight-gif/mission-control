import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: "planning" | "in_progress" | "blocked" | "launched" | "done" | string;
  priority: "high" | "medium" | "low" | string;
  progress?: number | null;
  launch_date?: string | null;
  repo_url?: string | null;
  color?: "blue" | "purple" | "green" | "orange" | "yellow" | "red" | string | null;
  created_at?: string | null;
};

const statusBadgeStyles: Record<string, string> = {
  planning: "border-slate-700 bg-slate-800/70 text-slate-300",
  in_progress: "border-blue-500/60 bg-blue-500/10 text-blue-300",
  blocked: "border-red-500/60 bg-red-500/10 text-red-300",
  launched: "border-green-500/60 bg-green-500/10 text-green-300",
  done: "border-slate-700 bg-slate-900 text-slate-400"
};

const colorStyles: Record<string, string> = {
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  green: "bg-green-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400"
};

const priorityBadgeStyles: Record<string, string> = {
  high: "border-red-500/50 bg-red-500/10 text-red-300",
  medium: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  low: "border-slate-700 bg-slate-900 text-slate-300"
};

function formatLaunchDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getProgress(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isLaunchingSoon(value: string | null | undefined, now: number) {
  if (!value) return false;
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return false;
  const diffMs = time - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 60;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const colorClass = colorStyles[project.color ?? ""] ?? "bg-slate-500";
  const statusClass =
    statusBadgeStyles[project.status] ?? "border-slate-700 bg-slate-900 text-slate-400";
  const priorityClass =
    priorityBadgeStyles[project.priority] ?? "border-slate-700 bg-slate-900 text-slate-300";
  const progress = getProgress(project.progress);
  const launchDate = formatLaunchDate(project.launch_date);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
          <p className="text-sm font-semibold text-slate-100">{project.name}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClass}`}
        >
          {project.status.replace(/_/g, " ")}
        </span>
      </div>

      {project.description && (
        <p className="mt-3 max-h-16 overflow-hidden text-sm leading-5 text-slate-400">
          {project.description}
        </p>
      )}

      <div className="mt-4">
        <div className="relative h-3 w-full rounded-full bg-slate-800">
          <div
            className={`h-3 rounded-full ${colorClass}`}
            style={{ width: `${progress}%` }}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-200">
            {progress}%
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span
          className={`rounded-full border px-2.5 py-1 font-semibold uppercase tracking-[0.2em] ${priorityClass}`}
        >
          {project.priority}
        </span>
        {launchDate ? <span>Launch {launchDate}</span> : null}
        {project.repo_url ? (
          <Link
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-300 transition hover:text-white"
          >
            Repo
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path d="M12.5 3a.75.75 0 000 1.5h2.19l-7.72 7.72a.75.75 0 001.06 1.06l7.72-7.72v2.19a.75.75 0 001.5 0V3.75A.75.75 0 0016.75 3h-4.25z" />
              <path d="M3.5 5.75A2.25 2.25 0 015.75 3.5h3a.75.75 0 010 1.5h-3a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-3a.75.75 0 011.5 0v3a2.25 2.25 0 01-2.25 2.25h-8.5A2.25 2.25 0 013.5 14.25v-8.5z" />
            </svg>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error.message);
  }

  const projects = (data ?? []) as Project[];
  const now = Date.now();

  const inProgressCount = projects.filter((project) => project.status === "in_progress").length;
  const blockedCount = projects.filter((project) => project.status === "blocked").length;
  const launchingSoonCount = projects.filter((project) =>
    isLaunchingSoon(project.launch_date, now)
  ).length;
  const doneCount = projects.filter((project) => project.status === "done").length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mission Control</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Projects</h1>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="In Progress" value={inProgressCount} />
          <StatCard label="Blocked" value={blockedCount} />
          <StatCard label="Launching Soon" value={launchingSoonCount} />
          <StatCard label="Done" value={doneCount} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-8">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-10 text-sm text-slate-500">
            No projects yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
