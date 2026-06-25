export type NodeType = "request-inputs" | "crop-image" | "gemini" | "response";
export type HandleType = "text" | "image" | "video" | "audio" | "file";

export interface InputField {
  id: string;
  type: "text_field" | "image_field";
  label: string;
  value: string;
}

export interface RequestInputsData {
  fields: InputField[];
}

export interface CropImageData {
  x: number;
  y: number;
  width: number;
  height: number;
  inputImage?: string;
  outputImage?: string;
}

export interface GeminiData {
  model: string;
  prompt: string;
  systemPrompt: string;
  response?: string;
  settingsOpen?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ResponseData {
  results: { sourceId: string; label: string; value?: string }[];
}

export type WorkflowNodeData =
  | RequestInputsData
  | CropImageData
  | GeminiData
  | ResponseData;

export type NodeStatus = "idle" | "running" | "success" | "error";

export interface NodeExecutionState {
  status: NodeStatus;
  output?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  status: "success" | "failed" | "partial";
  scope: "full" | "partial" | "single";
  duration: number;
  createdAt: string;
  nodeRuns: NodeRunRecord[];
}

export interface NodeRunRecord {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: "success" | "failed" | "skipped";
  inputs: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs: number;
  createdAt: string;
}
