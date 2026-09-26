import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { getSubjects, createSubject } from "../api/subjectapi";

type SubjectItem = {
  id: number;
  name: string;
  description?: string | null;
  tags?: string | null;
};

export default function Subject() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [error, setError] = useState("");

  const id = Number(workspaceId);

  const loadSubjects = async () => {
    if (!workspaceId || Number.isNaN(id)) {
      setError("Invalid workspace.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getSubjects(id);

      setSubjects(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!workspaceId || Number.isNaN(id)) {
        if (!cancelled) {
          setError("Invalid workspace.");
          setLoading(false);
        }

        return;
      }

      try {
        const data = await getSubjects(id);

        if (!cancelled) {
          setSubjects(data);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load subjects",
          );

          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, id]);

  const handleCreate = async () => {
    if (!workspaceId) return;

    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createSubject(
        id,
        name,
        description || undefined,
        tags || undefined,
      );

      setName("");
      setDescription("");
      setTags("");
      setShowForm(false);

      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Workspaces
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">Subjects</h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage subjects inside this workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Add Subject */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Subject
          </h2>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Subject Name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Subject description"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tags
              </label>

              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="e.g. algebra, basics"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Subject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-500">
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <BookOpen className="mx-auto text-gray-300" size={40} />

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No subjects yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create your first subject for this workspace.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/subjects/${subject.id}/modules`,
                )
              }
              className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                  <BookOpen size={20} />
                </div>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-900">
                {subject.name}
              </h2>

              <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                {subject.description || "No description available."}
              </p>

              <div className="mt-5 text-sm font-medium text-violet-600">
                Open Modules →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
