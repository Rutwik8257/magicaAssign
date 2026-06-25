"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { WorkflowRunRecord } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface HistorySidebarProps {
  workflowId: string;
  onClose: () => void;
}

const statusColors = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
};

const nodeStatusColors = {
  success: "text-green-600",
  failed: "text-red-600",
  skipped: "text-gray-400",
};

export function HistorySidebar({ workflowId, onClose }: HistorySidebarProps) {
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json())
      .then((d: { runs: WorkflowRunRecord[] }) => { setRuns(d.runs || []); setLoading(false); });
  }, [workflowId]);

  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-white border-l border-gray-200 z-20 flex flex-col shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Run History</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-400">Loading...</div>
        ) : runs.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No runs yet</div>
        ) : (
          runs.map((run, idx) => (
            <div key={run.id} className="border-b border-gray-50">
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left"
              >
                {expandedRun === run.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Run #{runs.length - idx}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[run.status]}`}>
                      {run.status}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {run.scope}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })} · {(run.duration / 1000).toFixed(1)}s
                  </div>
                </div>
              </button>

              {expandedRun === run.id && (
                <div className="px-4 pb-3">
                  {run.nodeRuns.map((nr) => (
                    <div key={nr.id} className="flex items-start gap-2 py-1.5 border-t border-gray-50 first:border-0">
                      <span className="text-gray-300 text-xs mt-0.5">├─</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${nodeStatusColors[nr.status]}`}>✓</span>
                          <span className="text-[10px] text-gray-700 font-medium">{nr.nodeLabel}</span>
                          <span className="text-[10px] text-gray-400">{(nr.durationMs / 1000).toFixed(1)}s</span>
                        </div>
                        {nr.output !== undefined && nr.output !== null && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            → {typeof nr.output === "string" ? `"${nr.output.slice(0, 40)}..."` : JSON.stringify(nr.output).slice(0, 40)}
                          </div>
                        )}
                        {nr.error && (
                          <div className="text-[10px] text-red-500 truncate mt-0.5">✗ {nr.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
