import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  FileText,
  Brain,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  getSources,
  createSources,
  updateSource,
  sourceProcess,
} from "../api/sourceapi";

type Source = {
  id: number;
  text: string;
  sourceType: string;
  status: string;
  version: number;
  createdAt?: string;
};

export default function Sources() {
  const { workspaceId, subjectId, moduleId } = useParams();
  const navigate = useNavigate();

  const [sources, setSources] = useState<Source[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState("paste");

  const [error, setError] = useState("");

  const id = Number(moduleId);

  useEffect(() => {
    let cancelled = false;

    const loadSources = async () => {
      if (!moduleId || Number.isNaN(id)) {
        if (!cancelled) {
          setError("Invalid module.");
          setLoading(false);
        }

        return;
      }

      try {
        const data = await getSources(id);

        if (!cancelled) {
          setSources(data);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load sources",
          );

          setLoading(false);
        }
      }
    };

    loadSources();

    return () => {
      cancelled = true;
    };
  }, [moduleId, id]);

  const reloadSources = async () => {
    if (!moduleId || Number.isNaN(id)) return;

    try {
      const data = await getSources(id);
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    }
  };

  const resetForm = () => {
    setText("");
    setSourceType("paste");
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreateSource = async () => {
    if (!moduleId) return;

    if (!text.trim()) {
      setError("Source text is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createSources(id, text.trim());

      resetForm();

      await reloadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create source");
    } finally {
      setCreating(false);
    }
  };

  const handleEditSource = async () => {
    if (!moduleId || editingId === null) return;

    if (!text.trim()) {
      setError("Source text is required.");
      return;
    }

    try {
      setEditing(true);
      setError("");

      await updateSource(editingId, id, text.trim());

      resetForm();

      await reloadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update source");
    } finally {
      setEditing(false);
    }
  };

  const openEditForm = (source: Source) => {
    setEditingId(source.id);
    setText(source.text);
    setSourceType(source.sourceType);
    setShowForm(true);
    setError("");
  };

  const handleProcess = async (sourceId: number) => {
    if (!moduleId) return;

    try {
      setProcessingId(sourceId);
      setError("");

      await sourceProcess(sourceId, id);

      await reloadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process source");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/subjects/${subjectId}/modules`,
              )
            }
            className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Modules
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">Sources</h1>

          <p className="mt-1 text-sm text-gray-500">
            Add learning material and generate concepts from it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setError("");
            }
          }}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={18} />
          Add Source
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Add / Edit Source Form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId !== null ? "Edit Source" : "Add Source"}
          </h2>

          {editingId !== null && (
            <p className="mt-1 text-sm text-gray-500">
              Saving changes will create a new source version.
            </p>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Source Type
              </label>

              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              >
                <option value="paste">Paste Text</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Learning Material
              </label>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                placeholder="Paste your learning material here..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  editingId !== null ? handleEditSource : handleCreateSource
                }
                disabled={creating || editing}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {creating
                  ? "Adding..."
                  : editing
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Add Source"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-500">
          Loading sources...
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <FileText className="mx-auto text-gray-300" size={42} />

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No sources yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Add learning material to this module.
          </p>

          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                    <FileText size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {source.sourceType}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                        Version {source.version}
                      </span>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                        {source.status}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {source.text}
                    </p>
                  </div>
                </div>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => openEditForm(source)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => handleProcess(source.id)}
                  disabled={processingId === source.id}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {processingId === source.id ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Brain size={17} />
                  )}

                  {processingId === source.id
                    ? "Processing..."
                    : "Process Source"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/workspaces/${workspaceId}/subjects/${subjectId}/modules/${moduleId}/sources/${source.id}/concepts`,
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Brain size={17} />
                  Review Concepts
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
