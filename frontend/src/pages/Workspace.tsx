import { createWorkSpace, getWorkspaces } from "@/api/workspaceapi";
import CreateDialog from "@/layout/CreateDialog";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from 'lucide-react';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  async function loadData() {
    try {
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

  const handleCreateWorkspace = async (name: string, description: string, tags: string) => {
    await createWorkSpace(name, description, tags);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Workspaces</h1>
        <CreateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Create Workspace"
          onSubmit={handleCreateWorkspace}
          trigger={
            <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer gap-2">
              <Plus size={16}/> New Workspace
            </span>
          }
        />
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && workSpaces.length === 0 && (
        <p className="text-gray-500">No workspaces yet — create one to get started.</p>
      )}

      {!loading && !error && workSpaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workSpaces.map((ws, i) => (
            <Card
              key={ws.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 ${cardAccents[i % cardAccents.length]}`}
              onClick={() => navigate(`/workspaces/${ws.id}/subjects`)}
            >
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">{ws.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">{ws.description || "No description"}</p>
                {ws.tags && (
                  <p className="text-xs text-indigo-600 mt-2">{ws.tags}</p>
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