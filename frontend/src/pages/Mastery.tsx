import { useEffect, useState } from "react";
import { getMastery } from "../api/masteryapi";

type MasteryItem = {
  conceptId: number;
  conceptTitle: string;
  definition: string;
  tags: string | null;
  score: number;
  bucket: "New" | "Learning" | "Proficient" | "Mastered";
  lastStudiedAt: string | null;
  nextReviewAt: string | null;
  reviewInterval: number;
  correctStreak: number;
  incorrectStreak: number;

  module: {
    id: number;
    name: string;
  };

  subject: {
    id: number;
    name: string;
  };

  workspace: {
    id: number;
    name: string;
  };
};

export default function Mastery() {
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMastery() {
      try {
        const data = await getMastery();
        setMastery(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load mastery data",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMastery();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading mastery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mastery</h1>

        <p className="mt-1 text-sm text-gray-500">
          Track your learning progress across concepts.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard title="Total Concepts" value={mastery.length} />

        <SummaryCard
          title="New"
          value={mastery.filter((item) => item.bucket === "New").length}
        />

        <SummaryCard
          title="Learning"
          value={mastery.filter((item) => item.bucket === "Learning").length}
        />

        <SummaryCard
          title="Mastered"
          value={mastery.filter((item) => item.bucket === "Mastered").length}
        />
      </div>

      {/* Concept List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Concept Mastery</h2>
        </div>

        {mastery.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-500">No mastery records available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {mastery.map((item) => (
              <MasteryRow key={item.conceptId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>

      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function MasteryRow({ item }: { item: MasteryItem }) {
  return (
    <div className="px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Concept */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-gray-900">{item.conceptTitle}</h3>

            <BucketBadge bucket={item.bucket} />
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {item.module.name} · {item.subject.name}
          </p>

          {item.definition && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {item.definition}
            </p>
          )}
        </div>

        {/* Score */}
        <div className="w-full lg:w-64">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Mastery</span>

            <span className="text-sm font-semibold text-gray-900">
              {item.score}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{
                width: `${item.score}%`,
              }}
            />
          </div>
        </div>

        {/* Review */}
        <div className="text-sm lg:w-44">
          <p className="text-gray-500">Next review</p>

          <p className="mt-1 font-medium text-gray-900">
            {formatDate(item.nextReviewAt)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {item.correctStreak} correct streak
          </p>
        </div>
      </div>
    </div>
  );
}

function BucketBadge({ bucket }: { bucket: MasteryItem["bucket"] }) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
      {bucket}
    </span>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not scheduled";
  }

  return new Date(date).toLocaleDateString();
}
