"use client";

import { useMemo, useState } from "react";

type TabId = "anger" | "gratitude" | "creative";

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

const HISTORY_SEEDS = [
  { id: "🤬 014", when: "2 hours ago", note: "Guarding my boundaries." },
  { id: "🥰 087", when: "Yesterday", note: "Warm coffee + morning light." },
  { id: "✍️ 022", when: "3 days ago", note: "Persona: Soft Sci-Fi" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("anger");

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
          {activeTab === "anger" && <AngerEntry />}
          {activeTab === "gratitude" && <GratitudeEntry />}
          {activeTab === "creative" && <CreativeEntry />}
        </section>

        <HistoryPreview />
      </main>
    </div>
  );
}

function AngerEntry() {
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-orange-50">
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
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Press <span className="font-semibold">A</span> to save once keyboard shortcuts ship.</p>
        <button
          type="button"
          className="rounded-full bg-[var(--accent-strong)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-strong)]/40 transition hover:scale-[1.01]"
        >
          Save anger entry
        </button>
      </div>
    </div>
  );
}

function GratitudeEntry() {
  const [promptIndex, setPromptIndex] = useState(() =>
    Math.floor(Math.random() * GRATITUDE_PROMPTS.length),
  );
  const [reflection, setReflection] = useState("");

  const promptText = GRATITUDE_PROMPTS[promptIndex];

  const cyclePrompt = () => {
    setPromptIndex((current) => {
      const next = (current + 1) % GRATITUDE_PROMPTS.length;
      return next;
    });
  };

  return (
    <div className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-yellow-50">
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
      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>100 curated prompts seed the DB later. This is a local preview.</p>
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-[var(--accent)]/40 transition hover:scale-[1.01]"
        >
          Save gratitude entry
        </button>
      </div>
    </div>
  );
}

function CreativeEntry() {
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([
    CREATIVE_PERSONAS[0]?.id ?? "",
  ]);
  const [prompt, setPrompt] = useState(
    "Tap “Generate prompt” to ask the internal Ollama instance for a tailored idea.",
  );
  const [body, setBody] = useState("");

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

  return (
    <div className="space-y-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-lg shadow-purple-50">
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

      <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>
          Entries will be titled automatically (<span className="font-semibold">✍️ 00X</span>).
        </p>
        <button
          type="button"
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:scale-[1.01]"
        >
          Save creative entry
        </button>
      </div>
    </div>
  );
}

function HistoryPreview() {
  return (
    <section className="rounded-3xl border border-black/10 bg-slate-900/95 p-6 text-white shadow-2xl shadow-slate-900/40">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            Upcoming
          </p>
          <h2 className="text-2xl font-semibold">History + pagination</h2>
          <p className="text-sm text-white/70">
            Chronological list of every entry, no search needed for v1.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          View all entries
        </button>
      </div>

      <ul className="mt-6 space-y-4">
        {HISTORY_SEEDS.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-1 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between"
          >
            <div className="font-semibold text-white">{entry.id}</div>
            <p className="text-white/70">{entry.note}</p>
            <span className="text-xs uppercase tracking-wide text-white/60">
              {entry.when}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
