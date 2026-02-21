export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 rounded bg-slate-700" />
              <div className="h-6 w-48 rounded bg-slate-700" />
              <div className="h-16 w-full rounded bg-slate-800" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-20 rounded bg-slate-800" />
                <div className="h-20 rounded bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
