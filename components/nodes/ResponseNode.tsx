"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NodeWrapper } from "./NodeWrapper";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface ResponseResult {
  sourceId: string;
  label: string;
  value?: string;
}

interface ResponseNodeData {
  results: ResponseResult[];
  [key: string]: unknown;
}

export const ResponseNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ResponseNodeData;
  const { runNode, edges } = useWorkflowStore();

  // Get all edges pointing to this node to show a handle per connection
  const incomingEdges = edges.filter((e) => e.target === id);

  return (
    <NodeWrapper id={id} type="response" selected={selected} title="Response" undeletable estimatedCost="" onRun={() => runNode(id)}>
      <div className="relative">
        {/* Dynamic handles for each incoming edge */}
        {incomingEdges.length > 0 ? incomingEdges.map((e, i) => (
          <Handle
            key={e.id}
            type="target"
            position={Position.Left}
            id={e.targetHandle || "result"}
            style={{ left: -8, top: `${20 + i * 28}px`, background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
          />
        )) : (
          <Handle
            type="target"
            position={Position.Left}
            id="result"
            style={{ left: -8, top: "50%", background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
          />
        )}
        <div className="flex items-center gap-1 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] font-medium text-gray-600">result</span>
        </div>
        {nodeData.results?.length > 0 ? (
          nodeData.results.map((r) => (
            <div key={r.sourceId} className="mb-2">
              <div className="text-[10px] text-gray-500 font-mono mb-0.5">{r.label}</div>
              <div className="text-[10px] text-gray-700 bg-gray-50 rounded p-1.5 border border-gray-100 min-h-[2rem] break-words">
                {r.value?.startsWith("data:image") ? (
                  <img src={r.value} alt="output" className="w-full object-contain rounded" />
                ) : (
                  r.value || "No output yet"
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-gray-400 italic">Connect Gemini or Crop Image output here</div>
        )}
      </div>
    </NodeWrapper>
  );
});

ResponseNode.displayName = "ResponseNode";
