import { createSubject, getSubjects } from "@/api/subjectapi";
import CreateDialog from "@/layout/CreateDialog";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

type SubjectForm = {
  id: number;
  name: string;
  description?: string;
  tags?: string;
};

const cardAccents = [
  "border-l-4 border-l-amber-500",
  "border-l-4 border-l-sky-500",
  "border-l-4 border-l-emerald-500",
  "border-l-4 border-l-indigo-500",
  "border-l-4 border-l-rose-500",
];

const Subject = () => {
  const [subjects, setSubjects] = useState<SubjectForm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const { workspaceId } = useParams();

  const id = Number(workspaceId);

  async function loadData() {
    try {
      const totalSubjects = await getSubjects(id);
      setSubjects(totalSubjects);
    } catch {
      setError("Fetching subjects went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleSubjectspace = async (
    name: string,
    description: string,
    tags: string,
  ) => {
    await createSubject(id, name, description, tags);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          My Subjects
        </h1>
        <CreateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Create Subject"
          onSubmit={handleSubjectspace}
          trigger={
            <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition cursor-pointer gap-2">
              <Plus size={16} /> New Subject
            </span>
          }
        />
      </div>
      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && subjects.length === 0 && (
        <p className="text-gray-500">
          No subjects yet — create one to get started.
        </p>
      )}
      {!loading && !error && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sb, i) => (
            <Card
              key={sb.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 ${cardAccents[i % cardAccents.length]}`}
              onClick={() => navigate(`/workspaces/${workspaceId}/subjects/${sb.id}/modules`)}
            >
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  {sb.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">
                  {sb.description || "No description"}
                </p>
                {sb.tags && (
                  <p className="text-xs text-indigo-600 mt-2">{sb.tags}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Subject;
