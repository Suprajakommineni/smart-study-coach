# Smart Study Coach

A full-stack study application that turns pasted notes into AI-generated concepts and quiz questions, with review gating, mastery tracking, and spaced review.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** NestJS + TypeScript
- **Database:** MySQL + Prisma
- **AI:** Groq
- **Authentication:** JWT + bcrypt
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Back4app Containers
- **Database Hosting:** Aiven MySQL

---

## Project Setup

### 1. Backend Setup

Navigate to the backend:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
DATABASE_URL="mysql://user:password@host:port/dbname?ssl-mode=REQUIRED"
GROQ_API_KEY="your-groq-key"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

Run database migrations:

```bash
npx prisma migrate deploy
```

Generate Prisma Client:

```bash
npx prisma generate
```

Start the backend in development mode:

```bash
npm run start:dev
```

The backend will run on:

```text
http://localhost:3000
```

### 2. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_API_URL="http://localhost:3000"
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

## Database Schema & Migrations

The Prisma schema is located at:

```text
backend/prisma/schema.prisma
```

Database migrations are located at:

```text
backend/prisma/migrations/
```

### Main Entity Relationship

```text
User
  ↓
Workspace
  ↓
Subject
  ↓
Module
  ↓
Source
  ↓
Concept
  ↓
Question
  ↓
StudySession
  ↓
Attempt
```

### Additional Entities

The application also contains:

- `Mastery`
- `SourceVersion`
- `QuestionVersion`
- `AiRun`
- `AuditLog`
- `QuestionConcept`

These entities support mastery tracking, version history, AI provenance, auditing, and concept-question relationships.

---

## Mastery & Spacing Algorithm

Each concept has a mastery score from **0 to 100**.

### Mastery Updates

```text
Correct answer   → Mastery increases
Incorrect answer → Mastery decreases
```

The mastery score is always clamped between `0` and `100`.

### Mastery Levels

| Score | Level |
|------:|-------|
| 0–24 | New |
| 25–49 | Learning |
| 50–79 | Proficient |
| 80–100 | Mastered |

### Review Intervals

| Mastery Level | Review Interval |
|---|---|
| New / Learning | 1 day |
| Proficient | 3 days |
| Mastered | 7 days |

If the latest attempt is incorrect, the concept becomes due for review the next day.

The scheduler is deterministic and uses:

- Mastery score
- Attempt history
- Previous review date
- Current date

No random scheduling is used.

---

## Deduplication & Idempotency Strategy

The application uses different strategies for generated questions, source processing, and concept merging.

### Question Generation

When questions are regenerated:

1. Existing `generated` questions are removed.
2. New generated questions replace them.
3. `user-edited` questions are preserved.

This prevents duplicate generated questions while protecting questions that were manually modified by the user.

### Source Re-processing

When a source is processed again:

1. A new source version is created.
2. The previous source version remains available.
3. Existing concepts can be marked as `outdated`.
4. Processing history is preserved.

This allows the system to keep track of changes to the original study material.

### Concept Merging

When two concepts are merged:

1. Facts from both concepts are combined.
2. Related questions are reassigned to the surviving concept.
3. Mastery is recalculated using the combined attempt history.
4. The merged concept is marked as `merged` instead of being permanently deleted.

---

## Provenance

AI-generated content stores information that allows it to be traced back to the original study material.

### Provenance Information

Generated concepts can contain:

```text
sourceId
sourceVersion
snippet
aiRunId
```

The `AiRun` entity records information such as:

- AI model
- Prompt version
- Input
- Output

This makes it possible to trace generated concepts and questions back to their source material and AI generation run.

---

## AI Safety Constraints

The AI generation process is designed to keep generated content grounded in the student's supplied study material.

### Input

The AI receives the student's supplied study content as its source material.

### Structured Output

AI responses are expected to follow a fixed JSON structure.

#### Concept Structure

```text
title
definition
facts
```

#### Question Structure

```text
question
answer
choices
```

### Validation

AI responses are:

1. Parsed.
2. Validated against the expected structure.
3. Checked before being stored.

Malformed or unexpected AI responses are not stored directly.

---

## Key Tradeoffs & Limitations

### AI Provider

The project initially used Gemini and was later switched to Groq because of availability issues.

The AI integration is isolated so another AI provider can be added later without changing the rest of the application significantly.

### Question Grading

Multiple-choice and true/false questions can be graded deterministically.

Free-text answer grading is not fully automated and requires review.

### PDF & Image Processing

PDF/image uploads currently store metadata.

OCR and automatic text extraction are not implemented.

### Concept Facts

Concept facts are stored as JSON instead of separate database records because the number of facts per concept is small and bounded.

### Hosting

The application uses free-tier hosting services and is intended primarily for demonstration and evaluation rather than production-scale workloads.

---

## Demo Dataset

For quick evaluation, create a workspace, subject, module, and source using sample content such as:

> Mitosis is the process of cell division that produces two identical daughter cells. It occurs in four phases: prophase, metaphase, anaphase, and telophase. During prophase, chromosomes condense and become visible.

This sample can be used to test:

- Source creation
- AI concept generation
- Question generation
- Review gating
- Mastery tracking
- Spaced review

---

## Project Structure

```text
smart-study-coach/
│
├── README.md
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   └── src/
│       ├── auth/
│       ├── workspace/
│       ├── subject/
│       ├── module/
│       ├── source/
│       ├── concept/
│       ├── question/
│       ├── mastery/
│       ├── study-session/
│       └── ...
│
└── frontend/
    └── src/
        ├── components/
        ├── pages/
        ├── contexts/
        └── ...
```

---

## Environment Variables

The following environment variables are required.

### Backend

```env
DATABASE_URL="your-mysql-database-url"
GROQ_API_KEY="your-groq-api-key"
FRONTEND_URL="your-frontend-url"
PORT=3000
```

### Frontend

```env
VITE_API_URL="your-backend-api-url"
```

Do not commit `.env` files or secret API keys to the repository.

---

## Deployment

### Frontend

The frontend is deployed using **Vercel**.

### Backend

The NestJS backend is deployed using **Back4app Containers**.

### Database

The MySQL database is hosted using **Aiven**.

---

## Authentication

The application uses JWT-based authentication.

Passwords are hashed using bcrypt before being stored.

Protected API routes require a valid JWT token.

---

## License

This project is developed as a study and evaluation project.
