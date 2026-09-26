import {
  getConcepts,
  acceptConcept,
  rejectConcept,
  editConcept,
  mergeConcepts,
} from "@/api/conceptapi";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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

const factColors = [
  "text-indigo-600",
  "text-emerald-600",
  "text-amber-600",
  "text-rose-600",
];

const ConceptReview = () => {
  const [concepts, setConcepts] = useState<ConceptForm[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");

  const [editDefinition, setEditDefinition] = useState("");

  const [editFacts, setEditFacts] = useState("");

  const [mergeKeepId, setMergeKeepId] = useState<number | null>(null);

  const [mergeId, setMergeId] = useState<number | null>(null);

  const { workspaceId, subjectId, moduleId, sourceId } = useParams();

  const navigate = useNavigate();

  const id = Number(sourceId);

  useEffect(() => {
    let cancelled = false;

    const loadConcepts = async () => {
      if (!sourceId || Number.isNaN(id)) {
        if (!cancelled) {
          setError("Invalid source");
          setLoading(false);
        }

        return;
      }

      try {
        const totalConcepts = await getConcepts(id);

        if (!cancelled) {
          setConcepts(totalConcepts);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Fetching concepts went wrong");
          setLoading(false);
        }
      }
    };

    loadConcepts();

    return () => {
      cancelled = true;
    };
  }, [sourceId, id]);

  const reloadConcepts = async () => {
    try {
      const totalConcepts = await getConcepts(id);

      setConcepts(totalConcepts);
      setError(null);
    } catch {
      setError("Fetching concepts went wrong");
    }
  };

  const handleAccept = async (conceptId: number) => {
    try {
      await acceptConcept(conceptId);
      await reloadConcepts();
    } catch {
      setError("Failed to accept concept");
    }
  };

  const handleReject = async (conceptId: number) => {
    try {
      await rejectConcept(conceptId);
      await reloadConcepts();
    } catch {
      setError("Failed to reject concept");
    }
  };

  const startEdit = (concept: ConceptForm) => {
    setEditingId(concept.id);
    setEditTitle(concept.title);
    setEditDefinition(concept.definition);

    try {
      setEditFacts(JSON.parse(concept.facts).join(", "));
    } catch {
      setEditFacts("");
    }
  };

  const saveEdit = async (conceptId: number) => {
    try {
      const factsArray = editFacts
        .split(",")
        .map((fact) => fact.trim())
        .filter(Boolean);

      await editConcept(conceptId, editTitle, editDefinition, factsArray);

      setEditingId(null);

      await reloadConcepts();
    } catch {
      setError("Failed to edit concept");
    }
  };

  const handleMerge = async () => {
    if (mergeKeepId === null || mergeId === null) {
      return;
    }

    try {
      await mergeConcepts(mergeKeepId, mergeId);

      setMergeKeepId(null);
      setMergeId(null);

      await reloadConcepts();
    } catch {
      setError("Failed to merge concepts");
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Review Concepts
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review and manage concepts extracted from this source.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* ADDED: Go to Module button */}
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/subjects/${subjectId}/modules/${moduleId}`,
              )
            }
          >
            Go to Module
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/subjects/${subjectId}/modules/${moduleId}/sources`,
              )
            }
          >
            Back to Sources
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && concepts.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No concepts yet — process this source to generate some.
          </p>
        </div>
      )}

      {/* Merge selection */}
      {mergeKeepId !== null && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <h2 className="font-semibold text-gray-900">
            Select a concept to merge
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The selected concept will be kept. Choose another concept to merge
            into it.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
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
                {concepts.find((concept) => concept.id === mergeKeepId)?.title}
              </p>

              <p className="text-sm">
                <strong>Merge:</strong>{" "}
                {concepts.find((concept) => concept.id === mergeId)?.title}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={handleMerge}>
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

      {/* Concepts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((concept) => (
          <Card key={concept.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-lg">
                {editingId === concept.id ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                ) : (
                  concept.title
                )}
              </CardTitle>

              <Badge
                className={
                  statusColors[concept.status] || "bg-gray-100 text-gray-700"
                }
              >
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
                  <p className="mb-3 text-sm text-gray-600">
                    {concept.definition}
                  </p>

                  <ul className="space-y-1">
                    {(() => {
                      try {
                        const facts = JSON.parse(concept.facts);

                        return facts.map((fact: string, i: number) => (
                          <li
                            key={i}
                            className={`
                                flex gap-2
                                text-sm
                                ${factColors[i % factColors.length]}
                              `}
                          >
                            <span>●</span>

                            <span className="text-gray-700">{fact}</span>
                          </li>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </ul>
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2">
              {editingId === concept.id ? (
                <>
                  <Button size="sm" onClick={() => saveEdit(concept.id)}>
                    Save
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => handleAccept(concept.id)}>
                    Accept
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(concept)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(concept.id)}
                  >
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setMergeKeepId(concept.id);
                      setMergeId(null);
                    }}
                  >
                    Merge
                  </Button>
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