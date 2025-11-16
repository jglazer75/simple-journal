"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TabId = "anger" | "gratitude" | "creative";
type EntryTypeValue = "ANGER" | "GRATITUDE" | "CREATIVE";
type JournalEntryDto = {
  id: string;
  title: string;
  entryType: EntryTypeValue;
  bodyMarkdown: string;
  createdAt: string;
  angerReason?: string | null;
  gratitudePromptId?: string | null;
  creativePromptId?: string | null;
};

const TABS: { id: TabId; label: string; description: string }[] = [
  {
    id: "anger",
    label: "🤬 Anger",
    description: "Guided, ultra-fast release.",
  },
  {
    id: "gratitude",
    label: "🥰 Gratitude",
    description: "One joyful reflection at a time.",
  },
  {
    id: "creative",
    label: "✍️ Creative",
    description: "Markdown stories + AI prompts.",
  },
];

const GRATITUDE_PROMPTS = [
  "What small kindness did someone offer recently?",
  "Name a routine that quietly improves your day.",
  "Recall a time you felt seen or heard this week.",
  "What detail about your space feels comforting right now?",
];

const CREATIVE_PERSONAS = [
  { id: "mythic", name: "Mythic Sage", description: "Dreamlike folklore tone." },
  { id: "noir", name: "Noir Detective", description: "Gritty internal monologue." },
  { id: "sci", name: "Soft Sci-Fi", description: "Hopeful future vignette." },
  { id: "memoir", name: "Memoirist", description: "Grounded, sensory memories." },
];

const ENTRY_EMOJI_BY_TYPE: Record<EntryTypeValue, string> = {
  ANGER: "🤬",
  GRATITUDE: "🥰",
  CREATIVE: "✍️",
};

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type AuthState = {
  loading: boolean;
  authenticated: boolean;
  hasPasscode: boolean;
  error?: string | null;
};

type EntryFormProps = {
  onEntrySaved: () => void;
};

type FormStatus = {
  message: string;
  tone: "success" | "error";
};

type CreateEntryPayload = {
  entryType: TabId;
  bodyMarkdown?: string;
  angerReason?: string | null;
  gratitudePromptId?: string | null;
  creativePromptId?: string | null;
};

async function createEntry(payload: CreateEntryPayload): Promise<JournalEntryDto> {
  const response = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    entry?: JournalEntryDto;
    error?: string;
  };

  if (!response.ok || !data.entry) {
    throw new Error(data.error ?? "Unable to save entry.");
  }

  return data.entry;
}

function StatusBanner({ status }: { status: FormStatus | null }) {
  if (!status) return null;

  const toneClasses =
    status.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses}`}>
      {status.message}
    </div>
  );
}

function formatEntryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return HISTORY_DATE_FORMATTER.format(date);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("anger");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    hasPasscode: false,
    error: null,
  });

  const loadAuth = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/auth/status", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to check session.");
      }
      const data = (await response.json()) as {
        authenticated: boolean;
        hasPasscode: boolean;
      };
      setAuthState({
        loading: false,
        authenticated: data.authenticated,
        hasPasscode: data.hasPasscode,
        error: null,
      });
    } catch (error) {
      setAuthState({
        loading: false,
        authenticated: false,
        hasPasscode: false,
        error: error instanceof Error ? error.message : "Failed to load session.",
      });
    }
  }, []);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  const handleAuthenticated = useCallback(() => {
    setAuthState({
      loading: false,
      authenticated: true,
      hasPasscode: true,
      error: null,
    });
  }, []);

  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-slate-700">
        <div className="rounded-3xl border border-black/10 bg-white/90 px-10 py-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Checking passcode
          </p>
          <p className="mt-3 text-lg text-slate-700">
            Hang tight while we confirm your private session.
          </p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <PasscodeGate
        hasPasscode={authState.hasPasscode}
        onAuthenticated={handleAuthenticated}
        statusError={authState.error}
        refetchStatus={loadAuth}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[32px] bg-white/85 px-6 py-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-md md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            simple journal
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-4xl">
            Capture anger, gratitude, and creative sparks without leaving the
            tailnet.
          </h1>
          <p className="text-base text-slate-600 md:text-lg">
            Local passcode lock. Auto-titled entries. Markdown-friendly creative
            space backed by your private Ollama models.
          </p>
        </header>

        <nav className="flex flex-wrap gap-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 min-w-[180px] flex-col rounded-2xl border px-4 py-3 text-left transition-all ${
                activeTab === tab.id
                  ? "border-transparent bg-[var(--foreground)]/90 text-white shadow-lg shadow-[var(--foreground)]/20"
                  : "border-black/10 bg-white/70 text-slate-800 hover:border-black/30"
              }`}
            >
              <span className="text-base font-semibold">{tab.label}</span>
              <span
                className={`text-sm md:text-xs ${
                  activeTab === tab.id ? "text-white/80" : "text-slate-500"
                }`}
              >
                {tab.description}
              </span>
            </button>
          ))}
        </nav>

        <section>
          {activeTab === "anger" && (
            <AngerEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
          {activeTab === "gratitude" && (
            <GratitudeEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
          {activeTab === "creative" && (
            <CreativeEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
        </section>

        <HistoryPreview refreshKey={historyRefresh} />
      </main>
    </div>
  );
}

function AngerEntry({ onEntrySaved }: EntryFormProps) {
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "anger",
        bodyMarkdown: body,
        angerReason: reason,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setReason("");
      setBody("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save anger entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-orange-50"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Guided prompt
        </p>
        <p className="text-xl font-medium italic text-slate-800">
          “I am angry because I care about...”
        </p>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">
          Fill in the blank
        </span>
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="my boundaries being ignored"
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-lg font-medium text-slate-900 outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">
          Expand the feeling
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          placeholder="Let it all out in the long-form box..."
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20"
        />
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Press <span className="font-semibold">A</span> to save once keyboard shortcuts ship.</p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--accent-strong)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-strong)]/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save anger entry"}
        </button>
      </div>
    </form>
  );
}

function GratitudeEntry({ onEntrySaved }: EntryFormProps) {
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * GRATITUDE_PROMPTS.length),
  );
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const promptText = GRATITUDE_PROMPTS[promptIndex];

  const cyclePrompt = () => {
    setPromptIndex((current) => {
      const next = (current + 1) % GRATITUDE_PROMPTS.length;
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "gratitude",
        bodyMarkdown: reflection,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setReflection("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save gratitude entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-yellow-50"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Random prompt
          </p>
          <p className="text-2xl font-semibold text-slate-900">{promptText}</p>
        </div>
        <button
          type="button"
          onClick={cyclePrompt}
          className="self-start rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/30 hover:bg-white"
        >
          New prompt
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">
          Reflection
        </span>
        <textarea
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          rows={5}
          placeholder="Jot down a few warm sentences…"
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>100 curated prompts seed the DB later. This is a local preview.</p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-[var(--accent)]/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save gratitude entry"}
        </button>
      </div>
    </form>
  );
}

function CreativeEntry({ onEntrySaved }: EntryFormProps) {
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([
    CREATIVE_PERSONAS[0]?.id ?? "",
  ]);
  const [prompt, setPrompt] = useState(
    "Tap “Generate prompt” to ask the internal Ollama instance for a tailored idea.",
  );
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const togglePersona = (id: string) => {
    setSelectedPersonas((current) =>
      current.includes(id)
        ? current.filter((persona) => persona !== id)
        : [...current, id],
    );
  };

  const personaSummary = useMemo(() => {
    return CREATIVE_PERSONAS.filter((persona) =>
      selectedPersonas.includes(persona.id),
    )
      .map((persona) => persona.name)
      .join(", ");
  }, [selectedPersonas]);

  const generatePrompt = () => {
    setPrompt(
      `Ollama → “${personaSummary || "Choose personas"}” persona mix\n` +
        "Output will appear here before saving to creative_prompts.",
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "creative",
        bodyMarkdown: body,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setBody("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save creative entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-purple-50"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Personas
        </p>
        <div className="flex flex-wrap gap-3">
          {CREATIVE_PERSONAS.map((persona) => {
            const isActive = selectedPersonas.includes(persona.id);
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => togglePersona(persona.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-transparent bg-slate-900 text-white shadow-md shadow-slate-900/40"
                    : "border-black/10 bg-white text-slate-700 hover:border-black/30"
                }`}
              >
                <p className="text-sm font-semibold">{persona.name}</p>
                <p className="text-xs text-slate-500">{persona.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-black/15 bg-slate-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          AI prompt preview
        </p>
        <p className="whitespace-pre-line text-base text-slate-800">{prompt}</p>
        <button
          type="button"
          onClick={generatePrompt}
          className="self-start rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-black/30"
        >
          Generate prompt
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">
          Markdown draft
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          placeholder="## Let ideas breathe\n\nWrite long-form entries with full Markdown support soon."
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
        />
      </label>

      <StatusBanner status={status} />
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>
          Entries will be titled automatically (<span className="font-semibold">✍️ 00X</span>).
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save creative entry"}
        </button>
      </div>
    </form>
  );
}

type HistoryPreviewProps = {
  refreshKey: number;
};

function HistoryPreview({ refreshKey }: HistoryPreviewProps) {
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/entries?page=1&pageSize=5", {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 401) {
        setEntries([]);
        setError("Unlock your journal to view history.");
        return;
      }
      if (!response.ok) {
        throw new Error("Unable to load entries.");
      }
      const data = (await response.json()) as {
        entries: JournalEntryDto[];
      };
      setEntries(data.entries ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading history.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, refreshKey]);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <p className="text-sm text-white/70">Loading recent entries…</p>
    );
  } else if (error) {
    content = (
      <div className="rounded-2xl border border-red-300 bg-red-50/20 px-4 py-3 text-sm text-red-100">
        {error}
      </div>
    );
  } else if (entries.length === 0) {
    content = (
      <p className="text-sm text-white/70">
        Entries you save will appear here. Start with a quick anger release.
      </p>
    );
  } else {
    content = (
      <ul className="space-y-4">
        {entries.map((entry) => {
          const emoji = ENTRY_EMOJI_BY_TYPE[entry.entryType] ?? "📝";
          const trimmed = entry.bodyMarkdown?.trim() ?? "";
          let snippet: string;
          if (trimmed.length > 0) {
            snippet = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
          } else if (entry.entryType === "ANGER" && entry.angerReason) {
            snippet = entry.angerReason;
          } else {
            snippet = "—";
          }
          return (
            <li
              key={entry.id}
              className="flex flex-col gap-1 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between"
            >
              <div className="font-semibold text-white">
                {emoji} {entry.title}
              </div>
              <p className="text-white/70">{snippet}</p>
              <span className="text-xs uppercase tracking-wide text-white/60">
                {formatEntryTimestamp(entry.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-slate-900/95 p-6 text-white shadow-2xl shadow-slate-900/40">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Recent entries
          </p>
          <h2 className="text-2xl font-semibold">History snapshot</h2>
          <p className="text-sm text-white/70">
            The five most recent thoughts across anger, gratitude, and creative.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchHistory();
          }}
          className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6">{content}</div>
    </section>
  );
}

type PasscodeGateProps = {
  hasPasscode: boolean;
  onAuthenticated: () => void;
  statusError?: string | null;
  refetchStatus: () => Promise<void>;
};

function PasscodeGate({
  hasPasscode,
  onAuthenticated,
  statusError,
  refetchStatus,
}: PasscodeGateProps) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [mode, setMode] = useState<"set" | "verify">(hasPasscode ? "verify" : "set");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(hasPasscode ? "verify" : "set");
  }, [hasPasscode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!passcode) {
      setError("Enter your passcode.");
      return;
    }

    if (mode === "set" && passcode !== confirmPasscode) {
      setError("Passcodes must match.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = mode === "set" ? "/api/auth/set" : "/api/auth/verify";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to process passcode.");
        if (response.status === 409) {
          await refetchStatus();
        }
        return;
      }

      setSuccessMessage("Session unlocked. Redirecting…");
      setPasscode("");
      setConfirmPasscode("");
      onAuthenticated();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unexpected error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-[32px] border border-black/10 bg-white/95 px-8 py-10 text-slate-900 shadow-2xl shadow-[var(--foreground)]/5"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            {hasPasscode ? "Enter passcode" : "Set a passcode"}
          </p>
          <h1 className="text-3xl font-semibold">
            {hasPasscode
              ? "Unlock Simple Journal"
              : "Secure your journal before writing"}
          </h1>
          <p className="text-sm text-slate-600">
            {hasPasscode
              ? "Your entries stay local to this device. Enter your secret to continue."
              : "Create a simple PIN or phrase. It never leaves your Postgres instance."}
          </p>
        </div>

        {statusError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {statusError}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">
              {hasPasscode ? "Passcode" : "Create passcode"}
            </span>
            <input
              type="password"
              value={passcode}
              autoFocus
              onChange={(event) => setPasscode(event.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20"
              placeholder={hasPasscode ? "Enter your passcode" : "Choose a secret phrase"}
            />
          </label>

          {!hasPasscode ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-600">
                Confirm passcode
              </span>
              <input
                type="password"
                value={confirmPasscode}
                onChange={(event) => setConfirmPasscode(event.target.value)}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Enter again to confirm"
              />
            </label>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[var(--foreground)] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-[var(--foreground)]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Working..."
            : hasPasscode
              ? "Unlock journal"
              : "Save passcode"}
        </button>
      </form>
    </div>
  );
}
