import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { getSubjects, createSubject } from "../api/subjectapi";
import CreateDialog from "../layout/CreateDialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";

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
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleCreate = async (
    name: string,
    description: string,
    tags: string,
  ) => {
    if (!workspaceId) return;

    try {
      setError("");

      await createSubject(
        id,
        name,
        description || undefined,
        tags || undefined,
      );

      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subject");
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

        <CreateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Create Subject"
          onSubmit={handleCreate}
          trigger={
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700">
              <Plus size={18} />
              Add Subject
            </span>
          }
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
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
            <Card
              key={subject.id}
              className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/subjects/${subject.id}/modules`,
                )
              }
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                    <BookOpen size={20} />
                  </div>

                  <CardTitle className="text-lg text-gray-900">
                    {subject.name}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {subject.description || "No description available."}
                </p>

                <div className="mt-5 text-sm font-medium text-violet-600">
                  Open Modules →
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
