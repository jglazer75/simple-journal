import Link from "next/link";
import { AdminControls } from "./components/AdminControls";

const ENV_VARS = [
  {
    name: "DATABASE_URL",
    description: "PostgreSQL connection string used by Prisma.",
  },
  {
    name: "REDIS_URL",
    description: "Redis instance for session caching.",
  },
  {
    name: "OLLAMA_URL",
    description: "Base URL for the internal Ollama API (e.g. http://ollama.tailnet.local:11434).",
  },
  {
    name: "OLLAMA_MODEL",
    description: "Model ID passed to Ollama (mistral:latest, gpt-oss:20b, etc.).",
  },
  {
    name: "JWT_SECRET",
    description: "Secret used to sign the local session cookie.",
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_55%)] px-4 py-10 text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-soft)] md:px-10 md:py-12">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--accent)] transition hover:-translate-y-0.5 hover:text-[var(--accent-strong)]"
          >
            ← Back to journal
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
            Operator tips
          </p>
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            Settings & maintenance
          </h1>
          <p className="text-base text-[var(--muted)]">
            Quick reference for connecting Ollama, seeding prompts, and keeping personas in sync until an admin dashboard lands.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] px-5 py-6 shadow-[var(--shadow-soft)]/2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Environment essentials</h2>
          <p className="text-sm text-[var(--muted)]">
            Update <code className="rounded bg-black/5 px-1 py-0.5">.env</code> before rebuilding the Docker stack. All values remain on the tailnet, so feel free to use descriptive hostnames.
          </p>
          <ul className="space-y-3">
            {ENV_VARS.map((variable) => (
              <li
                key={variable.name}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
              >
                <p className="text-sm font-semibold">{variable.name}</p>
                <p className="text-sm text-[var(--muted)]">{variable.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] px-5 py-6 shadow-[var(--shadow-soft)]/2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Seeding gratitude prompts</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
            <li>Edit the <code className="rounded bg-black/5 px-1 py-0.5">GRATITUDE_PROMPTS</code> array inside <code className="rounded bg-black/5 px-1 py-0.5">prisma/seed.ts</code>.</li>
            <li>Run <code className="rounded bg-black/5 px-1 py-0.5">npm run db:seed</code> inside <code className="rounded bg-black/5 px-1 py-0.5">journal-web</code>.</li>
            <li>Existing entries keep their prompt IDs. Avoid deleting rows from Postgres; set <code className="rounded bg-black/5 px-1 py-0.5">is_active = false</code> instead.</li>
          </ol>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] px-5 py-6 shadow-[var(--shadow-soft)]/2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Managing creative personas</h2>
          <p className="text-sm text-[var(--muted)]">
            Personas are also defined in <code className="rounded bg-black/5 px-1 py-0.5">prisma/seed.ts</code>. Update names/descriptions/order, then run the seed script again. Active personas appear instantly in the Creative tab.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
            <li>Names are unique. Renaming creates a new row; edit directly in Postgres to avoid duplicates.</li>
            <li>Persona order is determined by array index (or the explicit <code className="rounded bg-black/5 px-1 py-0.5">order</code> field).</li>
            <li>Creative prompts store persona info inline, so retiring a persona will not break past entries.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] px-5 py-6 shadow-[var(--shadow-soft)]/2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Troubleshooting Ollama</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
            <li>Ensure <code className="rounded bg-black/5 px-1 py-0.5">OLLAMA_URL</code> is reachable from the Docker network. A quick check: <code className="rounded bg-black/5 px-1 py-0.5">docker compose exec journal-web curl $OLLAMA_URL/api/version</code>.</li>
            <li>If the Creative tab shows “offline”, the fallback prompt still saves. Fix the URL/port/model and regenerate.</li>
            <li>Keep your preferred models pulled on the Ollama host so prompt generation responds instantly.</li>
          </ul>
        </section>

        <AdminControls />
      </main>
    </div>
  );
}
