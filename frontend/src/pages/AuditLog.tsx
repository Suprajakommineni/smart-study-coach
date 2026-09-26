import { useEffect, useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { getAuditLogs } from "../api/auditlogapi";

type AuditLogItem = {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  beforeData: string | null;
  afterData: string | null;
  createdAt: string;
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);

        const data = await getAuditLogs();

        setLogs(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit logs",
        );
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatJson = (value: string | null) => {
    if (!value) return "No data";

    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">Loading audit logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-3">
          <ClipboardList size={22} className="text-violet-700" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

          <p className="text-sm text-gray-500">
            Track changes and activities in your workspace
          </p>
        </div>
      </div>

      {/* Empty state */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />

          <h2 className="font-semibold text-gray-700">No audit logs yet</h2>

          <p className="mt-1 text-sm text-gray-500">
            Activities will appear here as you use the application.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Entity
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Entity ID
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => {
                  const expanded = expandedId === log.id;

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-gray-700">
                        {log.entityType}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        #{log.entityId}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                        >
                          {expanded ? (
                            <>
                              <ChevronUp size={17} />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown size={17} />
                              View
                            </>
                          )}
                        </button>
                      </td>

                      {expanded && (
                        <td colSpan={5} className="bg-gray-50 px-5 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Before
                              </p>

                              <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700">
                                {formatJson(log.beforeData)}
                              </pre>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                After
                              </p>

                              <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700">
                                {formatJson(log.afterData)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-gray-100 md:hidden">
            {logs.map((log) => {
              const expanded = expandedId === log.id;

              return (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                        {formatAction(log.action)}
                      </span>

                      <p className="mt-2 text-sm font-medium text-gray-800">
                        {log.entityType} #{log.entityId}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      {expanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Before
                        </p>

                        <pre className="max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                          {formatJson(log.beforeData)}
                        </pre>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          After
                        </p>

                        <pre className="max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                          {formatJson(log.afterData)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
