"use server";

import type { ReactNode } from "react";
import { EntryType } from "@prisma/client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EntryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const DETAIL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
});

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId },
    include: {
      gratitudePrompt: true,
      creativePrompt: true,
    },
  });

  if (!entry) {
    notFound();
  }

  const personaList = extractPersonas(entry.creativePrompt?.personasUsed);

  return (
    <div className="min-h-screen bg-[var(--background)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_55%)] px-4 py-10 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-soft)] md:px-10 md:py-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5"
          >
            ← Back to journal
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Entry detail
          </p>
        </div>

        <header className="space-y-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            <span className="rounded-full bg-[var(--foreground)]/10 px-3 py-1 text-[var(--foreground)]">
              {entryTypeLabel(entry.entryType)}
            </span>
            {DETAIL_FORMATTER.format(entry.createdAt)}
          </p>
          <h1 className="text-3xl font-semibold">{entry.title}</h1>
        </header>

        {entry.entryType === EntryType.ANGER && entry.angerReason ? (
          <Callout title="Guided prompt">
            “I am angry because I care about {entry.angerReason}.”
          </Callout>
        ) : null}

        {entry.entryType === EntryType.GRATITUDE && entry.gratitudePrompt ? (
          <Callout title="Gratitude prompt">
            {entry.gratitudePrompt.promptText}
          </Callout>
        ) : null}

        {entry.entryType === EntryType.CREATIVE && entry.creativePrompt ? (
          <div className="space-y-3 rounded-2xl border border-indigo-100 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-700">
              Creative prompt
            </p>
            <p className="text-sm text-slate-800">{entry.creativePrompt.promptText}</p>
            {personaList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {personaList.map((persona) => (
                  <span
                    key={`${persona.id ?? persona.name}`}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                  >
                    {persona.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white px-5 py-6 text-slate-800 shadow-[0_20px_50px_rgba(41,28,21,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Entry body
          </p>
          {entry.bodyMarkdown.trim() ? (
            <MarkdownView content={entry.bodyMarkdown} />
          ) : (
            <p className="text-sm text-[var(--muted)]">No additional text recorded.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function entryTypeLabel(entryType: EntryType) {
  switch (entryType) {
    case EntryType.ANGER:
      return "Anger";
    case EntryType.GRATITUDE:
      return "Gratitude";
    case EntryType.CREATIVE:
      return "Creative";
    default:
      return entryType;
  }
}

function extractPersonas(data: unknown) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((value) => {
      if (typeof value === "object" && value !== null) {
        const possible = value as { id?: string; name?: string };
        if (typeof possible.name === "string") {
          return possible;
        }
      }
      return null;
    })
    .filter((value): value is { id?: string; name: string } => value !== null);
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-orange-50 px-5 py-4 shadow-[0_15px_35px_rgba(62,34,21,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800">
        {title}
      </p>
      <p className="mt-2 text-base leading-relaxed text-slate-800">{children}</p>
    </div>
  );
}

type MarkdownViewProps = {
  content: string;
};

const CodeBlock = ({
  inline,
  children,
  ...props
}: {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}) => {
  if (inline) {
    return (
      <code
        className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]"
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <pre className="overflow-x-auto rounded-2xl bg-slate-900 px-4 py-3">
      <code className="block font-mono text-sm leading-relaxed text-white" {...props}>
        {children}
      </code>
    </pre>
  );
};

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ ...props }) => (
    <h1 className="text-3xl font-semibold leading-tight text-slate-900" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="text-2xl font-semibold leading-tight text-slate-900" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="text-xl font-semibold text-slate-800" {...props} />
  ),
  p: ({ ...props }) => (
    <p className="leading-relaxed text-slate-800" {...props} />
  ),
  a: ({ ...props }) => (
    <a
      className="font-semibold text-indigo-600 underline decoration-dotted underline-offset-4 transition hover:text-indigo-800"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  blockquote: ({ ...props }) => (
    <blockquote
      className="rounded-2xl border-l-4 border-indigo-200 bg-indigo-50 px-4 py-3 text-base italic text-slate-700"
      {...props}
    />
  ),
  ul: ({ ...props }) => (
    <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-slate-800" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol
      className="list-decimal space-y-2 pl-6 text-base leading-relaxed text-slate-800"
      {...props}
    />
  ),
  li: ({ ...props }) => <li className="leading-relaxed text-slate-800" {...props} />,
  code: CodeBlock,
  hr: () => <hr className="border-t border-dashed border-slate-200" />,
  table: ({ ...props }) => (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  thead: ({ ...props }) => (
    <thead className="bg-[var(--background)] text-xs uppercase tracking-wide" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="px-3 py-2 font-semibold text-slate-800" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="px-3 py-2 text-slate-800" {...props} />
  ),
};

function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div className="space-y-4 text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
