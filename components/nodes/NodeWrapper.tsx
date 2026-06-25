"use client";

import { ReactNode, useCallback } from "react";
import { RotateCcw, MoreHorizontal, Play } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { NodeStatus } from "@/lib/types";

interface NodeWrapperProps {
  id: string;
  type: string;
  selected?: boolean;
  title: string;
  undeletable?: boolean;
  onRun?: () => void;
  children: ReactNode;
  estimatedCost?: string;
}

const statusColors: Record<NodeStatus, string> = {
  idle: "",
  running: "shadow-[0_0_0_2px_#8b5cf6,0_0_16px_4px_#8b5cf688] animate-pulse",
  success: "shadow-[0_0_0_2px_#22c55e]",
  error: "shadow-[0_0_0_2px_#ef4444]",
};

export function NodeWrapper({ id, selected, title, undeletable, onRun, children, estimatedCost = "~0.0001 M" }: NodeWrapperProps) {
  const { executionStates } = useWorkflowStore();
  const execState = executionStates[id];
  const status: NodeStatus = execState?.status || "idle";

  const borderClass = selected
    ? "border-purple-400"
    : status === "running"
    ? "border-purple-400"
    : "border-gray-200";

  return (
    <div
      className={`bg-white rounded-xl border ${borderClass} ${statusColors[status]} min-w-[240px] max-w-[300px] transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-800">{title}</span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-gray-100">
            <RotateCcw size={11} className="text-gray-400" />
          </button>
          {onRun && (
            <button
              onClick={onRun}
              disabled={status === "running"}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
            >
              <Play size={8} fill="white" />
              Run
            </button>
          )}
          {!undeletable && (
            <button className="p-1 rounded hover:bg-gray-100">
              <MoreHorizontal size={11} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">{children}</div>

      {/* Footer */}
      <div className="px-3 pb-2 flex justify-end">
        <span className="text-[10px] text-gray-300">{estimatedCost}</span>
      </div>
    </div>
  );
}
