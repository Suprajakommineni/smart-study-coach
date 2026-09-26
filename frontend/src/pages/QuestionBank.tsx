import { useCallback, useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { Check, Pencil, Trash2, X, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  approveQuestion,
  createQuestions,
  editQuestion,
  fetchQuestions,
  retireQuestion,
} from "../api/questionapi";

type QuestionType = "mcq" | "true_false" | "short_answer";

type QuestionStatus = "generated" | "user-edited" | "approved" | "retired";

type Concept = {
  id: number;
  title: string;
};

type QuestionConcept = {
  concept: Concept;
};

type Question = {
  id: number;
  type: QuestionType;
  text: string;
  difficulty: number;
  status: QuestionStatus;
  answer: string;
  choices: string | null;
  concepts?: QuestionConcept[];
};

export default function QuestionBank() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [saving, setSaving] = useState(false);

  const loadQuestions = useCallback(async () => {
    if (!moduleId) return;

    try {
      setLoading(true);
      setError("");

      const data = await fetchQuestions(Number(moduleId));

      setQuestions(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load questions",
      );
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestions();
  }, [loadQuestions]);

  if (!moduleId) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="text-lg font-medium text-gray-900">Module not found</h2>

        <p className="mt-2 text-sm text-gray-500">
          A valid module ID is required to view questions.
        </p>
      </div>
    );
  }

  const getChoices = (choices: string | null): string[] => {
    if (!choices) return [];

    try {
      return JSON.parse(choices);
    } catch {
      return [];
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError("");

      await createQuestions(Number(moduleId));

      await loadQuestions();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to generate questions",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (questionId: number) => {
    try {
      setError("");

      await approveQuestion(questionId);

      await loadQuestions();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to approve question",
      );
    }
  };

  const handleRetire = async (questionId: number) => {
    try {
      setError("");

      await retireQuestion(questionId);

      await loadQuestions();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to retire question",
      );
    }
  };

  const handleSaveEdit = async (data: {
    text: string;
    answer: string;
    choices: string[] | null;
    difficulty: number;
    conceptIds: number[];
  }) => {
    if (!editingQuestion) return;

    try {
      setSaving(true);
      setError("");

      await editQuestion(editingQuestion.id, data);

      setEditingQuestion(null);

      await loadQuestions();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update question",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      {/* HEADER */}

<div className="space-y-4">
  <button
    type="button"
    onClick={() => navigate(-1)}
    className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
  >
    <ArrowLeft size={17} />
    Back
  </button>

  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Question Bank
      </h1>

      <p className="mt-1 text-sm text-gray-500">
        Review, edit, approve and manage questions for this module.
      </p>
    </div>

    <Button onClick={handleGenerate} disabled={generating}>
      {generating ? "Generating..." : "Generate Questions"}
    </Button>
  </div>
</div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          Loading questions...
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            No questions available
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Accept at least one concept and then generate questions.
          </p>

          <Button
            className="mt-5"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Questions"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const choices = getChoices(question.choices);

            return (
              <div
                key={question.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                {/* TOP */}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      Question {index + 1}
                    </span>

                    <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600">
                      {question.type === "mcq"
                        ? "Multiple Choice"
                        : question.type === "true_false"
                          ? "True / False"
                          : "Short Answer"}
                    </span>

                    <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600">
                      Difficulty {question.difficulty}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      question.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : question.status === "user-edited"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {question.status}
                  </span>
                </div>

                {/* QUESTION */}

                <h2 className="mt-5 text-base font-medium leading-6 text-gray-900">
                  {question.text}
                </h2>

                {/* CHOICES */}

                {choices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {choices.map((choice, choiceIndex) => (
                      <div
                        key={choiceIndex}
                        className={`rounded-lg border px-4 py-3 text-sm ${
                          choice === question.answer
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                      </div>
                    ))}
                  </div>
                )}

                {/* ANSWER */}

                <div className="mt-5 rounded-lg bg-green-50 px-4 py-3">
                  <p className="text-xs font-medium text-green-600">
                    Expected Answer
                  </p>

                  <p className="mt-1 text-sm font-medium text-green-800">
                    {question.answer}
                  </p>
                </div>

                {/* CONCEPTS */}

                {question.concepts && question.concepts.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      Linked Concepts
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {question.concepts.map(({ concept }) => (
                        <span
                          key={concept.id}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                        >
                          {concept.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTIONS */}

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingQuestion(question)}
                    disabled={question.status === "retired"}
                  >
                    <Pencil size={15} className="mr-1.5" />
                    Edit
                  </Button>

                  {question.status !== "approved" &&
                    question.status !== "retired" && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(question.id)}
                      >
                        <Check size={15} className="mr-1.5" />
                        Approve
                      </Button>
                    )}

                  {question.status !== "retired" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetire(question.id)}
                    >
                      <Trash2 size={15} className="mr-1.5" />
                      Retire
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MODAL */}

      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          saving={saving}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// =========================================================
// EDIT MODAL
// =========================================================

type QuestionEditModalProps = {
  question: Question;
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    text: string;
    answer: string;
    choices: string[] | null;
    difficulty: number;
    conceptIds: number[];
  }) => void;
};

function QuestionEditModal({
  question,
  saving,
  onClose,
  onSave,
}: QuestionEditModalProps) {
  const initialChoices = (() => {
    if (!question.choices) return [];

    try {
      return JSON.parse(question.choices) as string[];
    } catch {
      return [];
    }
  })();

  const [text, setText] = useState(question.text);

  const [answer, setAnswer] = useState(question.answer);

  const [choices, setChoices] = useState<string[]>(initialChoices);

  const [difficulty, setDifficulty] = useState(question.difficulty);

  const [formError, setFormError] = useState("");

  const handleChoiceChange = (index: number, value: string) => {
    setChoices((current) =>
      current.map((choice, i) => (i === index ? value : choice)),
    );
  };

  const handleSave = () => {
    if (!text.trim()) {
      setFormError("Question text is required.");
      return;
    }

    if (!answer.trim()) {
      setFormError("Expected answer is required.");
      return;
    }

    if (question.type === "mcq" && choices.some((choice) => !choice.trim())) {
      setFormError("All MCQ choices are required.");
      return;
    }

    if (question.type === "mcq" && !choices.includes(answer)) {
      setFormError("The expected answer must match one of the choices.");
      return;
    }

    setFormError("");

    onSave({
      text: text.trim(),
      answer: answer.trim(),
      choices:
        choices.length > 0 ? choices.map((choice) => choice.trim()) : null,
      difficulty,
      conceptIds: question.concepts?.map(({ concept }) => concept.id) ?? [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Question
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Saving creates a new question version and marks it as user-edited.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}

        <div className="space-y-5 p-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* QUESTION TEXT */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Question Text
            </label>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* CHOICES */}

          {question.type === "mcq" && choices.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choices
              </label>

              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <input
                    key={index}
                    value={choice}
                    onChange={(e) => handleChoiceChange(index, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ANSWER */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Expected Answer
            </label>

            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* DIFFICULTY */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Difficulty
            </label>

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value={1}>1 - Very Easy</option>
              <option value={2}>2 - Easy</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - Hard</option>
              <option value={5}>5 - Very Hard</option>
            </select>
          </div>

          {/* LINKED CONCEPTS */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Linked Concepts
            </label>

            <div className="flex flex-wrap gap-2">
              {question.concepts && question.concepts.length > 0 ? (
                question.concepts.map(({ concept }) => (
                  <span
                    key={concept.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    {concept.title}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">
                  No linked concepts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
