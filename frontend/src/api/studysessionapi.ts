import { apiRequest } from "./clientapi";

export type QuestionType =
  | "mcq"
  | "true_false"
  | "short_answer";

export type StartSessionResponse = {
  session: {
    id: number;
    moduleId: number;
    questionCount: number;
  };
  questions: SessionQuestion[];
};

export type SessionQuestion = {
  id: number;
  type: QuestionType;
  text: string;
  choices: string[] | string | null;
  difficulty: number;
};

export type AttemptResponse = {
  attemptId: number;
  questionId: number;
  result: "correct" | "partial" | "incorrect";
  rationale?: string | null;
  confidence?: number | null;
};

export type SessionResults = {
  session: {
    id: number;
    moduleId: number;
    questionCount: number;
  };

  summary: {
    total: number;
    correct: number;
    partial: number;
    incorrect: number;
    accuracy: number;
  };

  attempts: {
    id: number;
    questionId: number;
    questionVersionId: number;

    question: {
      text: string;
      type: QuestionType;
      difficulty: number;
    };

    answer: string;

    result: "correct" | "partial" | "incorrect";

    aiRationale?: string | null;
    aiConfidence?: number | null;

    userOverride?: string | null;
    overrideReason?: string | null;

    timeTaken?: number | null;
  }[];
};

export async function startStudySession(
  moduleId: number,
  questionCount: number,
  questionTypes: QuestionType[],
): Promise<StartSessionResponse> {
  return apiRequest("study-sessions/start", {
    method: "POST",

    body: JSON.stringify({
      moduleId,
      questionCount,
      questionTypes,
    }),
  });
}

export async function submitAttempt(
  sessionId: number,
  questionId: number,
  answer: string,
  timeTaken?: number,
): Promise<AttemptResponse> {
  return apiRequest(
    `study-sessions/${sessionId}/attempt`,
    {
      method: "POST",

      body: JSON.stringify({
        questionId,
        answer,
        timeTaken,
      }),
    },
  );
}

export async function fetchSessionResults(
  sessionId: number,
): Promise<SessionResults> {
  return apiRequest(
    `study-sessions/${sessionId}/results`,
  );
}

export async function overrideAttempt(
  attemptId: number,
  result: "correct" | "partial" | "incorrect",
  reason?: string,
) {
  return apiRequest(
    `study-sessions/attempts/${attemptId}/override`,
    {
      method: "POST",

      body: JSON.stringify({
        result,
        reason,
      }),
    },
  );
}