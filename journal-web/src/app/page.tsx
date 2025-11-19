"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  gratitudePrompt?: {
    id: string;
    promptText: string;
  } | null;
  creativePrompt?: {
    id: string;
    promptText: string;
  } | null;
};

type GratitudePromptDto = {
  id: string;
  text: string;
};

type CreativePersonaDto = {
  id: string;
  name: string;
  description: string;
};

type CreativePromptDto = {
  id: string;
  text: string;
  personas: CreativePersonaDto[];
  fromOllama: boolean;
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

type HistoryPreviewProps = {
  refreshKey: number;
};

type HistoryMeta = {
  page: number;
  pageSize: number;
  total: number;
};

const HISTORY_PAGE_SIZE = 10;

function useShortcut(letter: string, handler: () => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === letter
      ) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handler, letter]);
}

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
    <div className="min-h-screen bg-[var(--background)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_55%)] px-4 py-12 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-[40px] border border-[var(--border-soft)] bg-[var(--surface)]/95 px-6 py-10 shadow-[var(--shadow-soft)] sm:px-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            Simple Journal
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-[40px]">
            Quiet space for anger releases, gratitude notes, and creative sparks.
          </h1>
          <p className="text-base text-[var(--muted)]">
            Minimal UI, thoughtful typography, and private Ollama prompts keep the focus on you—not the tool.
          </p>
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Setup & Tips
              <span aria-hidden>→</span>
            </Link>
          </div>
        </header>

        <nav className="flex flex-wrap gap-3 rounded-3xl border border-[var(--border-soft)] bg-[var(--panel)]/80 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-[150px] flex-1 flex-col rounded-2xl border px-4 py-3 text-left transition ${
                activeTab === tab.id
                  ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
              }`}
            >
              <span className="text-base font-semibold">{tab.label}</span>
              <span
                className={`text-sm md:text-xs ${
                  activeTab === tab.id ? "text-white/80" : "text-[var(--muted)]"
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
  const formRef = useRef<HTMLFormElement>(null);
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("a", requestSubmit);

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
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/5 bg-white/95 p-6 shadow-[0_30px_60px_rgba(23,18,12,0.05)] md:p-8"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Guided prompt
        </p>
        <p className="text-2xl font-medium leading-snug text-slate-900">
          “I am angry because I care about…”
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
        <p><span className="font-semibold">Ctrl/Cmd + Shift + A</span> saves instantly.</p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-rose-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/40 transition hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(179,84,66,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save anger entry"}
        </button>
      </div>
    </form>
  );
}

function GratitudeEntry({ onEntrySaved }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState<GratitudePromptDto | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("g", requestSubmit);

  const fetchPrompt = useCallback(async () => {
    setPromptLoading(true);
    setPromptError(null);
    try {
      const response = await fetch("/api/prompts/gratitude/random", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        prompt?: { id: string; text: string };
        error?: string;
      };
      if (!response.ok || !data.prompt) {
        throw new Error(data.error ?? "Unable to load gratitude prompt.");
      }
      setPrompt({ id: data.prompt.id, text: data.prompt.text });
    } catch (error) {
      setPrompt(null);
      setPromptError(
        error instanceof Error
          ? error.message
          : "Unexpected error loading prompt.",
      );
    } finally {
      setPromptLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrompt();
  }, [fetchPrompt]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "gratitude",
        bodyMarkdown: reflection,
        gratitudePromptId: prompt?.id,
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
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/5 bg-white/95 p-6 shadow-[0_30px_60px_rgba(23,18,12,0.05)] md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Random prompt
          </p>
          <p className="text-2xl font-semibold text-slate-900">
            {prompt?.text ?? "Fetching something to appreciate…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchPrompt();
          }}
          disabled={promptLoading}
          className="self-start rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {promptLoading ? "Loading…" : "New prompt"}
        </button>
      </div>
      {promptError ? (
        <p className="text-sm text-red-600">{promptError}</p>
      ) : null}
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
      <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p>
            {prompt?.text
              ? "Prompt pulled straight from Postgres."
              : "Connect to fetch one of the seeded prompts."}
          </p>
          <p>
            <span className="font-semibold">Ctrl/Cmd + Shift + G</span> saves this entry.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/40 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save gratitude entry"}
        </button>
      </div>
    </form>
  );
}

function CreativeEntry({ onEntrySaved }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [personas, setPersonas] = useState<CreativePersonaDto[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<CreativePromptDto | null>(null);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("c", requestSubmit);

  const loadPersonas = useCallback(async () => {
    setPersonasLoading(true);
    setPersonasError(null);
    try {
      const response = await fetch("/api/prompts/creative/personas", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        personas?: CreativePersonaDto[];
        error?: string;
      };
      if (!response.ok || !data.personas) {
        throw new Error(data.error ?? "Unable to load personas.");
      }
      const serverPersonas = data.personas;
      setPersonas(serverPersonas);
      setSelectedPersonas((current) => {
        const stillValid = current.filter((id) =>
          serverPersonas.some((persona) => persona.id === id),
        );
        if (stillValid.length > 0) {
          return stillValid;
        }
        return serverPersonas.length > 0 ? [serverPersonas[0].id] : [];
      });
    } catch (error) {
      setPersonas([]);
      setSelectedPersonas([]);
      setPersonasError(
        error instanceof Error ? error.message : "Unable to fetch personas.",
      );
    } finally {
      setPersonasLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPersonas();
  }, [loadPersonas]);

  const togglePersona = (id: string) => {
    setSelectedPersonas((current) => {
      const isActive = current.includes(id);
      if (isActive) {
        return current.filter((persona) => persona !== id);
      }
      return [...current, id];
    });
    setPromptState(null);
    setPromptNotice(null);
    setPromptError(null);
  };

  const personaSummary = useMemo(() => {
    const selected = personas.filter((persona) =>
      selectedPersonas.includes(persona.id),
    );
    return selected.map((persona) => persona.name).join(", ");
  }, [personas, selectedPersonas]);

  const generatePrompt = async () => {
    if (selectedPersonas.length === 0) {
      setPromptState(null);
      setPromptNotice(null);
      setPromptError("Choose at least one persona to shape the prompt.");
      return;
    }

    setPromptLoading(true);
    setPromptError(null);
    setPromptNotice(null);
    setOllamaStatus("unknown");
    try {
      const response = await fetch("/api/prompts/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds: selectedPersonas }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        prompt?: CreativePromptDto;
        error?: string;
      };
      if (!response.ok || !data.prompt) {
        throw new Error(data.error ?? "Unable to generate prompt.");
      }
      setPromptState(data.prompt);
      setPromptNotice(
        data.prompt.fromOllama
          ? "Generated via local Ollama."
          : "Fallback prompt saved while Ollama is offline.",
      );
      setOllamaStatus(data.prompt.fromOllama ? "online" : "offline");
    } catch (error) {
      setPromptState(null);
      setPromptNotice(null);
      setPromptError(
        error instanceof Error
          ? error.message
          : "Unexpected error while generating prompt.",
      );
      setOllamaStatus("offline");
    } finally {
      setPromptLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (!promptState) {
      setStatus({
        tone: "error",
        message: "Generate a prompt first so we can link it to your entry.",
      });
      return;
    }
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "creative",
        bodyMarkdown: body,
        creativePromptId: promptState.id,
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
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-black/5 bg-white/95 p-6 shadow-[0_30px_60px_rgba(23,18,12,0.05)] md:p-8"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Personas
          </p>
          <button
            type="button"
            onClick={() => {
              void loadPersonas();
            }}
            disabled={personasLoading}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {personasLoading ? "Refreshing…" : "Refresh list"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {personasLoading ? (
            <p className="text-sm text-slate-500">Loading personas…</p>
          ) : personas.length === 0 ? (
            <p className="text-sm text-red-600">
              {personasError ??
                "No personas available. Seed the DB to enable creative mode."}
            </p>
          ) : (
            personas.map((persona) => {
              const isActive = selectedPersonas.includes(persona.id);
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => togglePersona(persona.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/30"
                      : "border-black/10 bg-white text-slate-800 hover:border-black/30"
                  }`}
                >
                  <span className="block text-base font-semibold">{persona.name}</span>
                  <span
                    className={`text-sm ${
                      isActive ? "text-white/85" : "text-slate-500"
                    }`}
                  >
                    {persona.description}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <p className="text-sm text-slate-500">
          {personaSummary
            ? `Mixing: ${personaSummary}`
            : "Choose at least one persona to shape the AI prompt."}
        </p>
        {personasError && personas.length > 0 ? (
          <p className="text-sm text-red-600">{personasError}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-700">
              AI prompt
            </p>
            <p className="text-sm text-indigo-700">
              Internal Ollama (mistral / gpt-oss) blends the selected personas into one idea.
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  ollamaStatus === "online"
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                    : ollamaStatus === "offline"
                      ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                      : "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.7)]"
                }`}
                aria-hidden
              />
              {ollamaStatus === "online"
                ? "Ollama online"
                : ollamaStatus === "offline"
                  ? "Ollama offline (using fallback)"
                  : "Checking Ollama…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void generatePrompt();
            }}
            disabled={promptLoading || personas.length === 0}
            className={`self-start rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
              ollamaStatus === "online"
                ? "bg-emerald-600 shadow-emerald-600/40 hover:bg-emerald-700"
                : ollamaStatus === "offline"
                  ? "bg-rose-500 shadow-rose-500/40 hover:bg-rose-600"
                  : "bg-indigo-600 shadow-indigo-600/40 hover:bg-indigo-700"
            }`}
          >
            {promptLoading ? "Generating…" : "Generate prompt"}
          </button>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-indigo-800">
          <p className="whitespace-pre-line">
            {promptState?.text ??
              "Tap “Generate prompt” to ask the internal Ollama instance for a tailored idea."}
          </p>
        </div>
        {promptNotice ? (
          <p className="text-xs uppercase tracking-[0.2em] text-purple-600">
            {promptNotice}
          </p>
        ) : null}
        {promptError ? (
          <p className="text-sm text-red-600">{promptError}</p>
        ) : null}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">
          Markdown entry
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          placeholder="Use Markdown (### headings, **bold**, lists) to expand the prompt into something personal."
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-base leading-relaxed text-slate-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
        />
        <span className="text-xs text-slate-500">
          Markdown stored verbatim: italics, lists, and checkboxes are all kept.
        </span>
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>
          Prompt + entry save together. Press
          <span className="font-semibold"> Ctrl/Cmd + Shift + C</span> anytime.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-indigo-700 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-700/40 transition hover:-translate-y-0.5 hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save creative entry"}
        </button>
      </div>
    </form>
  );
}
export function HistoryPreview({ refreshKey }: HistoryPreviewProps) {
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<HistoryMeta | null>(null);

  const fetchHistory = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/entries?page=${pageToLoad}&pageSize=${HISTORY_PAGE_SIZE}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (response.status === 401) {
          setEntries([]);
          setMeta(null);
          setError("Unlock your journal to view history.");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load entries.");
        }
        const data = (await response.json()) as {
          entries: JournalEntryDto[];
          meta?: HistoryMeta;
        };
        setEntries(data.entries ?? []);
        setMeta(
          data.meta ?? {
            page: pageToLoad,
            pageSize: HISTORY_PAGE_SIZE,
            total: data.entries?.length ?? 0,
          },
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unexpected error while loading history.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [refreshKey]);

  useEffect(() => {
    void fetchHistory(currentPage);
  }, [fetchHistory, currentPage, refreshKey]);

  const totalEntries = meta?.total ?? entries.length;
  const totalPages =
    meta && meta.pageSize > 0 ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const pageStart =
    totalEntries === 0 ? 0 : (meta ? (meta.page - 1) * meta.pageSize + 1 : 1);
  const pageEnd =
    totalEntries === 0
      ? 0
      : meta
        ? Math.min(meta.page * meta.pageSize, meta.total)
        : entries.length;

  let content: React.ReactNode;
  if (loading) {
    content = (
      <p className="text-sm text-[var(--muted)]">Loading your journal history…</p>
    );
  } else if (error) {
    content = (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  } else if (entries.length === 0) {
    content = (
      <p className="text-sm text-[var(--muted)]">
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
            snippet = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
          } else if (entry.entryType === "ANGER" && entry.angerReason) {
            snippet = entry.angerReason;
          } else if (
            entry.entryType === "GRATITUDE" &&
            entry.gratitudePrompt?.promptText
          ) {
            snippet = entry.gratitudePrompt.promptText;
          } else if (
            entry.entryType === "CREATIVE" &&
            entry.creativePrompt?.promptText
          ) {
            snippet = entry.creativePrompt.promptText;
          } else {
            snippet = "—";
          }
          return (
            <li key={entry.id}>
              <Link
                href={`/entries/${entry.id}`}
                className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 md:flex-row md:items-center md:justify-between"
              >
                <div className="text-base font-semibold text-slate-900">
                  {emoji} {entry.title}
                </div>
                <p className="text-sm text-slate-600 md:flex-1 md:px-4">{snippet}</p>
                <div className="flex items-center gap-3 text-xs font-semibold text-indigo-600">
                  <span className="uppercase tracking-wide text-slate-500">
                    {formatEntryTimestamp(entry.createdAt)}
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

  const canGoPrev = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  return (
    <section className="rounded-3xl border border-black/5 bg-white/95 p-6 shadow-[0_30px_60px_rgba(23,18,12,0.05)] md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Journal history
          </p>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            Your full archive
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Browse every entry with simple pagination.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <button
            type="button"
            onClick={() => {
              setCurrentPage((page) => Math.max(1, page - 1));
            }}
            disabled={!canGoPrev}
            className="rounded-full border border-indigo-500 px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:-translate-y-0.5 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentPage((page) => page + 1);
            }}
            disabled={!canGoNext}
            className="rounded-full border border-indigo-500 px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:-translate-y-0.5 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchHistory(currentPage);
            }}
            disabled={loading}
            className="rounded-full border border-indigo-500 px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:-translate-y-0.5 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          >
            Refresh
          </button>
          <Link
            href="/entries"
            className="rounded-full border border-indigo-500 px-3 py-1.5 text-xs font-semibold text-indigo-900 transition hover:-translate-y-0.5 hover:bg-indigo-50"
          >
            Full archive →
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          {totalEntries > 0
            ? `Showing ${pageStart}–${pageEnd} of ${totalEntries} entries · Page ${currentPage} of ${totalPages}`
            : "No entries saved yet"}
        </div>
        {content}
      </div>
    </section>
  );
}

type PasscodeGateProps = {
  hasPasscode: boolean;
  onAuthenticated: () => void;
  statusError?: string | null;
  refetchStatus: () => Promise<void>;
  fetchImpl?: typeof fetch;
};

export function PasscodeGate({
  hasPasscode,
  onAuthenticated,
  statusError,
  refetchStatus,
  fetchImpl,
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
      const clientFetch = fetchImpl ?? fetch;
      const response = await clientFetch(endpoint, {
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
          className="w-full rounded-full bg-indigo-700 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
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
