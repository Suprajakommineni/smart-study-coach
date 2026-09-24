import { createSources, getSources, sourceProcess } from "@/api/sourceapi";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SourceForm = {
  id: number;
  text: string;
  status: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  processed: "bg-emerald-100 text-emerald-700",
  "needs review": "bg-amber-100 text-amber-700",
};

const Source = () => {
  const [text, setText] = useState("");
  const [sourcesList, setSourcesList] = useState<SourceForm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { moduleId } = useParams();
  const modId = Number(moduleId);
  const navigate = useNavigate();

  async function loadData() {
    try {
      const totalSources = await getSources(modId);
      setSourcesList(totalSources);
    } catch {
      setError("Fetching sources went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleCreateSource = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await createSources(modId, text);
      setText("");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleProcess = async (sourceId: number) => {
    await sourceProcess(sourceId, modId);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Sources</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Paste your notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your notes here..."
            className="min-h-37.5 mb-4"
          />
          <Button onClick={handleCreateSource} disabled={saving || !text.trim()}>
            {saving ? "Saving..." : "Save Source"}
          </Button>
        </CardContent>
      </Card>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && sourcesList.length === 0 && (
        <p className="text-gray-500">No sources yet — paste your notes above to get started.</p>
      )}

      {!loading && !error && sourcesList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sourcesList.map((source) => (
            <Card key={source.id} className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-gray-500">Source #{source.id}</CardTitle>
                <Badge className={statusColors[source.status] || "bg-gray-100 text-gray-700"}>
                  {source.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 line-clamp-3 mb-4">{source.text}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleProcess(source.id)}
                    disabled={source.status === "processed"}
                  >
                    {source.status === "processed" ? "Processed" : "Process"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/sources/${source.id}/concepts`)}
                  >
                    View Concepts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Source;