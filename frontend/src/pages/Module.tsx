import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  FileText,
  ListChecks,
  Play,
  BookOpen,
} from "lucide-react";
import { getModules, createModule } from "../api/moduleapi";

type ModuleItem = {
  id: number;
  name: string;
  description?: string | null;
  tags?: string | null;
};

export default function Module() {
  const { workspaceId, subjectId } = useParams();
  const navigate = useNavigate();

  const [modules, setModules] = useState<ModuleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [error, setError] = useState("");

  const workspaceNumber = Number(workspaceId);
  const subjectNumber = Number(subjectId);

  useEffect(() => {
    let cancelled = false;

    const loadModules = async () => {
      if (
        !workspaceId ||
        !subjectId ||
        Number.isNaN(workspaceNumber) ||
        Number.isNaN(subjectNumber)
      ) {
        if (!cancelled) {
          setError("Invalid workspace or subject.");
          setLoading(false);
        }

        return;
      }

      try {
        const data = await getModules(workspaceNumber, subjectNumber);

        if (!cancelled) {
          setModules(data);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load modules",
          );

          setLoading(false);
        }
      }
    };

    loadModules();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, subjectId, workspaceNumber, subjectNumber]);

  const reloadModules = async () => {
    if (!workspaceId || !subjectId) return;

    try {
      const data = await getModules(workspaceNumber, subjectNumber);

      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modules");
    }
  };

  const handleCreateModule = async () => {
    if (!subjectId) return;

    if (!name.trim()) {
      setError("Module name is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createModule(
        Number(workspaceId),
        Number(subjectId),
        name,
        description || undefined,
        tags || undefined,
      );

      setName("");
      setDescription("");
      setTags("");
      setShowForm(false);

      await reloadModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create module");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/workspaces/${workspaceId}/subjects`)}
            className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Subjects
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">Modules</h1>

          <p className="mt-1 text-sm text-gray-500">
            Organize learning material into modules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          Add Module
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Add Module Form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Module</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Module Name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Algebra Basics"
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
                placeholder="Module description"
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
                placeholder="e.g. basics, equations"
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
                onClick={handleCreateModule}
                disabled={creating}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-500">
          Loading modules...
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <BookOpen className="mx-auto text-gray-300" size={42} />

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No modules yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create a module to start adding learning sources.
          </p>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus size={18} />
            Add Module
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Module title */}
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                  <BookOpen size={20} />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-gray-900">
                    {module.name}
                  </h2>

                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {module.description || "No description available."}
                  </p>
                </div>
              </div>

              {/* Main action */}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/workspaces/${workspaceId}/subjects/${subjectId}/modules/${module.id}/sources`,
                  )
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FileText size={17} />
                Sources
              </button>

              {/* Question Bank + Session */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/modules/${module.id}/questions`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  <ListChecks size={17} />
                  Questions
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/modules/${module.id}/study-session`)
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-100"
                >
                  <Play size={17} />
                  Start Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
