import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { EntryType } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const ENTRY_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
});

type EntriesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type EntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: {
    gratitudePrompt: true;
    creativePrompt: true;
  };
}>;

const ENTRY_EMOJI: Record<EntryType, string> = {
  [EntryType.ANGER]: "🤬",
  [EntryType.GRATITUDE]: "🥰",
  [EntryType.CREATIVE]: "✍️",
};

export const dynamic = "force-dynamic";

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const pageParam = toNumberParam(searchParams?.page);
  const currentPage = Math.max(1, pageParam ?? 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      include: {
        gratitudePrompt: true,
        creativePrompt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.journalEntry.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-[var(--background)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_55%)] px-4 py-10 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-soft)] md:px-10 md:py-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5"
          >
            ← Back to journal
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Entries archive
          </p>
        </div>

        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">
            All saved entries
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Page {currentPage} of {totalPages} · Showing{" "}
            {total === 0 ? "0 entries" : `${rangeStart}–${rangeEnd} of ${total}`}
          </p>
        </header>

        <ArchiveList entries={entries} />

        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          hasEntries={entries.length > 0}
        />
      </main>
    </div>
  );
}

function ArchiveList({ entries }: { entries: EntryWithRelations[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center text-sm text-[var(--muted)]">
        No journal entries saved yet.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const emoji = ENTRY_EMOJI[entry.entryType] ?? "📝";
        return (
          <li key={entry.id}>
            <Link
              href={`/entries/${entry.id}`}
              className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 md:flex-row md:items-center md:justify-between"
            >
              <div className="text-base font-semibold text-slate-900">
                {emoji} {entry.title}
              </div>
              <p className="text-sm text-slate-600 md:flex-1 md:px-4">{entrySnippet(entry)}</p>
              <div className="flex items-center gap-3 text-xs font-semibold text-indigo-600">
                <span className="uppercase tracking-wide text-slate-500">
                  {ENTRY_TIME_FORMATTER.format(entry.createdAt)}
                </span>
                <span className="text-indigo-600 group-hover:text-indigo-800">Open →</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  hasEntries,
}: {
  currentPage: number;
  totalPages: number;
  hasEntries: boolean;
}) {
  if (!hasEntries) {
    return null;
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700">
      <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
        Navigate archive
      </div>
      <div className="flex flex-wrap gap-2">
        <PageButton label="← Previous" page={prevPage} disabled={!prevPage} />
        <PageButton label="Next →" page={nextPage} disabled={!nextPage} />
      </div>
    </div>
  );
}

function PageButton({
  label,
  page,
  disabled,
}: {
  label: string;
  page: number | null;
  disabled: boolean;
}) {
  if (disabled || !page) {
    return (
      <span className="rounded-full bg-slate-200 px-4 py-2 text-slate-500">
        {label}
      </span>
    );
  }

  const targetHref =
    page > 1
      ? {
          pathname: "/entries" as const,
          query: { page: page.toString() },
        }
      : {
          pathname: "/entries" as const,
        };

  return (
    <Link
      href={targetHref}
      className="rounded-full bg-indigo-600 px-4 py-2 text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700"
    >
      {label}
    </Link>
  );
}

function entrySnippet(entry: EntryWithRelations) {
  const trimmed = entry.bodyMarkdown?.trim() ?? "";
  if (trimmed.length > 0) {
    return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
  }
  if (entry.entryType === EntryType.ANGER && entry.angerReason) {
    return entry.angerReason;
  }
  if (entry.entryType === EntryType.GRATITUDE && entry.gratitudePrompt?.promptText) {
    return entry.gratitudePrompt.promptText;
  }
  if (entry.entryType === EntryType.CREATIVE && entry.creativePrompt?.promptText) {
    return entry.creativePrompt.promptText;
  }
  return "—";
}

function toNumberParam(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) {
    return toNumberParam(value[0]);
  }
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
