"use client";

import { useEffect, useState, useCallback } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { ActivityIcon, Loader2Icon, RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AgentRun, AgentRunStatus } from "@/lib/db/sqlite-schema";

interface RunsResponse {
  runs: AgentRun[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_COLORS: Record<AgentRunStatus, string> = { running: "bg-yellow-500", succeeded: "bg-green-500", failed: "bg-red-500", cancelled: "bg-gray-500" };
const STATUS_LABELS: Record<AgentRunStatus, string> = { running: "Running", succeeded: "Succeeded", failed: "Failed", cancelled: "Cancelled" };

export default function AdminRunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AgentRunStatus | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const loadRuns = useCallback(async (page: number = 1) => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (pipelineFilter) params.set("pipelineName", pipelineFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/runs?${params}`);
      if (!res.ok) throw new Error("Failed to load runs");
      const data = (await res.json()) as RunsResponse;
      setRuns(data.runs); setPagination(data.pagination);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load runs"); } finally { setLoading(false); }
  }, [pipelineFilter, statusFilter]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const formatDuration = (ms: number | null) => { if (!ms) return "-"; if (ms < 1000) return `${ms}ms`; if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`; return `${(ms / 60000).toFixed(1)}m`; };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  return (
    <Shell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-terminal-border bg-terminal-cream p-4">
          <div className="flex items-center gap-3">
            <ActivityIcon className="size-6 text-terminal-green" />
            <div>
              <h1 className="font-mono text-xl font-bold text-terminal-dark">Agent Runs</h1>
              <p className="font-mono text-sm text-terminal-muted">View and inspect agent run history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn(showFilters && "bg-terminal-green/10")}><FilterIcon className="mr-1 size-4" />Filters</Button>
            <Button variant="outline" size="sm" onClick={() => loadRuns(pagination.page)}><RefreshCwIcon className="mr-1 size-4" />Refresh</Button>
          </div>
        </div>
        {showFilters && (
          <div className="flex items-center gap-4 border-b border-terminal-border bg-terminal-cream/50 p-3">
            <div className="flex items-center gap-2">
              <label className="font-mono text-sm text-terminal-muted">Pipeline:</label>
              <select value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)} className="rounded border border-terminal-border bg-white px-2 py-1 font-mono text-sm">
                <option value="">All</option><option value="chat">chat</option><option value="enhance-prompt">enhance-prompt</option><option value="deep-research">deep-research</option><option value="web-browse">web-browse</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-mono text-sm text-terminal-muted">Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AgentRunStatus | "")} className="rounded border border-terminal-border bg-white px-2 py-1 font-mono text-sm">
                <option value="">All</option><option value="running">Running</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            {(pipelineFilter || statusFilter) && <Button variant="ghost" size="sm" onClick={() => { setPipelineFilter(""); setStatusFilter(""); }}><XIcon className="mr-1 size-4" />Clear</Button>}
          </div>
        )}
        <div className="flex-1 overflow-auto bg-terminal-cream p-4">
          {loading ? <div className="flex h-full items-center justify-center"><Loader2Icon className="size-6 animate-spin text-terminal-muted" /></div>
          : error ? <div className="flex h-full items-center justify-center"><p className="font-mono text-red-500">{error}</p></div>
          : runs.length === 0 ? <div className="flex h-full items-center justify-center"><p className="font-mono text-terminal-muted">No runs found</p></div>
          : <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead><tr className="border-b border-terminal-border text-left"><th className="p-2 font-medium text-terminal-muted">Status</th><th className="p-2 font-medium text-terminal-muted">Pipeline</th><th className="p-2 font-medium text-terminal-muted">Started</th><th className="p-2 font-medium text-terminal-muted">Duration</th><th className="p-2 font-medium text-terminal-muted">Session</th><th className="p-2 font-medium text-terminal-muted">Actions</th></tr></thead>
                <tbody>{runs.map((run) => (
                  <tr key={run.id} className="border-b border-terminal-border/50 hover:bg-terminal-green/5">
                    <td className="p-2"><span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", STATUS_COLORS[run.status])} />{STATUS_LABELS[run.status]}</span></td>
                    <td className="p-2 text-terminal-dark">{run.pipelineName}</td>
                    <td className="p-2 text-terminal-muted">{formatDate(run.startedAt)}</td>
                    <td className="p-2 text-terminal-muted">{formatDuration(run.durationMs)}</td>
                    <td className="p-2"><span className="text-xs text-terminal-muted">{run.sessionId.slice(0, 8)}...</span></td>
                    <td className="p-2"><Link href={`/admin/runs/${run.id}`} className="text-terminal-green hover:underline">View Details</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-terminal-border bg-terminal-cream p-3">
            <p className="font-mono text-sm text-terminal-muted">Showing {runs.length} of {pagination.total} runs</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => loadRuns(pagination.page - 1)}><ChevronLeftIcon className="size-4" /></Button>
              <span className="font-mono text-sm text-terminal-muted">Page {pagination.page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => loadRuns(pagination.page + 1)}><ChevronRightIcon className="size-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}