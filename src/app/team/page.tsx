const team = [
  {
    name: "Scout",
    role: "Market Research Analyst",
    description: "Finds winning niches, tracks competitors, spots trends before they peak.",
    skills: ["Research", "Trends", "Intel"]
  },
  {
    name: "Quill",
    role: "Content Strategist",
    description: "Drafts book outlines, ad copy, author briefs, and blurbs. Words that sell.",
    skills: ["Writing", "Strategy", "Voice"]
  },
  {
    name: "Pixel",
    role: "Ad Creative Director",
    description: "Generates FB ad creatives, book cover concepts, and visual mockups.",
    skills: ["Visual", "FB Ads", "Creative"]
  },
  {
    name: "Echo",
    role: "Launch Manager",
    description: "Orchestrates book launches, manages ad campaigns, tracks ROAS.",
    skills: ["Launches", "Ads", "Analytics"]
  }
];

const tagClass = "rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300";

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 pb-16">
      <section className="pt-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-8 py-4 text-center italic text-slate-200">
          An autonomous organization of AI agents that does work for me and produces value 24/7
        </div>
      </section>

      <section className="pt-10">
        <h1 className="text-center text-4xl font-bold">Meet the Team</h1>
        <p className="mt-2 text-center text-slate-400">AI agents, each with a real role.</p>
      </section>

      <section className="pt-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-indigo-500/30 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Samantha</h2>
              <p className="mt-1 text-sm text-slate-400">Chief of Staff</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Orchestrates, delegates, keeps everything moving. First point of contact between Rui and the machine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Orchestration", "Strategy", "Memory"].map((skill) => (
              <span key={skill} className={tagClass}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-10">
        <div className="mx-auto flex max-w-4xl items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>INPUT SIGNAL</span>
          <div className="h-px flex-1 bg-slate-800" />
          <span>OUTPUT ACTION</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </section>

      <section className="pt-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => (
            <div key={member.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-lg font-semibold">{member.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{member.role}</p>
              <p className="mt-3 text-sm text-slate-300">{member.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <span key={skill} className={tagClass}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-10">
        <div className="mx-auto flex max-w-4xl items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>META LAYER</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </section>

      <section className="pt-8">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <h3 className="text-xl font-semibold">Rex</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Lead Engineer</p>
          <p className="mt-3 text-sm text-slate-300">
            Builds tools, automation pipelines, and the technical infrastructure that makes everything run.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Code", "Automation", "Systems"].map((skill) => (
              <span key={skill} className={tagClass}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
