"use client";

import { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ChevronRight, Upload, Plus } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { NodeWrapper } from "./NodeWrapper";

interface GeminiNodeData {
  prompt: string;
  systemPrompt: string;
  model: string;
  response?: string;
  settingsOpen?: boolean;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];

export const GeminiNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as GeminiNodeData;
  const { updateNodeData, executionStates, runNode, edges, nodes } = useWorkflowStore();
  const status = executionStates[id]?.status || "idle";

  const update = useCallback((key: string, value: unknown) => {
    updateNodeData(id, { [key]: value });
  }, [id, updateNodeData]);

  // Resolve connected prompt value from edge (supports request-inputs and gemini sources)
  const promptEdge = edges.find((e) => e.target === id && e.targetHandle === "prompt");
  const connectedPrompt = promptEdge ? (() => {
    const sourceNode = nodes.find((n) => n.id === promptEdge.source);
    if (sourceNode?.type === "request-inputs") {
      const fields = (sourceNode.data as { fields?: Array<{ id: string; type: string; value: string }> }).fields || [];
      const field = promptEdge.sourceHandle ? fields.find((f) => f.id === promptEdge.sourceHandle) : fields.find((f) => f.type === "text_field");
      return field?.value || "";
    }
    if (sourceNode?.type === "gemini") {
      return (sourceNode.data as { response?: string }).response || "(waiting for Gemini response...)";
    }
    return "";
  })() : null;

  const displayPrompt = connectedPrompt !== null ? connectedPrompt : (nodeData.prompt || "");

  return (
    <NodeWrapper id={id} type="gemini" selected={selected} title="Gemini 3.1 Pro" estimatedCost="~0.0001 M" onRun={() => runNode(id)}>
      {/* Model selector */}
      <div className="mb-2">
        <select
          value={nodeData.model || "gemini-2.5-flash"}
          onChange={(e) => update("model", e.target.value)}
          className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 text-gray-600 outline-none focus:border-purple-300 bg-white"
        >
          {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Prompt */}
      <div className="mb-2 relative">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-[10px] font-medium text-gray-600">Prompt*</span>
          <Handle
            type="target" position={Position.Left} id="prompt"
            style={{ left: -8, background: "#f97316", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <textarea
          value={displayPrompt}
          onChange={(e) => { if (!connectedPrompt) update("prompt", e.target.value); }}
          placeholder={connectedPrompt !== null ? "Connected from input" : "Enter your prompt..."}
          readOnly={connectedPrompt !== null}
          className={`w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 resize-none h-16 outline-none focus:border-purple-300 ${connectedPrompt !== null ? "text-purple-600 bg-purple-50 border-purple-200 cursor-default" : ""}`}
        />
      </div>

      {/* System Prompt */}
      <div className="mb-2 relative">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-[10px] font-medium text-gray-600">System Prompt</span>
            <Handle
              type="target" position={Position.Left} id="system-prompt"
              style={{ left: -8, background: "#f97316", width: 10, height: 10, border: "2px solid white" }}
            />
          </div>
          <button className="text-gray-300 hover:text-gray-500"><Plus size={10} /></button>
        </div>
        <textarea
          value={nodeData.systemPrompt || ""}
          onChange={(e) => update("systemPrompt", e.target.value)}
          placeholder="System instructions..."
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 resize-none h-14 outline-none focus:border-purple-300"
        />
      </div>

      {/* Image Vision */}
      <div className="mb-1.5 relative flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] text-gray-500">Image (Vision)</span>
          <Handle
            type="target" position={Position.Left} id="image-vision"
            style={{ left: -8, background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <button className="text-[10px] text-gray-400 flex items-center gap-0.5 hover:text-gray-600">
          <Upload size={9} /> Upload Image
        </button>
        <button className="text-gray-300 hover:text-gray-500"><Plus size={10} /></button>
      </div>

      {/* Video */}
      <div className="mb-1.5 relative flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] text-gray-500">Video</span>
          <Handle
            type="target" position={Position.Left} id="video"
            style={{ left: -8, background: "#22c55e", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <button className="text-[10px] text-gray-400 flex items-center gap-0.5 hover:text-gray-600">
          <Upload size={9} /> Upload Video
        </button>
        <button className="text-gray-300 hover:text-gray-500"><Plus size={10} /></button>
      </div>

      {/* Audio */}
      <div className="mb-2 relative flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
          <span className="text-[10px] text-gray-500">Audio</span>
          <Handle
            type="target" position={Position.Left} id="audio"
            style={{ left: -8, background: "#06b6d4", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <button className="text-[10px] text-gray-400 flex items-center gap-0.5 hover:text-gray-600">
          <Upload size={9} /> Upload Audio
        </button>
        <button className="text-gray-300 hover:text-gray-500"><Plus size={10} /></button>
      </div>

      {/* Settings (collapsed) */}
      <button
        onClick={() => update("settingsOpen", !nodeData.settingsOpen)}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 mb-2"
      >
        <ChevronRight size={10} className={`transition-transform ${nodeData.settingsOpen ? "rotate-90" : ""}`} />
        Settings
      </button>
      {nodeData.settingsOpen && (
        <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500">Temperature</span>
            <input
              type="number" min={0} max={2} step={0.1}
              value={nodeData.temperature ?? 0.7}
              onChange={(e) => update("temperature", parseFloat(e.target.value))}
              className="w-12 text-[10px] border border-gray-200 rounded px-1 text-right outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Max Tokens</span>
            <input
              type="number" min={1} max={8192}
              value={nodeData.maxTokens ?? 2048}
              onChange={(e) => update("maxTokens", parseInt(e.target.value))}
              className="w-16 text-[10px] border border-gray-200 rounded px-1 text-right outline-none"
            />
          </div>
        </div>
      )}

      {/* Response */}
      <div className="border-t border-gray-100 pt-2 relative">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-[10px] font-medium text-gray-600">Response</span>
          <Handle
            type="source" position={Position.Right} id="response"
            style={{ right: -8, background: "#f97316", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <div className="text-[10px] text-gray-400 italic min-h-[2rem]">
          {status === "running" ? (
            <span className="text-purple-500 animate-pulse">Running...</span>
          ) : nodeData.response ? (
            <span className="text-gray-700 not-italic line-clamp-3">{nodeData.response}</span>
          ) : (
            "No output yet"
          )}
        </div>
      </div>
    </NodeWrapper>
  );
});

GeminiNode.displayName = "GeminiNode";
