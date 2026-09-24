import CreateDialog from "@/layout/CreateDialog";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { createModule, getModules } from "@/api/moduleapi";
import { useNavigate } from "react-router-dom";

type ModuleForm = {
  id: number;
  name: string;
  description?: string;
  tags?: string;
};

const cardAccents = [
  "border-l-4 border-l-rose-500",
  "border-l-4 border-l-emerald-500",
  "border-l-4 border-l-sky-500",
  "border-l-4 border-l-indigo-500",
  "border-l-4 border-l-amber-500",
];

const Module = () => {
  const [modules, setModules] = useState<ModuleForm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
 const navigate = useNavigate()
  const { workspaceId, subjectId } = useParams();
  const workId = Number(workspaceId);
  const subId = Number(subjectId);
  


  async function loadData() {
    try {
      const totalModules = await getModules(workId, subId);
      setModules(totalModules);
    } catch {
      setError("Fetching modules went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleModulespace = async (
    name: string,
    description: string,
    tags: string,
  ) => {
    await createModule(workId, subId, name, description, tags);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          My Modules
        </h1>
        <CreateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Create Module"
          onSubmit={handleModulespace}
          trigger={
            <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer gap-2">
              <Plus size={16} /> New Module
            </span>
          }
        />
      </div>
      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && modules.length === 0 && (
        <p className="text-gray-500">
          No modules yet — create one to get started.
        </p>
      )}
      {!loading && !error && modules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((md, i) => (
            <Card
              key={md.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 ${cardAccents[i % cardAccents.length]}`}
              onClick={() => navigate(`/modules/${md.id}/sources`)}
            >
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  {md.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">
                  {md.description || "No description"}
                </p>
                {md.tags && (
                  <p className="text-xs text-indigo-600 mt-2">{md.tags}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Module;
