# simple-journal
Journaling for Gratitude and Creative Writing

# Agents Journal Application Specification

## 1. Product Summary

A minimalist, private, tailnet‑only journaling application running on **PROX-DOCK** using **Next.js**, **PostgreSQL**, **Redis**, **Nginx**, and an **internal Ollama LLM** (Mistral, gpt‑oss, etc.) for creative prompts. The app supports three entry types:

* 🤬 **Anger** – quick‑access guided prompt.
* 🥰 **Gratitude** – uses one random prompt from a set of 100.
* ✍️ **Creative** – Markdown long‑form writing using AI‑generated prompts.

Simplicity and speed are prioritized, especially for anger entries. Past entries are viewable chronologically but not searchable. The application includes a **local device passcode lock**.

---

## 2. Core Requirements

### 2.1 Functional Requirements

* Tailnet‑accessible web app at e.g. `journal.tailnet.local`.
* Three entry flows: anger, gratitude, creative.
* **Auto‑generated entry titles** using entry type emoji + auto‑increment sequence:

  * `🤬 001`, `🤬 002`, ...
  * `🥰 001`, `🥰 002`, ...
  * `✍️ 001`, `✍️ 002`, ...
* Local passcode lock:

  * Simple PIN or passphrase.
  * Stored hashed in DB.
  * User session stored in browser cookie; no re‑entry unless cookie expires.
* Creative prompts generated using **internal Ollama** (Mistral or gpt‑oss models).
* Markdown support for creative entries.
* Minimalist UI.
* Past entries list with pagination.
* No search needed for v1.

### 2.2 Non‑Functional Requirements

* Tailnet‑restricted. No public access.
* Light, low‑latency UI.
* Runs entirely via Docker on PROX‑DOCK.
* Nginx reverse proxy handles TLS (optional) and routing.
* PostgreSQL persistence.
* Redis caching and session management.
* Secure cookie for authentication.

---

## 3. System Architecture

### 3.1 Services

* **journal-web** – Next.js App Router application.
* **journal-db** – PostgreSQL database.
* **journal-redis** – Redis for sessions and caching.
* **ollama** – Internal tailnet-accessible Ollama instance using local models.
* **nginx-proxy** – Existing PROX‑DOCK Nginx configuration.

### 3.2 Networking

* All containers communicate over internal Docker network: `prox-dock-internal`.
* Nginx exposes `journal.tailnet.local` → journal-web.
* Ollama available at e.g. `http://ollama.tailnet.local:11434`.
* DB and Redis not publicly exposed.

---

## 4. Data Model

### 4.1 Users

```
users (
  id UUID PK,
  passcode_hash TEXT,
  created_at timestamp,
  updated_at timestamp
)
```

**Single user** supported; model is future‑proof.

### 4.2 Auto‑increment counters per entry type

```
entry_counters (
  id SERIAL PK,
  entry_type TEXT UNIQUE,     -- ANGER, GRATITUDE, CREATIVE
  counter INTEGER
)
```

Used for titles (`🤬 001`, etc).

### 4.3 Journal entries

```
journal_entries (
  id UUID PK,
  user_id UUID FK,
  entry_type TEXT,            -- ANGER / GRATITUDE / CREATIVE
  title TEXT,                 -- auto-generated using counter
  body_markdown TEXT,
  anger_reason TEXT NULL,
  gratitude_prompt_id UUID NULL,
  creative_prompt_id UUID NULL,
  created_at timestamptz,
  updated_at timestamptz
)
```

### 4.4 Gratitude prompts

```
gratitude_prompts (
  id UUID PK,
  prompt_text TEXT,
  is_active BOOLEAN,
  created_at timestamptz
)
```

Seed 100 prompts.

### 4.5 Creative personas

```
creative_personas (
  id UUID PK,
  name TEXT,
  description TEXT,
  is_active BOOLEAN,
  "order" INTEGER
)
```

### 4.6 Creative prompts (AI-generated)

```
creative_prompts (
  id UUID PK,
  personas_used JSONB,
  prompt_text TEXT,
  ai_raw JSONB,
  created_at timestamptz
)
```

---

## 5. API Design (Next.js App Router)

### 5.1 Authentication

* `POST /api/auth/verify` – validate passcode.
* `POST /api/auth/set` – set initial passcode if none exists.
* Cookie contains signed JWT with very long expiration.

### 5.2 Journaling

* `POST /api/entries` – create entry.
* `GET /api/entries` – paginated list.
* `GET /api/entries/:id` – view entry.

### 5.3 Prompts

* `GET /api/prompts/gratitude/random`
* `POST /api/prompts/creative`

  * Calls internal Ollama: `POST /api/generate` or direct `/api/chat`.

---

## 6. UI / UX Design

### 6.1 Visual Style

* Minimalist, whitespace-heavy.
* Soft background tones.
* System font / Inter.
* Mobile-first with desktop enhancements.

### 6.2 Navigation

* Top tabs:

  * 🤬 Anger
  * 🥰 Gratitude
  * ✍️ Creative
* Default opens to **Anger**.

### 6.3 Anger Flow

* Always visible field:

  > *“I am angry because I care about [____].”*
* Large text box below for deeper writing.
* `Save` button.
* Keyboard shortcut: `a`.
* Extremely fast entry creation.

### 6.4 Gratitude Flow

* Random prompt displayed on tab load.
* "New prompt" button.
* Text area for reflection.
* Save generates auto-title (`🥰 00X`).

### 6.5 Creative Flow

* Persona multi-select.
* "Generate prompt" uses Ollama.
* Markdown editor.
* Save→ assigns auto-title (`✍️ 00X`).

### 6.6 History View

* List by date.
* Shows emoji + title + timestamp.
* Entry detail modal or page.

---

## 7. Internal Ollama Integration

### 7.1 Models

Supported local models:

* `mistral:latest`
* `gpt-oss:20b`
* any configured `.gguf` model

### 7.2 Creative prompt generation

POST → `http://ollama.tailnet.local:11434/api/generate`

```json
{
  "model": "mistral:latest",
  "prompt": "You are a creative writing prompt generator ..."
}
```

App wraps result into `creative_prompts` rows.

---

## 8. Security

* Tailnet access only.
* Passcode hashed in DB (argon2).
* Session cookie: httpOnly, secure, signed.
* No external users.
* No password reset needed.

---

## 9. Deployment on PROX‑DOCK

### 9.1 Environment Variables

```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
OLLAMA_URL=http://ollama.tailnet.local:11434
JWT_SECRET=...
```

### 9.2 Docker Compose (partial)

```yaml
services:
  journal-web:
    build: ./journal-web
    env_file: .env
    depends_on:
      - journal-db
      - journal-redis
    networks: [ prox-dock-internal ]

  journal-db:
    image: postgres:16
    networks: [ prox-dock-internal ]

  journal-redis:
    image: redis:7
    networks: [ prox-dock-internal ]
```

### 9.3 Nginx routing

```
server {
    server_name journal.tailnet.local;
    location / {
        proxy_pass http://journal-web:3001;
    }
}
```

---

## 10. Phased Development Plan

### Progress Snapshot (Feb 25, 2026)

- **Phase 0 – Infrastructure & Scaffolding**: ✅ Complete (Next.js app, Docker/Compose, Prisma schema + migrations + seeds wired to Postgres on `ogsdell-network`).
- **Phase 1 – Passcode Lock**: ✅ Complete (argon2 hashing, JWT cookie with configurable secure flag, passcode UI gate, `/api/auth/*` routes).
- **Phase 2 – Anger + Gratitude**: ✅ Anger + Gratitude flows persist entries with auto-titled counters; history view lists recent entries and shows anger reasons if the long-form body is empty.
- **Phase 3 – Creative + Ollama**: ✅ Persona seeds, `/api/prompts/creative`, AI prompt storage, Markdown entry flow, Ollama health indicator, entry detail view with persona/prompt context.
- **Phase 4 – Polish**: 🟡 In progress (new UI palette, keyboard shortcuts, history/detail readability, PWA manifest, operator tips page). Remaining work: richer Markdown renderer, in-app admin controls (prompt toggles/persona editor), additional responsive/PWA refinements if needed.

### **Phase 0 – Infrastructure & Scaffolding**

* Create Next.js project.
* Dockerize.
* Connect Postgres & Redis.
* Create migrations.
* Basic Nginx routing.

### **Phase 1 – Passcode Lock**

* Passcode set & verify.
* Cookie-based sessions.

### **Phase 2 – Anger + Gratitude**

* Implement both flows.
* History page.
* Auto-increment titles.

### **Phase 3 – Creative + Ollama**

* Persona seeds.
* Prompt generation.
* Markdown entry flow.

### **Phase 4 – Polish**

* Keyboard shortcuts.
* Layout refinement.
* Mobile improvements.
* Optional: PWA.

---

## 11. Future Enhancements (Optional)

* Search.
* Tagging.
* Analytics or mood tracking.
* Multi-user support.
* Export as PDF/Markdown.
* Daily email summaries (via tailnet SMTP).

---

**End of agents.md**

### Known Issues

- **Entry detail mismatch**: Detail page currently fetches the wrong record; investigate context params on `/entries/[id]` route.
