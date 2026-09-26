import { createWorkSpace, getWorkspaces } from "@/api/workspaceapi";
import CreateDialog from "@/layout/CreateDialog";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

type WorkspaceForm = {
  id: number;
  name: string;
  description?: string;
  tags?: string;
};

const cardAccents = [
  "border-l-4 border-l-indigo-500",
  "border-l-4 border-l-emerald-500",
  "border-l-4 border-l-amber-500",
  "border-l-4 border-l-rose-500",
  "border-l-4 border-l-sky-500",
];

const WorkSpace = () => {
  const [workSpaces, setWorkSpaces] = useState<WorkspaceForm[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const navigate = useNavigate();

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const totalWorkSpaces = await getWorkspaces();

      setWorkSpaces(totalWorkSpaces);
    } catch {
      setError("Fetching workspaces went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleCreateWorkspace = async (
    name: string,
    description: string,
    tags: string,
  ) => {
    await createWorkSpace(name, description, tags);

    await loadData();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div
        className="
          mb-6
          flex flex-col gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Workspaces</h1>

          <p className="mt-1 text-sm text-gray-500">
            Select a workspace to view its subjects.
          </p>
        </div>

        <div className="shrink-0">
          <CreateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Create Workspace"
            onSubmit={handleCreateWorkspace}
            trigger={
              <span
                className="
                  inline-flex
                  w-fit
                  cursor-pointer
                  items-center
                  justify-center
                  gap-2
                  whitespace-nowrap
                  rounded-lg
                  bg-indigo-600
                  px-4 py-2
                  text-sm font-medium
                  text-white
                  transition
                  hover:bg-indigo-700
                "
              >
                <Plus size={16} />
                New Workspace
              </span>
            }
          />
        </div>
      </div>

      {/* Loading */}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Empty State */}
      {!loading && !error && workSpaces.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No workspaces yet — create one to get started.
          </p>
        </div>
      )}

      {/* Workspace Cards */}
      {!loading && !error && workSpaces.length > 0 && (
        <div
          className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              xl:grid-cols-3
            "
        >
          {workSpaces.map((workspace, i) => (
            <Card
              key={workspace.id}
              className={`
                  cursor-pointer
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-lg
                  ${cardAccents[i % cardAccents.length]}
                `}
              onClick={() => navigate(`/workspaces/${workspace.id}/subjects`)}
            >
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  {workspace.name}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-500">
                  {workspace.description || "No description"}
                </p>

                {workspace.tags && (
                  <p className="mt-2 text-xs text-indigo-600">
                    {workspace.tags}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkSpace;
