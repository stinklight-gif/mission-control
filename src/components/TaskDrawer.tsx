"use client";

import { useEffect, useState } from "react";

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

type TaskDrawerProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
};

type TaskFormState = {
  title: string;
  description: string;
  status: string;
  priority: string;
  waiting_on: string;
  due_date: string;
};

const defaultForm: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  waiting_on: "",
  due_date: ""
};

function normalizeDate(value?: string) {
  if (!value) return "";
  if (value.length >= 10) return value.slice(0, 10);
  return value;
}

export default function TaskDrawer({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete
}: TaskDrawerProps) {
  const [form, setForm] = useState<TaskFormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title ?? "",
        description: task.description ?? "",
        status: task.status ?? "todo",
        priority: task.priority ?? "medium",
        waiting_on: task.waiting_on ?? "",
        due_date: normalizeDate(task.due_date)
      });
    } else {
      setForm(defaultForm);
    }
  }, [task, isOpen]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const canSubmit = form.title.trim().length > 0 && !isSaving && !isDeleting;
  const showWaitingOn = form.status === "blocked";

  const handleChange = (field: keyof TaskFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars");
      return;
    }

    if (!form.title.trim()) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      waiting_on: showWaitingOn ? form.waiting_on.trim() || null : null,
      due_date: form.due_date || null
    };

    setIsSaving(true);
    try {
      const isEditing = Boolean(task?.id);
      const url = isEditing
        ? `${supabaseUrl}/rest/v1/tasks?id=eq.${task?.id}`
        : `${supabaseUrl}/rest/v1/tasks`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        const message =
          typeof data?.message === "string" ? data.message : "Failed to save task";
        throw new Error(message);
      }

      const savedTask = Array.isArray(data) ? data[0] : data;
      if (savedTask) {
        onSave(savedTask as Task);
      }
    } catch (error) {
      console.error("Task save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars");
      return;
    }
    if (!confirm("Delete this task?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/tasks?id=eq.${task.id}`,
        {
          method: "DELETE",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          typeof data?.message === "string" ? data.message : "Failed to delete task";
        throw new Error(message);
      }

      onDelete(task.id);
    } catch (error) {
      console.error("Task delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close task drawer"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-96 border-l border-slate-800 bg-slate-900 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Task Details
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">
                {task?.title || "New Task"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              X
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(event) => handleChange("priority", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {showWaitingOn && (
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Waiting on
                </label>
                <input
                  type="text"
                  value={form.waiting_on}
                  onChange={(event) => handleChange("waiting_on", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Due date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(event) => handleChange("due_date", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <div className="flex items-center gap-2">
              {task?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-full border border-red-500/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
