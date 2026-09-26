import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  startStudySession,
  submitAttempt,
  fetchSessionResults,
  type QuestionType,
  type SessionQuestion,
  type SessionResults,
} from "../api/studysessionapi";

type Screen = "setup" | "quiz" | "results";

export default function StudySession() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>("setup");

  const [questionCount, setQuestionCount] = useState(5);

  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    "mcq",
    "true_false",
    "short_answer",
  ]);

  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");

  const questionStartTime = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [results, setResults] = useState<SessionResults | null>(null);

  const currentQuestion = questions[currentIndex];

  // ============================================================
  // QUESTION TYPE SELECTION
  // ============================================================

  function toggleQuestionType(type: QuestionType) {
    setQuestionTypes((current) => {
      if (current.includes(type)) {
        return current.filter((item) => item !== type);
      }

      return [...current, type];
    });
  }

  // ============================================================
  // START SESSION
  // ============================================================

  async function handleStartSession() {
    if (!moduleId) return;

    if (questionTypes.length === 0) {
      setError("Please select at least one question type.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await startStudySession(
        Number(moduleId),
        questionCount,
        questionTypes,
      );

      if (!data.questions || data.questions.length === 0) {
        setError("No questions are available for this module.");
        return;
      }

      setSessionId(data.session.id);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswer("");

      questionStartTime.current = Date.now();

      setScreen("quiz");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start study session",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // SUBMIT CURRENT ANSWER
  // ============================================================

  async function handleSubmitAnswer() {
    if (!sessionId || !currentQuestion) return;

    if (!answer.trim()) {
      setError("Please provide an answer.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const timeTaken = Math.floor(
        (Date.now() - questionStartTime.current) / 1000,
      );

      await submitAttempt(sessionId, currentQuestion.id, answer, timeTaken);

      // More questions
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((current) => current + 1);
        setAnswer("");
        questionStartTime.current = Date.now();
        return;
      }

      // Last question
      const resultData = await fetchSessionResults(sessionId);

      setResults(resultData);
      setScreen("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // FINISH SESSION
  // ============================================================

  async function handleFinishSession() {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError("");

      const resultData = await fetchSessionResults(sessionId);

      setResults(resultData);
      setScreen("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // RESET
  // ============================================================

  function handleNewSession() {
    setScreen("setup");
    setQuestions([]);
    setSessionId(null);
    setCurrentIndex(0);
    setAnswer("");
    setResults(null);
    setError("");
  }

  // ============================================================
  // GET MCQ CHOICES
  // ============================================================

  function getChoices(question: SessionQuestion): string[] {
    if (!question.choices) {
      return [];
    }

    // Backend returned an array
    if (Array.isArray(question.choices)) {
      return question.choices;
    }

    // Backend returned JSON string
    if (typeof question.choices === "string") {
      try {
        const parsed = JSON.parse(question.choices);

        if (Array.isArray(parsed)) {
          return parsed;
        }

        return [];
      } catch {
        return [];
      }
    }

    return [];
  }

  // ============================================================
  // ANSWER UI
  // ============================================================

  function renderAnswerInput() {
    if (!currentQuestion) return null;

    // ---------------- MCQ ----------------

    if (currentQuestion.type === "mcq") {
      const choices = getChoices(currentQuestion);

      return (
        <div className="space-y-3">
          {choices.length === 0 ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              No options available for this question.
            </div>
          ) : (
            choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setAnswer(choice)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                  answer === choice
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="mr-3 font-semibold">
                  {String.fromCharCode(65 + index)}.
                </span>

                {choice}
              </button>
            ))
          )}
        </div>
      );
    }

    // ---------------- TRUE / FALSE ----------------

    if (currentQuestion.type === "true_false") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {["true", "false"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAnswer(value)}
              className={`rounded-xl border px-4 py-5 font-medium capitalize transition ${
                answer === value
                  ? "border-violet-500 bg-violet-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      );
    }

    // ---------------- SHORT ANSWER ----------------

    return (
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your answer in your own words..."
        rows={6}
        className="w-full resize-none rounded-xl border border-gray-200 p-4 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    );
  }

  // ============================================================
  // SETUP SCREEN
  // ============================================================

  if (screen === "setup") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Study Session
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Choose your session settings and test your knowledge.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Question Count */}

          <div className="mb-7">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Number of questions
            </label>

            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value={3}>3 questions</option>
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={15}>15 questions</option>
              <option value={20}>20 questions</option>
            </select>
          </div>

          {/* Question Types */}

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Question types
            </label>

            <div className="space-y-3">
              {/* MCQ */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={questionTypes.includes("mcq")}
                  onChange={() => toggleQuestionType("mcq")}
                  className="h-4 w-4"
                />

                <div>
                  <p className="font-medium text-gray-900">Multiple Choice</p>

                  <p className="text-sm text-gray-500">
                    Select the correct answer.
                  </p>
                </div>
              </label>

              {/* TRUE / FALSE */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={questionTypes.includes("true_false")}
                  onChange={() => toggleQuestionType("true_false")}
                  className="h-4 w-4"
                />

                <div>
                  <p className="font-medium text-gray-900">True / False</p>

                  <p className="text-sm text-gray-500">
                    Decide whether the statement is true or false.
                  </p>
                </div>
              </label>

              {/* SHORT ANSWER */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={questionTypes.includes("short_answer")}
                  onChange={() => toggleQuestionType("short_answer")}
                  className="h-4 w-4"
                />

                <div>
                  <p className="font-medium text-gray-900">Short Answer</p>

                  <p className="text-sm text-gray-500">
                    Explain the answer in your own words.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Buttons */}

          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleStartSession}
              disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start Session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // QUIZ SCREEN
  // ============================================================

  if (screen === "quiz" && currentQuestion) {
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="mx-auto max-w-3xl">
        {/* Header */}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>

            <h1 className="mt-1 text-xl font-semibold text-gray-900">
              Study Session
            </h1>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
            {currentQuestion.type.replace("_", " ")}
          </span>
        </div>

        {/* Progress */}

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Difficulty: {currentQuestion.difficulty}/5
            </span>

            <span className="text-sm text-gray-400">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>

          <h2 className="mb-8 text-xl font-semibold leading-relaxed text-gray-900">
            {currentQuestion.text}
          </h2>

          {renderAnswerInput()}

          {/* Error */}

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleFinishSession}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Finish
            </button>

            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : currentIndex === questions.length - 1
                  ? "Submit & View Results"
                  : "Submit & Next"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RESULTS SCREEN
  // ============================================================

  if (screen === "results" && results) {
    return (
      <div className="mx-auto max-w-4xl">
        {/* Header */}

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Session Results
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review your performance and answers.
          </p>
        </div>

        {/* Summary */}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Accuracy</p>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {results.summary.accuracy}%
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Correct</p>

            <p className="mt-2 text-2xl font-semibold text-green-600">
              {results.summary.correct}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Partial</p>

            <p className="mt-2 text-2xl font-semibold text-yellow-600">
              {results.summary.partial}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Incorrect</p>

            <p className="mt-2 text-2xl font-semibold text-red-600">
              {results.summary.incorrect}
            </p>
          </div>
        </div>

        {/* Attempts */}

        <div className="space-y-4">
          {results.attempts.map((attempt, index) => (
            <div
              key={attempt.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  Question {index + 1}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    attempt.result === "correct"
                      ? "bg-green-50 text-green-700"
                      : attempt.result === "partial"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {attempt.result}
                </span>
              </div>

              <h3 className="font-semibold leading-relaxed text-gray-900">
                {attempt.question.text}
              </h3>

              {/* Answer */}

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Your Answer
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {attempt.answer || "No answer"}
                </p>
              </div>

              {/* AI Rationale */}

              {attempt.aiRationale && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Explanation
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-gray-700">
                    {attempt.aiRationale}
                  </p>
                </div>
              )}

              {/* Confidence */}

              {attempt.aiConfidence !== null &&
                attempt.aiConfidence !== undefined && (
                  <p className="mt-3 text-xs text-gray-400">
                    AI confidence: {Math.round(attempt.aiConfidence * 100)}%
                  </p>
                )}

              {/* Time */}

              {attempt.timeTaken !== null &&
                attempt.timeTaken !== undefined && (
                  <p className="mt-2 text-xs text-gray-400">
                    Time taken: {attempt.timeTaken}s
                  </p>
                )}

              {/* Override */}

              {attempt.userOverride && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    User Override
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    {attempt.userOverride}
                  </p>

                  {attempt.overrideReason && (
                    <p className="mt-1 text-xs text-gray-500">
                      Reason: {attempt.overrideReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleNewSession}
            className="flex-1 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-700"
          >
            Start New Session
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Back to Module
          </button>
        </div>
      </div>
    );
  }

  return null;
}
