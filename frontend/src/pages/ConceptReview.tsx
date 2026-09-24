import { getConcepts, acceptConcept, rejectConcept, editConcept, mergeConcepts } from "@/api/conceptapi";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type ConceptForm = {
  id: number;
  title: string;
  definition: string;
  facts: string;
  status: string;
};

const statusColors: Record<string, string> = {
  suggested: "bg-gray-100 text-gray-700",
  accepted: "bg-emerald-100 text-emerald-700",
  edited: "bg-sky-100 text-sky-700",
  rejected: "bg-rose-100 text-rose-700",
  merged: "bg-purple-100 text-purple-700",
};

const factColors = ["text-indigo-600", "text-emerald-600", "text-amber-600", "text-rose-600"];

const ConceptReview = () => {
  const [concepts, setConcepts] = useState<ConceptForm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editFacts, setEditFacts] = useState("");
  const [mergeKeepId, setMergeKeepId] = useState<number | null>(null);
const [mergeId, setMergeId] = useState<number | null>(null);

  const { sourceId } = useParams();
  const id = Number(sourceId);

  async function loadData() {
    try {
      const totalConcepts = await getConcepts(id);
      setConcepts(totalConcepts);
    } catch {
      setError("Fetching concepts went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleAccept = async (conceptId: number) => {
    await acceptConcept(conceptId);
    loadData();
  };

  const handleReject = async (conceptId: number) => {
    await rejectConcept(conceptId);
    loadData();
  };

  const startEdit = (concept: ConceptForm) => {
    setEditingId(concept.id);
    setEditTitle(concept.title);
    setEditDefinition(concept.definition);
    setEditFacts(JSON.parse(concept.facts).join(", "));
  };

  const saveEdit = async (conceptId: number) => {
    const factsArray = editFacts.split(",").map((f) => f.trim()).filter(Boolean);
    await editConcept(conceptId, editTitle, editDefinition, factsArray);
    setEditingId(null);
    loadData();
  };

  const handleMerge = async() => {
    if(mergeKeepId === null || mergeId === null) return;
    try{
      await mergeConcepts(mergeKeepId, mergeId);
      setMergeKeepId(null);
      setMergeId(null);
      await loadData()
    } catch {
      setError("Failed to merge concepts");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Review Concepts</h1>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && concepts.length === 0 && (
        <p className="text-gray-500">No concepts yet — process a source to generate some.</p>
      )}

      {mergeKeepId !== null && (
  <div className="mb-6 rounded-lg border bg-white p-4">
    <h2 className="font-semibold text-gray-900">
      Select a concept to merge
    </h2>

    <p className="text-sm text-gray-500 mt-1">
      The selected concept will be kept. Choose another concept to merge into it.
    </p>

    <div className="flex flex-wrap gap-2 mt-4">
      {concepts
        .filter((concept) => concept.id !== mergeKeepId)
        .map((concept) => (
          <Button
            key={concept.id}
            size="sm"
            variant="outline"
            onClick={() => setMergeId(concept.id)}
          >
            {concept.title}
          </Button>
        ))}
    </div>

    {mergeId !== null && (
      <div className="mt-4 border-t pt-4">
        <p className="text-sm">
          <strong>Keep:</strong>{" "}
          {concepts.find((c) => c.id === mergeKeepId)?.title}
        </p>

        <p className="text-sm">
          <strong>Merge:</strong>{" "}
          {concepts.find((c) => c.id === mergeId)?.title}
        </p>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleMerge}
          >
            Confirm Merge
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMergeKeepId(null);
              setMergeId(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )}
  </div>
)}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {concepts.map((concept) => (
          <Card key={concept.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {editingId === concept.id ? (
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                ) : (
                  concept.title
                )}
              </CardTitle>
              <Badge className={statusColors[concept.status] || "bg-gray-100 text-gray-700"}>
                {concept.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1">
              {editingId === concept.id ? (
                <>
                  <Textarea
                    value={editDefinition}
                    onChange={(e) => setEditDefinition(e.target.value)}
                    className="mb-2"
                  />
                  <Textarea
                    value={editFacts}
                    onChange={(e) => setEditFacts(e.target.value)}
                    placeholder="Facts, comma separated"
                  />
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">{concept.definition}</p>
                  <ul className="space-y-1">
                    {JSON.parse(concept.facts).map((fact: string, i: number) => (
                      <li key={i} className={`text-sm flex gap-2 ${factColors[i % factColors.length]}`}>
                        <span>●</span>
                        <span className="text-gray-700">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
              {editingId === concept.id ? (
                <>
                  <Button size="sm" onClick={() => saveEdit(concept.id)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="default" onClick={() => handleAccept(concept.id)}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(concept)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(concept.id)}>Reject</Button>
                  <Button size="sm" variant="secondary" onClick={() => {setMergeKeepId(concept.id); setMergeId(null);}}>Merge</Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default ConceptReview;