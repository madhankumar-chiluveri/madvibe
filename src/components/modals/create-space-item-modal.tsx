"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  Database,
  FileText,
  FileUp,
  FolderKanban,
  ListTodo,
  Loader2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { CsvImportModal } from "@/components/modals/csv-import-modal";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sanitizeBlockNoteDocument } from "../../../shared/blocknote-content";
import { createProperty, updateProperty } from "@/components/database/database-utils";

interface CreateSpaceItemModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  parentId: Id<"pages"> | null;
  spaceLabel: string;
}

type TemplateId =
  | "empty_page"
  | "empty_database"
  | "import_csv"
  | "project_brief"
  | "tasks_tracker"
  | "sprint_board"
  | "meeting_notes";

interface TemplateOption {
  id: TemplateId;
  title: string;
  description: string;
  category: "quick" | "template";
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  disabled?: boolean;
}

const OPTIONS: TemplateOption[] = [
  {
    id: "empty_page",
    title: "Empty page",
    description: "Start with a blank note.",
    category: "quick",
    icon: FileText,
    accent: "from-zinc-700/40 to-zinc-800/10",
  },
  {
    id: "empty_database",
    title: "Empty database",
    description: "Start with a blank table.",
    category: "quick",
    icon: Database,
    accent: "from-slate-700/40 to-slate-800/10",
  },
  {
    id: "import_csv",
    title: "Import CSV",
    description: "Create a database from a CSV file with smart column types.",
    category: "quick",
    icon: FileUp,
    accent: "from-emerald-700/40 to-teal-900/10",
  },
  {
    id: "tasks_tracker",
    title: "Tasks Tracker",
    description: "Track status, priority, due dates, and ownership.",
    category: "template",
    icon: ListTodo,
    accent: "from-emerald-700/35 to-emerald-900/10",
  },
  {
    id: "sprint_board",
    title: "Sprint Board",
    description: "Run work through backlog, in progress, review, and done.",
    category: "template",
    icon: FolderKanban,
    accent: "from-sky-700/35 to-sky-900/10",
  },
  {
    id: "project_brief",
    title: "Project Brief",
    description: "Capture goals, scope, milestones, and risks.",
    category: "template",
    icon: Sparkles,
    accent: "from-violet-700/30 to-violet-900/10",
  },
  {
    id: "meeting_notes",
    title: "Meeting Notes",
    description: "Keep agenda, decisions, and action items in one page.",
    category: "template",
    icon: Users,
    accent: "from-rose-700/30 to-rose-900/10",
  },
];

export function CreateSpaceItemModal({
  open,
  onClose,
  workspaceId,
  parentId,
  spaceLabel,
}: CreateSpaceItemModalProps) {
  const router = useRouter();
  const createPage = useMutation(api.pages.create);
  const createDatabase = useMutation(api.databases.create);
  const replaceAllBlocks = useMutation(api.blocks.replaceAll);

  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<TemplateId | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setLoadingId(null);
    }
  }, [open]);

  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    return OPTIONS.filter((option) => {
      if (!query) return true;
      return (
        option.title.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const createDocumentPage = async (title: string, blocks?: any[]) => {
    const pageId = await createPage({
      workspaceId,
      parentId,
      type: "document",
      title,
    });

    if (blocks && blocks.length > 0) {
      await replaceAllBlocks({
        pageId,
        blocks: [
          {
            type: "document",
            content: sanitizeBlockNoteDocument(blocks),
            sortOrder: 1000,
            properties: {},
          },
        ],
      });
    }

    return pageId;
  };

  const createDatabasePage = async (title: string, properties: any[]) => {
    const pageId = await createPage({
      workspaceId,
      parentId,
      type: "database",
      title,
    });

    await createDatabase({
      pageId,
      name: title,
      properties,
    });

    return pageId;
  };

  const handleCreate = async (optionId: TemplateId) => {
    if (optionId === "import_csv") {
      onClose();
      setCsvImportOpen(true);
      return;
    }


    setLoadingId(optionId);

    try {
      let pageId: Id<"pages">;

      switch (optionId) {
        case "empty_page":
          pageId = await createDocumentPage("Untitled");
          break;
        case "empty_database":
          pageId = await createDatabasePage("Untitled Database", [createProperty("title", "Name")]);
          break;
        case "project_brief":
          pageId = await createDocumentPage("Project Brief", createProjectBriefBlocks());
          break;
        case "meeting_notes":
          pageId = await createDocumentPage("Meeting Notes", createMeetingNotesBlocks());
          break;
        case "tasks_tracker":
          pageId = await createDatabasePage("Tasks Tracker", createTasksTrackerProperties());
          break;
        case "sprint_board":
          pageId = await createDatabasePage("Sprint Board", createSprintBoardProperties());
          break;
        default:
          return;
      }

      onClose();
      router.push(`/workspace/${pageId}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not create item");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
    <CsvImportModal
      open={csvImportOpen}
      onClose={() => setCsvImportOpen(false)}
      workspaceId={workspaceId}
      parentId={parentId}
    />
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        title="Add item"
        hideTitleVisually
        className="max-w-5xl border-foreground/10 bg-card p-0 text-foreground sm:rounded-[28px]"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="mb-5 gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-left text-2xl text-foreground">
                  {`Add to ${spaceLabel}`}
                </DialogTitle>
                <DialogDescription className="mt-1 text-left text-muted-foreground">
                  Choose an empty item or a ready-made project template.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8">
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search templates"
                  className="h-11 rounded-2xl border-foreground/10 bg-foreground/[0.03] pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-foreground/15"
                />
              </div>

              <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Quick start
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {options
                    .filter((option) => option.category === "quick")
                    .map((option) => (
                      <TemplateCard
                        key={option.id}
                        option={option}
                        loading={loadingId === option.id}
                        onClick={() => handleCreate(option.id)}
                      />
                    ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Templates
                </h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {options
                    .filter((option) => option.category === "template")
                    .map((option) => (
                      <TemplateCard
                        key={option.id}
                        option={option}
                        loading={loadingId === option.id}
                        onClick={() => handleCreate(option.id)}
                      />
                    ))}
                </div>
              </section>
            </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function TemplateCard({
  option,
  loading,
  onClick,
}: {
  option: TemplateOption;
  loading: boolean;
  onClick: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={option.disabled || loading}
      className={cn(
        "group rounded-[24px] border border-foreground/10 bg-accent p-5 text-left transition",
        "hover:border-foreground/20 hover:bg-accent",
        (option.disabled || loading) && "cursor-not-allowed opacity-60"
      )}
    >
      <div
        className={cn(
          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-foreground/10 bg-gradient-to-br",
          option.accent
        )}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        ) : (
          <Icon className="h-5 w-5 text-foreground" />
        )}
      </div>

      <div className="text-lg font-semibold text-foreground">{option.title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>

      {option.disabled && (
        <p className="mt-3 text-xs text-amber-300">Add your Gemini key in Settings to use this.</p>
      )}
    </button>
  );
}

function createTextNode(text: string) {
  return [{ type: "text", text, styles: {} }];
}

function createParagraph(text: string) {
  return {
    type: "paragraph",
    content: createTextNode(text),
    children: [],
  };
}

function createHeading(text: string, level: 1 | 2 | 3 = 1) {
  return {
    type: "heading",
    props: { level },
    content: createTextNode(text),
    children: [],
  };
}

function createBullet(text: string) {
  return {
    type: "bulletListItem",
    content: createTextNode(text),
    children: [],
  };
}

function markdownToBlocks(markdown: string) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: any[] = [];

  for (const line of lines) {
    if (line.startsWith("### ")) {
      blocks.push(createHeading(line.slice(4), 3));
    } else if (line.startsWith("## ")) {
      blocks.push(createHeading(line.slice(3), 2));
    } else if (line.startsWith("# ")) {
      blocks.push(createHeading(line.slice(2), 1));
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push(createBullet(line.replace(/^[-*]\s+/, "")));
    } else if (/^\d+\.\s+/.test(line)) {
      blocks.push({
        type: "numberedListItem",
        content: createTextNode(line.replace(/^\d+\.\s+/, "")),
        children: [],
      });
    } else {
      blocks.push(createParagraph(line));
    }
  }

  return blocks;
}

function createProjectBriefBlocks(
  title = "Project Brief",
  brief = "Summarize the project, what success looks like, and why it matters."
) {
  return [
    createHeading(title, 1),
    createParagraph(brief),
    createHeading("Goals", 2),
    createBullet("What are the main outcomes this project must deliver?"),
    createBullet("How will you measure success?"),
    createHeading("Scope", 2),
    createBullet("What is included in the first version?"),
    createBullet("What is explicitly out of scope for now?"),
    createHeading("Milestones", 2),
    createBullet("Milestone 1"),
    createBullet("Milestone 2"),
    createHeading("Risks", 2),
    createBullet("Dependency or delivery risk"),
    createBullet("Unknowns or assumptions to validate"),
    createHeading("Next Actions", 2),
    createBullet("Create the task tracker for execution"),
    createBullet("Document owners, deadlines, and constraints"),
  ];
}

function createMeetingNotesBlocks() {
  return [
    createHeading("Meeting Notes", 1),
    createParagraph("Use this page to capture agenda, discussion notes, decisions, and follow-ups."),
    createHeading("Agenda", 2),
    createBullet("Topic 1"),
    createBullet("Topic 2"),
    createHeading("Notes", 2),
    createParagraph("Capture the important points from the conversation here."),
    createHeading("Decisions", 2),
    createBullet("Decision 1"),
    createHeading("Action Items", 2),
    createBullet("Owner - task - due date"),
  ];
}

function createTasksTrackerProperties() {
  return [
    createProperty("id", "S.No"),
    createProperty("title", "Task"),
    updateProperty(createProperty("select", "Assigned to"), {
      config: {
        options: [
          { id: "madhan", label: "Madhan", color: "green" },
          { id: "sanjit", label: "Sanjit", color: "blue" },
          { id: "rohit", label: "Rohit", color: "purple" },
        ],
        defaultValue: "madhan",
      },
    }),
    updateProperty(createProperty("select", "Status"), {
      config: {
        options: [
          { id: "not_started", label: "Not Started", color: "gray" },
          { id: "in_progress", label: "In Progress", color: "blue" },
          { id: "done", label: "Done", color: "green" },
          { id: "halted", label: "Halted", color: "red" },
        ],
        defaultValue: "not_started",
      },
    }),
    updateProperty(createProperty("select", "Assigned By"), {
      config: {
        options: [
          { id: "rohit", label: "Rohit", color: "purple" },
          { id: "praneeth", label: "Praneeth", color: "orange" },
        ],
        defaultValue: "rohit",
      },
    }),
    createProperty("date", "Created Date"),
    createProperty("date", "Completed Date"),
  ];
}

function createSprintBoardProperties() {
  return [
    createProperty("title", "Work Item"),
    updateProperty(createProperty("select", "Status"), {
      config: {
        options: [
          { id: "backlog", label: "Backlog", color: "gray" },
          { id: "todo", label: "To do", color: "brown" },
          { id: "doing", label: "In progress", color: "blue" },
          { id: "review", label: "Review", color: "yellow" },
          { id: "done", label: "Done", color: "green" },
        ],
      },
    }),
    updateProperty(createProperty("select", "Priority"), {
      config: {
        options: [
          { id: "p3", label: "Low", color: "gray" },
          { id: "p2", label: "Medium", color: "yellow" },
          { id: "p1", label: "High", color: "red" },
        ],
      },
    }),
    createProperty("number", "Points"),
    createProperty("text", "Owner"),
    createProperty("date", "Due"),
  ];
}
