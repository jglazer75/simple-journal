"use server";

import type { ReactNode } from "react";
import { EntryType } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EntryDetailPageProps = {
  params: {
    id: string;
  };
};

const DETAIL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
});

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { id: params.id, userId },
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
    <div className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-soft)] md:px-10 md:py-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-[#4b5a7a] transition hover:-translate-y-0.5"
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
          <div className="space-y-3 rounded-2xl border border-[#d9e3ff] bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5360a7]">
              Creative prompt
            </p>
            <p className="text-sm text-[#2b3050]">{entry.creativePrompt.promptText}</p>
            {personaList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {personaList.map((persona) => (
                  <span
                    key={`${persona.id ?? persona.name}`}
                    className="rounded-full bg-[#eef2fe] px-3 py-1 text-xs font-semibold text-[#4b5a7a]"
                  >
                    {persona.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="space-y-4 rounded-[28px] border border-black/10 bg-white px-5 py-6 text-[#2a2520]">
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
    <div className="rounded-2xl border border-[#dad2c6] bg-[#fefbf6] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
        {title}
      </p>
      <p className="mt-2 text-base leading-relaxed text-[var(--foreground)]">{children}</p>
    </div>
  );
}

type MarkdownViewProps = {
  content: string;
};

function MarkdownView({ content }: MarkdownViewProps) {
  const nodes = parseMarkdown(content);
  return (
    <div className="space-y-4 text-[var(--foreground)]">
      {nodes.length > 0 ? nodes : <p className="text-[var(--muted)]">—</p>}
    </div>
  );
}

function parseMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let keyCount = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={`list-${keyCount++}`} className="list-disc pl-5 text-base leading-relaxed">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${keyCount++}`} className="text-lg font-semibold">
          {formatInline(trimmed.slice(4).trim())}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`h2-${keyCount++}`} className="text-xl font-semibold">
          {formatInline(trimmed.slice(3).trim())}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={`h1-${keyCount++}`} className="text-2xl font-semibold">
          {formatInline(trimmed.slice(2).trim())}
        </h1>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[-*]\s+/, "");
      listItems.push(
        <li key={`li-${keyCount++}`} className="leading-relaxed">
          {formatInline(itemContent)}
        </li>,
      );
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${keyCount++}`} className="leading-relaxed">
        {formatInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return blocks;
}

function formatInline(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`bold-${key++}`}>{token.slice(2, token.length - 2)}</strong>,
      );
    } else if (token.startsWith("_") || token.startsWith("*")) {
      nodes.push(<em key={`italic-${key++}`}>{token.slice(1, token.length - 1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`code-${key++}`}
          className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs text-[var(--foreground)]"
        >
          {token.slice(1, token.length - 1)}
        </code>,
      );
    } else {
      nodes.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
