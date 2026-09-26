import { useEffect, useState } from "react";
import { getDashboard } from "../api/dashboardapi";

type DashboardData = {
  summary: {
    totalConcepts: number;
    averageMastery: number;
    totalAttempts: number;
    accuracy: number;
  };

  masteryDistribution: {
    New: number;
    Learning: number;
    Proficient: number;
    Mastered: number;
  };

  accuracyTrend: {
    date: string;
    accuracy: number;
    attempts: number;
  }[];

  weakConcepts: {
    conceptId: number;
    title: string;
    score: number;
    bucket: string;
    module: {
      id: number;
      name: string;
    };
    subject: {
      id: number;
      name: string;
    };
  }[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getDashboard();

        setData(result);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-400px items-center justify-center">
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const distribution = [
    {
      label: "New",
      value: data.masteryDistribution.New,
    },
    {
      label: "Learning",
      value: data.masteryDistribution.Learning,
    },
    {
      label: "Proficient",
      value: data.masteryDistribution.Proficient,
    },
    {
      label: "Mastered",
      value: data.masteryDistribution.Mastered,
    },
  ];

  const maxDistribution = Math.max(
    ...distribution.map((item) => item.value),
    1,
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        <p className="mt-1 text-sm text-gray-500">
          Track your learning progress and identify concepts that need review.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Concepts</p>

          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.totalConcepts}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Average Mastery</p>

          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.averageMastery}%
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Attempts</p>

          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.totalAttempts}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Overall Accuracy</p>

          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.accuracy}%
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Mastery Distribution */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Mastery Distribution
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current mastery across accepted concepts.
            </p>
          </div>

          <div className="space-y-5">
            {distribution.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {item.label}
                  </span>

                  <span className="text-gray-500">{item.value}</span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${(item.value / maxDistribution) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7 day accuracy */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              7-Day Accuracy
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Accuracy from your recent study attempts.
            </p>
          </div>

          <div className="flex h-48 items-end gap-2">
            {data.accuracyTrend.map((day) => {
              const height = day.attempts === 0 ? 4 : Math.max(day.accuracy, 8);

              return (
                <div
                  key={day.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs text-gray-500">
                    {day.attempts > 0 ? `${day.accuracy}%` : "-"}
                  </span>

                  <div className="flex h-32 w-full items-end rounded-md bg-gray-100">
                    <div
                      className="w-full rounded-md bg-violet-500"
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <span className="text-[10px] text-gray-400">
                    {new Date(day.date).toLocaleDateString(undefined, {
                      weekday: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weak concepts */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Top Weak Concepts
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Concepts with the lowest mastery scores.
          </p>
        </div>

        {data.weakConcepts.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No accepted concepts available yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.weakConcepts.map((concept) => (
              <div
                key={concept.conceptId}
                className="
                    flex flex-col gap-3
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {concept.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {concept.subject.name}
                    {" · "}
                    {concept.module.name}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {concept.bucket}
                  </span>

                  <span className="w-12 text-right text-sm font-semibold text-gray-900">
                    {concept.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
