# Smart Study Coach

A full-stack study app that turns pasted notes into AI-generated concepts, review-gated flashcards, auto-generated quiz questions, and a mastery/spacing tracker.

**Live demo:**
- Frontend: https://smart-study-coach-5ll2.vercel.app
- Backend API: https://smartstudycoach2-du0saxkp.b4a.run

> Note: the backend runs on a free-tier container that sleeps after a period of inactivity. The first request after being idle may take 10–30 seconds while it wakes up — this is expected, not a bug.

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui, deployed on Vercel
- **Backend:** NestJS + TypeScript, deployed as a Docker container on Back4app Containers
- **Database:** MySQL, hosted on Aiven (free tier)
- **AI:** Groq (`openai/gpt-oss-20b`) for concept extraction and question generation, using structured JSON-schema outputs
- **Auth:** JWT-based, bcrypt-hashed passwords

---

## Setup Instructions

### Prerequisites
- Node.js 20+
- A MySQL database (local or hosted)
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```
DATABASE_URL="mysql://user:password@host:port/dbname?ssl-mode=REQUIRED"
GROQ_API_KEY="your-groq-key"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

Run migrations and start:
```bash
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```
VITE_API_URL="http://localhost:3000"
```

```bash
npm run dev
```

### Deployment notes
- Backend is deployed via Dockerfile on Back4app Containers. Build command: `npm install && npx prisma generate && npm run build`. Start command: `node dist/main`.
- Frontend is deployed on Vercel, with `VITE_API_URL` set as an environment variable pointing at the deployed backend URL above.
- CORS on the backend accepts `localhost:5173` and any origin matching `https://smart-study-coach*.vercel.app`, since Vercel generates a unique hashed preview URL per deployment in addition to the stable production URL — a fixed single-origin string would break on every new deployment.

---

## Database Schema

Full schema lives in `backend/prisma/schema.prisma`; migrations are in `backend/prisma/migrations/`. Core entity chain:

```
User → Workspace → Subject → Module → Source → Concept → Question → StudySession → Attempt
                                          ↓         ↓          ↓
                                    SourceVersion  Mastery  QuestionVersion
```

`Question` links to `Concept` through a `QuestionConcept` join table (many-to-many), so a single question can remain correctly linked to multiple concepts after a merge. Supporting tables: `AiRun` (logs every AI call — model, prompt version, full input, full output), `AuditLog` (records accept/edit/reject/merge/approve/retire/generate actions with before/after snapshots).

---

## Mastery + Spacing Algorithm

Each concept has a `Mastery` record with a `score` (0–100).

**Update rule, per attempt:**
```
correct   → score += 10 * recencyWeight
incorrect → score -= 15 * recencyWeight
score clamped to [0, 100]
```
`recencyWeight` gives more recent attempts more influence than older ones, so a concept's mastery reflects the student's *current* grasp rather than an unweighted historical average.

**Buckets:**
| Score range | Bucket |
|---|---|
| 0–24 | New |
| 25–49 | Learning |
| 50–79 | Proficient |
| 80–100 | Mastered |

**Due-for-review rule (deterministic — identical data always produces the identical due list):**
- New / Learning → due again after 1 day
- Proficient → due again after 3 days
- Mastered → due again after 7 days
- Overridden regardless of bucket: if the most recent attempt was incorrect, the concept is due again the next day

Each due item stores a short, human-readable explanation (e.g. *"3 days since last review, mastery 42 (Learning), last attempt incorrect"*), satisfying the "why is this due" requirement without any non-deterministic behavior — the scheduler is pure arithmetic and date comparison, never randomness.

---

## Dedup / Idempotency Strategy

**Question generation:** regenerating questions for a module first flips any existing questions still in `generated` status to `retired` (not deleted), then creates a fresh batch. Questions a user has manually corrected carry `status: 'user-edited'` and are never touched by regeneration — a student's corrections survive any number of future regenerations. Within a single generation run, questions are also deduplicated by normalized text before saving, so the AI can't accidentally save the same question twice.

**Concept re-processing after a source edit:** editing a `Source` increments its `version` and writes a `SourceVersion` snapshot rather than mutating history in place. Concepts already `accepted` from an older version are marked `outdated` (not deleted), prompting the user to review and refresh rather than silently losing their prior review decisions.

**Merging concepts:** merging combines both concepts' facts into the surviving concept, re-points any linked questions from the merged-away concept to the survivor via `QuestionConcept`, recalculates the survivor's mastery from the combined attempt history, and marks the merged-away concept `status: 'merged'` (never deleted) so its history stays traceable.

---

## Provenance Format & AI Safety Constraints

Every AI-generated concept and question stores an `aiRunId` pointing to an `AiRun` record, which logs the exact model name, prompt version string, full prompt input, and full raw output for that call — so any generated item can be traced back to precisely which AI call produced it. Concepts additionally store `sourceId` + `sourceVersion` (which pasted text, and which version of it) and a `snippet` of the originating text.

**Safety constraints:**
- The AI only ever receives the student's own pasted notes (for concepts) or the titles/definitions of concepts the student has already accepted (for questions) — never arbitrary external content.
- All AI calls request a strict JSON schema response (`response_format: json_schema`, `strict: true`) rather than free-form text, and every field is validated against expected shape/values before being saved (e.g. an MCQ must have exactly 4 choices and its answer must exactly match one of them, or the item is silently discarded rather than saved malformed).
- A source that fails AI processing is marked `needs review` rather than left in an ambiguous state or saved with partial/garbage data.

---

## Key Tradeoffs & Limitations

- **AI provider swapped mid-build.** Initial integration targeted Google Gemini's free tier, which was intermittently unavailable (persistent 503 errors) during development. The implementation was switched to Groq. Question generation was further restructured from one large sequential AI call into three smaller calls (6 MCQ + 5 true/false + 4 short-answer) run concurrently, with the resulting database writes also parallelized — this was necessary to stay under the hosting platform's gateway timeout, a real constraint hit during deployment rather than a theoretical one.
- **Short-answer grading** uses deterministic string comparison for MCQ/True-False as required. AI-based grading with a rationale and confidence score for free-text short answers was designed but not fully wired into the study-session flow given time constraints.
- **PDF/image upload** is intentionally limited to metadata only (filename, type) per the assessment's own allowance — OCR/text extraction was explicitly marked optional and was not implemented.
- **Facts are stored as a JSON-encoded string** within the `Concept` record rather than a separate `Fact` table, since the list is small and bounded (3–8 items) and doesn't need independent querying or editing — a normal simplification for this use case.
- **Free-tier hosting tradeoffs:** the backend container sleeps after inactivity (cold start ~10–30s on first request); the database is a free-tier Aiven MySQL instance suitable for demo/evaluation, not production load. A cross-platform migration bug was also found and fixed during deployment: early migrations were generated on Windows, where MySQL table names are case-insensitive, and referenced the same table with inconsistent casing (e.g. `Module` vs `module`) across migrations — harmless locally, but a hard failure against Linux-hosted MySQL (Aiven), where table names are case-sensitive. Resolved by regenerating one consistently-cased migration from the current schema for the hosted database.
- **Authorization scoping** was tightened during final review: all nested resources (Subject/Module/Source/Concept/Question) verify the requesting user owns the parent Workspace chain before returning or modifying data, matching the "user only sees their own content" requirement.

---

## Seeded Demo Dataset

A quick way to evaluate: sign up, create one workspace/subject/module, then paste this sample text as a source and click "Process" to see the full concept → question → study session pipeline in action:

> "Mitosis is the process of cell division that produces two identical daughter cells. It occurs in four phases: prophase, metaphase, anaphase, and telophase. During prophase, chromosomes condense and become visible."