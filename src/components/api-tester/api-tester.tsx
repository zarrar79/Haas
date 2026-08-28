"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  API_ENDPOINT_GROUPS,
  buildEndpointPath,
  type ApiEndpoint,
  type HttpMethod,
} from "@/lib/api-endpoint-catalog";
import { ApiRequestError, callAppApi } from "@/lib/client-api";

type TesterResult = {
  ok: boolean;
  httpStatus?: number;
  durationMs: number;
  body: unknown;
};

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-800",
  POST: "bg-blue-100 text-blue-800",
  PATCH: "bg-amber-100 text-amber-800",
  PUT: "bg-violet-100 text-violet-800",
  DELETE: "bg-red-100 text-red-800",
};

export function ApiTester() {
  const [selectedGroupId, setSelectedGroupId] = useState(
    API_ENDPOINT_GROUPS[0]?.id ?? "",
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState(
    API_ENDPOINT_GROUPS[0]?.endpoints[0]?.id ?? "",
  );
  const [hackathonId, setHackathonId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [extraId, setExtraId] = useState("");
  const [queryString, setQueryString] = useState("");
  const [requestBody, setRequestBody] = useState(
    API_ENDPOINT_GROUPS[0]?.endpoints[0]?.sampleBody ?? "",
  );
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<TesterResult | null>(null);

  const selectedGroup = useMemo(
    () => API_ENDPOINT_GROUPS.find((group) => group.id === selectedGroupId),
    [selectedGroupId],
  );

  const selectedEndpoint = useMemo(
    () =>
      selectedGroup?.endpoints.find(
        (endpoint) => endpoint.id === selectedEndpointId,
      ),
    [selectedGroup, selectedEndpointId],
  );

  function selectEndpoint(endpoint: ApiEndpoint, groupId: string) {
    setSelectedGroupId(groupId);
    setSelectedEndpointId(endpoint.id);
    setRequestBody(endpoint.sampleBody ?? "");
    setResult(null);
  }

  async function sendRequest() {
    if (!selectedEndpoint) return;

    let query = queryString;
    // Smart challenge list: pass Hackathon ID as a query param when filled.
    if (selectedEndpoint.id === "challenge-list-smart" && hackathonId.trim()) {
      const params = new URLSearchParams(
        query.startsWith("?") ? query.slice(1) : query,
      );
      params.set("hackathonId", hackathonId.trim());
      query = params.toString();
    }

    const path = buildEndpointPath(selectedEndpoint.pathTemplate, {
      hackathonId,
      id: resourceId,
      extraId,
      query,
    });

    if (path.includes("{")) {
      setResult({
        ok: false,
        durationMs: 0,
        body: {
          message:
            "Fill in required IDs (hackathonId / id / extraId) before sending.",
          path,
        },
      });
      return;
    }

    setIsSending(true);
    const startedAt = performance.now();

    try {
      const options: { method: string; body?: unknown } = {
        method: selectedEndpoint.method,
      };

      if (
        ["POST", "PATCH", "PUT", "DELETE"].includes(selectedEndpoint.method) &&
        requestBody.trim()
      ) {
        options.body = JSON.parse(requestBody);
      }

      const body = await callAppApi(path, options);
      setResult({
        ok: true,
        durationMs: Math.round(performance.now() - startedAt),
        body,
      });
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      if (error instanceof ApiRequestError) {
        setResult({
          ok: false,
          httpStatus: error.httpStatus,
          durationMs,
          body: error.body ?? { message: error.message },
        });
      } else if (error instanceof SyntaxError) {
        setResult({
          ok: false,
          durationMs,
          body: { message: "Request body is not valid JSON." },
        });
      } else {
        setResult({
          ok: false,
          durationMs,
          body: {
            message: error instanceof Error ? error.message : "Request failed",
          },
        });
      }
    } finally {
      setIsSending(false);
    }
  }

  const resolvedPath = selectedEndpoint
    ? (() => {
        let query = queryString;
        if (
          selectedEndpoint.id === "challenge-list-smart" &&
          hackathonId.trim()
        ) {
          const params = new URLSearchParams(
            query.startsWith("?") ? query.slice(1) : query,
          );
          params.set("hackathonId", hackathonId.trim());
          query = params.toString();
        }
        return buildEndpointPath(selectedEndpoint.pathTemplate, {
          hackathonId,
          id: resourceId,
          extraId,
          query,
        });
      })()
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="max-h-[80vh] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Endpoints
        </p>
        <div className="space-y-4">
          {API_ENDPOINT_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-2 text-sm font-semibold text-zinc-800">
                {group.title}
              </p>
              <ul className="mt-1 space-y-0.5">
                {group.endpoints.map((endpoint) => {
                  const active = endpoint.id === selectedEndpointId;
                  return (
                    <li key={endpoint.id}>
                      <button
                        type="button"
                        onClick={() => selectEndpoint(endpoint, group.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                          active
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-700 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-white/20 text-white"
                              : methodColors[endpoint.method]
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <span className="truncate">{endpoint.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        {selectedEndpoint ? (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${methodColors[selectedEndpoint.method]}`}
                >
                  {selectedEndpoint.method}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {selectedEndpoint.name}
                </h2>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedEndpoint.description ?? selectedEndpoint.pathTemplate}
              </p>
              <p className="mt-2 break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700">
                {resolvedPath}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Hackathon ID"
                name="hackathonId"
                value={hackathonId}
                onChange={(event) => setHackathonId(event.target.value)}
                placeholder="uuid"
              />
              <TextField
                label="Resource ID"
                name="resourceId"
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
                placeholder="uuid"
              />
              <TextField
                label={selectedEndpoint.extraIdLabel ?? "Extra ID"}
                name="extraId"
                value={extraId}
                onChange={(event) => setExtraId(event.target.value)}
                placeholder="optional"
              />
              <TextField
                label="Query string"
                name="query"
                value={queryString}
                onChange={(event) => setQueryString(event.target.value)}
                placeholder="search=ctf&limit=20"
              />
            </div>

            {selectedEndpoint.sampleBody !== undefined ||
            ["POST", "PATCH", "PUT"].includes(selectedEndpoint.method) ? (
              <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
                <span className="font-medium">JSON body</span>
                <textarea
                  value={requestBody}
                  onChange={(event) => setRequestBody(event.target.value)}
                  rows={12}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="{}"
                />
              </label>
            ) : null}

            <div>
              <Button onClick={sendRequest} disabled={isSending}>
                {isSending ? "Sending…" : "Send request"}
              </Button>
            </div>

            {result ? (
              <div className="rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-sm">
                  <span
                    className={
                      result.ok ? "font-medium text-emerald-700" : "font-medium text-red-700"
                    }
                  >
                    {result.ok ? "Success" : "Error"}
                    {result.httpStatus ? ` · HTTP ${result.httpStatus}` : ""}
                  </span>
                  <span className="text-zinc-500">{result.durationMs} ms</span>
                </div>
                <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed text-zinc-800">
                  {JSON.stringify(result.body, null, 2)}
                </pre>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Select an endpoint to test.</p>
        )}
      </section>
    </div>
  );
}
