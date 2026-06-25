import { create } from "zustand";
import { temporal } from "zundo";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
} from "@xyflow/react";
import { NodeExecutionState, NodeStatus } from "@/lib/types";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  executionStates: Record<string, NodeExecutionState>;
  historyOpen: boolean;
  workflowId: string | null;
  setWorkflowId: (id: string) => void;
  runNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  setNodeExecutionState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  clearExecutionStates: () => void;
  toggleHistory: () => void;
  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      executionStates: {},
      historyOpen: false,
      workflowId: null,

      setWorkflowId: (id) => set({ workflowId: id }),

      runNode: (nodeId) => {
        const { workflowId, nodes, edges } = get();
        if (!workflowId) return;
        const reqNode = nodes.find((n) => n.type === "request-inputs");
        const inputValues: Record<string, string> = {};
        if (reqNode) {
          const fields = (reqNode.data as { fields: Array<{ id: string; value: string }> }).fields || [];
          for (const f of fields) inputValues[f.id] = f.value;
        }

        // Convert blob URLs to base64 before sending to server
        const convertAndRun = async () => {
          for (const key of Object.keys(inputValues)) {
            if (inputValues[key]?.startsWith("blob:")) {
              try {
                const res = await fetch(inputValues[key]);
                const buf = await res.arrayBuffer();
                const mime = res.headers.get("content-type") || "image/jpeg";
                inputValues[key] = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
              } catch { /* keep blob url */ }
            }
          }
          set((s) => ({
            executionStates: { ...s.executionStates, [nodeId]: { status: "running", startTime: Date.now() } },
          }));
          return fetch(`/api/workflows/${workflowId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodes, edges }),
          }).then(() =>
            fetch(`/api/workflows/${workflowId}/run`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scope: "single", nodeIds: [nodeId], inputValues }),
            })
          );
        };

        set((s) => ({
          executionStates: { ...s.executionStates, [nodeId]: { status: "running", startTime: Date.now() } },
        }));

        convertAndRun()
          .then((r) => r.json())
          .then((data: { run?: { nodeRuns: Array<{ nodeId: string; nodeType: string; status: string; output?: unknown; error?: string }> } }) => {
            if (data.run?.nodeRuns) {
              for (const nr of data.run.nodeRuns) {
                set((s) => ({
                  executionStates: { ...s.executionStates, [nr.nodeId]: { status: nr.status as "success" | "error" | "idle", output: nr.output, error: nr.error, endTime: Date.now() } },
                  nodes: s.nodes.map((n) => {
                    if (n.id !== nr.nodeId || nr.status !== "success" || !nr.output) return n;
                    if (nr.nodeType === "gemini") return { ...n, data: { ...n.data, response: nr.output } };
                    if (nr.nodeType === "crop-image") return { ...n, data: { ...n.data, outputImage: nr.output } };
                    if (nr.nodeType === "response") {
                      const out = nr.output as Record<string, unknown>;
                      return { ...n, data: { ...n.data, results: Object.entries(out).map(([sourceId, value]) => ({ sourceId, label: sourceId, value: typeof value === "string" ? value : JSON.stringify(value ?? "") })) } };
                    }
                    return n;
                  }),
                }));
              }
            }
          })
          .catch(() => {
            set((s) => ({ executionStates: { ...s.executionStates, [nodeId]: { status: "error" } } }));
          });

        void edges;
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set((s) => ({ edges: typeof edges === "function" ? edges(s.edges) : edges })),

      onNodesChange: (changes) =>
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

      onEdgesChange: (changes) =>
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

      onConnect: (connection) =>
        set((s) => ({
          edges: addEdge(
            { ...connection, type: "deletable", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
            s.edges
          ),
        })),

      updateNodeData: (nodeId, data) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        })),

      setNodeExecutionState: (nodeId, state) =>
        set((s) => ({
          executionStates: {
            ...s.executionStates,
            [nodeId]: { ...s.executionStates[nodeId], ...state },
          },
        })),

      setNodeStatus: (nodeId, status) =>
        set((s) => ({
          executionStates: {
            ...s.executionStates,
            [nodeId]: { ...s.executionStates[nodeId], status },
          },
        })),

      clearExecutionStates: () => set({ executionStates: {} }),

      toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),

      loadWorkflow: (nodes, edges) => set({ nodes, edges }),
    }),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
    }
  )
);
