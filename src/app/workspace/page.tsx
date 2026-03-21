import { Bot, Database, FileText, FolderKanban, FolderOpen, Sparkles } from "lucide-react";

const quickStarts = [
  {
    title: "Empty page",
    description: "Start with a blank note for research, specs, or decisions.",
    icon: FileText,
  },
  {
    title: "Empty database",
    description: "Create a table you can shape into tasks, assets, or tracking data.",
    icon: Database,
  },
  {
    title: "Build with Maddy",
    description: "Generate a structured project starter from a short brief.",
    icon: Bot,
  },
];

const templates = [
  "Tasks Tracker",
  "Sprint Board",
  "Project Brief",
  "Meeting Notes",
];

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,#151412_0%,#0f0e0d_100%)] px-6 py-10 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[30px] border border-white/10 bg-black/20 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <FolderOpen className="h-6 w-6 text-zinc-100" />
            </div>

            <div className="max-w-3xl space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                  Knowledge Base
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
                  Organize work by project spaces
                </h1>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                Use the sidebar to create a dedicated space for each project. Every space gets its
                own home page and keeps project tasks, notes, databases, and decisions separated
                from the rest of your knowledge base.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300">
                  General for loose notes
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300">
                  Spaces for project isolation
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300">
                  Add new opens templates
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-white/10 bg-[#161513] p-6">
            <div className="mb-4 flex items-center gap-3">
              <FolderKanban className="h-5 w-5 text-zinc-200" />
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">How spaces work</h2>
                <p className="text-sm text-zinc-500">A cleaner project structure for your KB.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-400">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="font-medium text-zinc-100">1. Create a space from the sidebar</p>
                <p className="mt-1">
                  Use the <span className="text-zinc-200">Space</span> action or the plus icon in
                  the Spaces header to create a project space.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="font-medium text-zinc-100">2. Add pages, databases, or starters</p>
                <p className="mt-1">
                  Each space has an <span className="text-zinc-200">Add new</span> flow for empty
                  items, Maddy-generated pages, and project templates.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="font-medium text-zinc-100">3. Keep project context isolated</p>
                <p className="mt-1">
                  Tasks, notes, and databases stay grouped under the project space instead of mixing
                  with everything else in General.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[26px] border border-white/10 bg-[#161513] p-6">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Quick starts</h2>
                  <p className="text-sm text-zinc-500">Available from Add new inside each space.</p>
                </div>
              </div>

              <div className="space-y-3">
                {quickStarts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <Icon className="h-4 w-4 text-zinc-100" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">{item.title}</p>
                        <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[#161513] p-6">
              <h2 className="text-lg font-semibold text-zinc-100">Project templates</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Ready-made starters for common project workflows.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {templates.map((template) => (
                  <span
                    key={template}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {template}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
