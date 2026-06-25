"use client";

import { useEffect, useCallback, useRef, useState, use } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  BackgroundVariant,
  useReactFlow,
  Panel,
  ReactFlowProvider,
  Connection,
  Edge,
  Node,
  IsValidConnection,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useEdges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { RequestInputsNode } from "@/components/nodes/RequestInputsNode";
import { CropImageNode } from "@/components/nodes/CropImageNode";
import { GeminiNode } from "@/components/nodes/GeminiNode";
import { ResponseNode } from "@/components/nodes/ResponseNode";
import { NodePicker } from "@/components/canvas/NodePicker";
import { HistorySidebar } from "@/components/canvas/HistorySidebar";
import { ArrowLeft, Play, Clock, FileDown, Plus, ChevronLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";

function DeleteEdge({ id, sourceX, sourceY, targetX, targetY, selected }: {
  id: string; sourceX: number; sourceY: number; targetX: number; targetY: number;
  selected?: boolean;
}) {
  const { setEdges } = useWorkflowStore();
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: selected ? "#7c3aed" : "#8b5cf6", strokeWidth: 2, strokeDasharray: "6 3", animation: "dashdraw 0.5s linear infinite" }} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
            className="w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md nodrag nopan"
            onClick={() => setEdges((eds) => eds.filter((e) => e.id !== id))}
          >
            <X size={10} className="text-white" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}



const nodeTypes = {
  "request-inputs": RequestInputsNode,
  "crop-image": CropImageNode,
  "gemini": GeminiNode,
  "response": ResponseNode,
};

const edgeTypes = {
  "deletable": DeleteEdge,
};

const TYPE_COMPAT: Record<string, string[]> = {
  "output-image": ["input-image", "image-vision", "result"],
  "response": ["prompt", "result"],
  "text_field": ["prompt", "system-prompt", "result"],
  "image_field": ["input-image", "image-vision", "result"],
};

function WorkflowCanvas({ id }: { id: string }) {
  const router = useRouter();
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    loadWorkflow, executionStates, setNodeExecutionState,
    clearExecutionStates, toggleHistory, historyOpen, updateNodeData,
    setWorkflowId,
  } = useWorkflowStore();

  // Access temporal store for undo/redo
  const temporalStore = useWorkflowStore.temporal;
  const { fitView } = useReactFlow();

  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log(`[NextFlow] Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL}`);
    setWorkflowId(id);
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    const res = await fetch(`/api/workflows/${id}`);
    const data = await res.json() as { workflow?: { name: string; nodes: Node[]; edges: Edge[] } };
    if (data.workflow) {
      setWorkflowName(data.workflow.name);
      const wfNodes = (data.workflow.nodes as Node[]) || [];
      const wfEdges = (data.workflow.edges as Edge[]) || [];

      const hasRequest = wfNodes.some((n) => n.type === "request-inputs");
      const hasResponse = wfNodes.some((n) => n.type === "response");
      const defaults: Node[] = [];
      if (!hasRequest) defaults.push(getDefaultNode("request-inputs"));
      if (!hasResponse) defaults.push(getDefaultNode("response"));

      loadWorkflow([...defaults, ...wfNodes], wfEdges.map((e) => ({
        ...e, type: "deletable", animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      })));
      setTimeout(() => fitView({ padding: 0.15 }), 100);
    }
  }

  function getDefaultNode(type: string): Node {
    if (type === "request-inputs") return {
      id: "request-inputs-default", type: "request-inputs",
      position: { x: 60, y: 200 },
      data: { fields: [{ id: "text_field", type: "text_field", label: "text_field", value: "" }] },
      deletable: false,
    };
    return {
      id: "response-default", type: "response",
      position: { x: 900, y: 200 },
      data: { results: [] },
      deletable: false,
    };
  }

  useEffect(() => {
    if (nodes.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  async function save() {
    setSaving(true);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges }),
    });
    setSaving(false);
  }

  const isValidConnection: IsValidConnection = useCallback((connection: Connection | Edge) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || source === target) return false;

    const visited = new Set<string>();
    function hasCycle(nodeId: string): boolean {
      if (nodeId === source) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      return edges.filter((e) => e.source === nodeId).some((e) => hasCycle(e.target));
    }
    if (hasCycle(target)) return false;

    if (sourceHandle && targetHandle) {
      const allowed = TYPE_COMPAT[sourceHandle];
      if (allowed && !allowed.includes(targetHandle)) return false;
    }
    return true;
  }, [edges]);

  async function runWorkflow(scope: "full" | "partial" | "single", nodeIds?: string[]) {
    console.log("[Run] clicked, scope:", scope, "id:", id, "nodes:", nodes.length);
    setRunning(true);
    clearExecutionStates();
    const targetIds = scope === "full" ? nodes.map((n) => n.id) : nodeIds || [];
    for (const nid of targetIds) {
      setNodeExecutionState(nid, { status: "running", startTime: Date.now() });
    }
    try {
      // Save latest node data first before running
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      const inputValues: Record<string, string> = {};
      const reqNode = nodes.find((n) => n.type === "request-inputs");
      if (reqNode) {
        const fields = (reqNode.data as { fields: Array<{ id: string; value: string }> }).fields || [];
        for (const f of fields) inputValues[f.id] = f.value;
      }
      // Convert blob URLs to base64
      for (const key of Object.keys(inputValues)) {
        if (inputValues[key]?.startsWith("blob:")) {
          try {
            const res = await fetch(inputValues[key]);
            const buf = await res.arrayBuffer();
            const mime = res.headers.get("content-type") || "image/jpeg";
            inputValues[key] = `data:${mime};base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
          } catch { /* keep as is */ }
        }
      }
      const res = await fetch(`/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, nodeIds, inputValues }),
      });
      const data = await res.json() as {
        run?: { nodeRuns: Array<{ nodeId: string; nodeType: string; status: string; output?: unknown; error?: string }> };
        outputs?: Record<string, unknown>;
        error?: unknown;
      };
      console.log("[Run] API response:", res.status, data);
      if (data.run?.nodeRuns) {
        for (const nr of data.run.nodeRuns) {
          setNodeExecutionState(nr.nodeId, {
            status: nr.status as "success" | "error" | "idle",
            output: nr.output,
            error: nr.error,
            endTime: Date.now(),
          });
          // Update node data with output so it shows inline
          if (nr.status === "success" && nr.output) {
            if (nr.nodeType === "gemini") {
              updateNodeData(nr.nodeId, { response: nr.output as string });
            } else if (nr.nodeType === "crop-image") {
              updateNodeData(nr.nodeId, { outputImage: nr.output as string });
            } else if (nr.nodeType === "response") {
              const out = nr.output as Record<string, unknown>;
              const results = Object.entries(out).map(([sourceId, value]) => {
                const strValue = typeof value === "string" ? value : JSON.stringify(value ?? "");
                const sourceNode = nodes.find((n) => n.id === sourceId);
                const label = sourceNode?.type || sourceId;
                return { sourceId, label, value: strValue };
              });
              updateNodeData(nr.nodeId, { results });
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      for (const nid of targetIds) setNodeExecutionState(nid, { status: "error" });
    } finally {
      setRunning(false);
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${workflowName}.json`; a.click();
  }

  function importJSON() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const { nodes: n, edges: eg } = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
      loadWorkflow(n, eg);
    };
    input.click();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        temporalStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        temporalStore.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [temporalStore]);

  // Suppress unused warning
  void executionStates;

  return (
    <div className="w-full h-screen flex flex-col bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft size={14} />
            <span className="font-medium">{workflowName}</span>
          </button>
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Est 0.01 M</span>
          <span className="text-xs text-gray-400">Bal 5085.54 M</span>
          <button
            onClick={() => runWorkflow("full")}
            disabled={running}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Play size={11} fill="white" />
            {running ? "Running..." : "Run"}
          </button>
          <button onClick={toggleHistory} className="p-1.5 rounded hover:bg-gray-100">
            <Clock size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-shrink-0 w-8">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center hover:bg-gray-50"
          >
            <ChevronLeft size={12} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode={["Delete", "Backspace"]}
            multiSelectionKeyCode="Shift"
            defaultEdgeOptions={{
              type: "deletable",
              animated: true,
              style: { stroke: "#8b5cf6", strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <MiniMap
              position="bottom-right"
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
              nodeColor="#8b5cf6"
            />
            <Controls position="bottom-left" showInteractive={false} />
            <Panel position="bottom-center">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                <button onClick={exportJSON} className="p-1.5 rounded hover:bg-gray-100" title="Export JSON">
                  <FileDown size={14} className="text-gray-500" />
                </button>
                <button onClick={importJSON} className="p-1.5 rounded hover:bg-gray-100" title="Import JSON">
                  <FileDown size={14} className="text-gray-500 rotate-180" />
                </button>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="w-7 h-7 rounded-full bg-gray-900 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <Plus size={14} className="text-white" />
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {historyOpen && <HistorySidebar workflowId={id} onClose={toggleHistory} />}
      </div>

      {pickerOpen && <NodePicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

export default function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ReactFlowProvider>
      <WorkflowCanvas id={id} />
    </ReactFlowProvider>
  );
}
