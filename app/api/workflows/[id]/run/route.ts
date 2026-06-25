import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";

const runSchema = z.object({
  scope: z.enum(["full", "partial", "single"]),
  nodeIds: z.array(z.string()).optional(),
  inputValues: z.record(z.unknown()),
});

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

type NodeStatus = "success" | "failed" | "skipped";

interface NodeResult {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: NodeStatus;
  inputs: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs: number;
}

function getLabel(node: WorkflowNode): string {
  const d = node.data;
  if (d.label) return String(d.label);
  if (node.type === "request-inputs") return "Request-Inputs";
  if (node.type === "crop-image") return "Crop Image";
  if (node.type === "gemini") return "Gemini 3.1 Pro";
  if (node.type === "response") return "Response";
  return node.type;
}

function buildDAGLevels(nodes: WorkflowNode[], edges: WorkflowEdge[], targetIds?: string[]): WorkflowNode[][] {
  const all = targetIds ? nodes.filter((n) => targetIds.includes(n.id)) : nodes;
  const inEdges: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const n of all) { inEdges[n.id] = 0; adj[n.id] = []; }
  for (const e of edges) {
    if (all.find((n) => n.id === e.source) && all.find((n) => n.id === e.target)) {
      inEdges[e.target] = (inEdges[e.target] || 0) + 1;
      adj[e.source] = [...(adj[e.source] || []), e.target];
    }
  }

  const levels: WorkflowNode[][] = [];
  let queue = all.filter((n) => inEdges[n.id] === 0);
  const remaining = { ...inEdges };

  while (queue.length > 0) {
    levels.push(queue);
    const next: string[] = [];
    for (const n of queue) {
      for (const dep of (adj[n.id] || [])) {
        remaining[dep]--;
        if (remaining[dep] === 0) next.push(dep);
      }
    }
    queue = all.filter((n) => next.includes(n.id));
  }

  return levels;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scope, nodeIds, inputValues } = parsed.data;
  const nodes = (workflow.nodes as unknown as WorkflowNode[]) || [];
  const edges = (workflow.edges as unknown as WorkflowEdge[]) || [];

  const startTime = Date.now();
  const nodeResults: NodeResult[] = [];
  const outputs: Record<string, unknown> = { ...inputValues };

  const targetNodes = scope === "single" && nodeIds?.length === 1
    ? nodes.filter((n) => n.id === nodeIds[0])
    : scope === "partial" && nodeIds?.length
    ? nodes.filter((n) => nodeIds.includes(n.id))
    : nodes;

  const levels = buildDAGLevels(nodes, edges, targetNodes.map((n) => n.id));

  await prisma.workflow.updateMany({ where: { id, userId }, data: { status: "running" } });

  try {
    for (const level of levels) {
      // Execute all nodes in this level concurrently
      await Promise.all(
        level.map(async (node) => {
          const nodeStart = Date.now();
          try {
            if (node.type === "request-inputs") {
              const data = node.data as { fields?: Array<{ id: string; value: string }> };
              const out: Record<string, string> = {};
              for (const f of data.fields || []) {
                out[f.id] = (inputValues[f.id] as string) || f.value || "";
              }
              outputs[node.id] = out;
              nodeResults.push({
                nodeId: node.id, nodeType: node.type, nodeLabel: getLabel(node),
                status: "success", inputs: inputValues, output: out,
                durationMs: Date.now() - nodeStart,
              });
            } else if (node.type === "crop-image") {
              const data = node.data as { x: number; y: number; width: number; height: number; inputImage?: string };
              const inputEdge = edges.find((e) => e.target === node.id && e.targetHandle === "input-image");
              console.log("[crop-image] node.id:", node.id, "inputEdge:", inputEdge, "all edges:", edges.map(e => e.target + "-" + e.targetHandle));

              // Resolve image URL from connected edge or node data
              let imageUrl = "";
              if (inputEdge) {
                const sourceOutput = outputs[inputEdge.source];
                console.log("[crop-image] sourceOutput:", sourceOutput, "inputValues:", inputValues);
                if (inputEdge.sourceHandle && typeof sourceOutput === "object" && sourceOutput !== null) {
                  imageUrl = (sourceOutput as Record<string, string>)[inputEdge.sourceHandle] || "";
                } else if (typeof sourceOutput === "string") {
                  imageUrl = sourceOutput;
                }
                if (!imageUrl) {
                  const sourceNode = nodes.find((n) => n.id === inputEdge.source);
                  console.log("[crop-image] sourceNode:", sourceNode?.type, "fields:", (sourceNode?.data as {fields?: unknown[]})?.fields);
                  if (sourceNode?.type === "request-inputs") {
                    const fields = (sourceNode.data as { fields?: Array<{ id: string; type: string; value: string }> }).fields || [];
                    const field = inputEdge.sourceHandle ? fields.find((f) => f.id === inputEdge.sourceHandle) : fields.find((f) => f.type === "image_field");
                    console.log("[crop-image] matched field:", field?.id, "value prefix:", field?.value?.substring(0, 50));
                    imageUrl = field?.value || "";
                    // Also check inputValues passed from client
                    if (!imageUrl && inputEdge.sourceHandle) imageUrl = (inputValues[inputEdge.sourceHandle] as string) || "";
                  }
                }
              }
              if (!imageUrl) imageUrl = data.inputImage || "";
              // Check inputValues directly for any image fields as last resort
              if (!imageUrl) {
                for (const [k, v] of Object.entries(inputValues)) {
                  if (typeof v === "string" && (v.startsWith("http") || v.startsWith("data:"))) {
                    imageUrl = v;
                    console.log("[crop-image] found image in inputValues key:", k);
                    break;
                  }
                }
              }
              console.log("[crop-image] final imageUrl:", imageUrl?.substring(0, 80));

              console.log("[crop-image] imageUrl:", imageUrl?.substring(0, 80), "x:", data.x, "y:", data.y, "w:", data.width, "h:", data.height);

              let output: string | null = null;
              if (imageUrl && !imageUrl.startsWith("blob:")) {
                try {
                  let buffer: Buffer;
                  let mimeType = "image/jpeg";
                  if (imageUrl.startsWith("data:")) {
                    const [meta, base64] = imageUrl.split(",");
                    mimeType = meta.split(":")[1].split(";")[0];
                    buffer = Buffer.from(base64, "base64");
                  } else {
                    const imageRes = await fetch(imageUrl);
                    const arrayBuffer = await imageRes.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                    mimeType = imageRes.headers.get("content-type") || "image/jpeg";
                  }
                  const metadata = await sharp(buffer).metadata();
                  const imgW = metadata.width || 100;
                  const imgH = metadata.height || 100;
                  const left = Math.round(((data.x ?? 0) / 100) * imgW);
                  const top = Math.round(((data.y ?? 0) / 100) * imgH);
                  const cropW = Math.max(1, Math.round(((data.width ?? 100) / 100) * imgW));
                  const cropH = Math.max(1, Math.round(((data.height ?? 100) / 100) * imgH));
                  console.log("[crop-image] px:", { imgW, imgH, left, top, cropW, cropH });
                  const cropped = await sharp(buffer).extract({ left, top, width: cropW, height: cropH }).toBuffer();
                  output = `data:${mimeType};base64,${cropped.toString("base64")}`;
                  console.log("[crop-image] success, output size:", output.length);
                } catch (cropErr) {
                  console.error("[crop-image] error:", cropErr);
                }
              } else if (imageUrl.startsWith("blob:")) {
                console.log("[crop-image] blob URL detected - server cannot access blob URLs. Please upload the image first.");
              } else {
                console.log("[crop-image] no imageUrl found");
              }

              outputs[node.id] = output;
              nodeResults.push({
                nodeId: node.id, nodeType: node.type, nodeLabel: getLabel(node),
                status: output !== null ? "success" : "failed",
                inputs: { imageUrl, ...data }, output: output ?? undefined,
                durationMs: Date.now() - nodeStart,
              });
            } else if (node.type === "gemini") {
              const data = node.data as { prompt?: string; systemPrompt?: string; model?: string; temperature?: number; maxTokens?: number };
              const promptEdge = edges.find((e) => e.target === node.id && e.targetHandle === "prompt");
              const imageEdges = edges.filter((e) => e.target === node.id && e.targetHandle === "image-vision");

              // Resolve prompt from edge, inputValues, or node data
              let prompt = data.prompt || "";
              if (promptEdge) {
                const sourceOutput = outputs[promptEdge.source];
                if (promptEdge.sourceHandle && typeof sourceOutput === "object" && sourceOutput !== null) {
                  prompt = (sourceOutput as Record<string, string>)[promptEdge.sourceHandle] || prompt;
                } else if (typeof sourceOutput === "string") {
                  prompt = sourceOutput || prompt;
                }
                // Fallback: read from source node data or inputValues directly
                if (!prompt || prompt === data.prompt) {
                  if (promptEdge.sourceHandle) {
                    prompt = (inputValues[promptEdge.sourceHandle] as string) || prompt;
                  }
                  if (!prompt) {
                    const sourceNode = nodes.find((n) => n.id === promptEdge.source);
                    if (sourceNode?.type === "request-inputs") {
                      const fields = (sourceNode.data as { fields?: Array<{ id: string; type: string; value: string }> }).fields || [];
                      const field = promptEdge.sourceHandle ? fields.find((f) => f.id === promptEdge.sourceHandle) : fields.find((f) => f.type === "text_field");
                      prompt = field?.value || prompt;
                    }
                  }
                }
              }
              console.log("[gemini] resolved prompt:", prompt?.substring(0, 100));

              // Resolve image URLs from edges
              const imageUrls = imageEdges.map((e) => {
                let url = "";
                const sourceOutput = outputs[e.source];
                if (e.sourceHandle && typeof sourceOutput === "object" && sourceOutput !== null) {
                  url = (sourceOutput as Record<string, string>)[e.sourceHandle] || "";
                } else if (typeof sourceOutput === "string") {
                  url = sourceOutput;
                }
                if (!url && e.sourceHandle) url = (inputValues[e.sourceHandle] as string) || "";
                return url;
              }).filter((u) => u && !u.startsWith("blob:"));

              // Call Gemini directly
              const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
              const model = genAI.getGenerativeModel({
                model: data.model || "gemini-1.5-flash-latest",
                systemInstruction: data.systemPrompt,
                generationConfig: { temperature: data.temperature ?? 0.7, maxOutputTokens: data.maxTokens ?? 2048 },
              });
              const contentParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [prompt];
              for (const url of imageUrls) {
                const res = await fetch(url);
                const buf = await res.arrayBuffer();
                contentParts.push({ inlineData: { mimeType: res.headers.get("content-type") || "image/jpeg", data: Buffer.from(buf).toString("base64") } });
              }
              let output: string;
              try {
                const result = await model.generateContent(contentParts);
                output = result.response.text();
                console.log("[gemini] success, output length:", output.length);
              } catch (geminiErr) {
                console.error("[gemini] API error:", geminiErr);
                throw geminiErr;
              }

              outputs[node.id] = output;
              nodeResults.push({
                nodeId: node.id, nodeType: node.type, nodeLabel: getLabel(node),
                status: "success",
                inputs: { prompt, systemPrompt: data.systemPrompt }, output,
                durationMs: Date.now() - nodeStart,
              });
            } else if (node.type === "response") {
              const resultEdges = edges.filter((e) => e.target === node.id);
              console.log("[response] resultEdges:", resultEdges.map(e => ({ source: e.source, sourceHandle: e.sourceHandle, target: e.target })));
              console.log("[response] outputs keys:", Object.keys(outputs));
              const out: Record<string, unknown> = {};
              for (const e of resultEdges) { 
                out[e.source] = outputs[e.source];
                console.log("[response] edge source:", e.source, "value type:", typeof outputs[e.source], "value length:", String(outputs[e.source] || "").length);
              }
              outputs[node.id] = out;
              nodeResults.push({
                nodeId: node.id, nodeType: node.type, nodeLabel: getLabel(node),
                status: "success", inputs: {}, output: out,
                durationMs: Date.now() - nodeStart,
              });
            }
          } catch (err) {
            nodeResults.push({
              nodeId: node.id, nodeType: node.type, nodeLabel: getLabel(node),
              status: "failed", inputs: {}, error: String(err),
              durationMs: Date.now() - nodeStart,
            });
          }
        })
      );
    }
  } finally {
    await prisma.workflow.updateMany({ where: { id, userId }, data: { status: "idle" } });
  }

  const allSuccess = nodeResults.every((r) => r.status === "success");
  const allFailed = nodeResults.every((r) => r.status === "failed");
  const runStatus = allSuccess ? "success" : allFailed ? "failed" : "partial";

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: id,
      userId,
      status: runStatus,
      scope,
      duration: Date.now() - startTime,
      nodeRuns: {
        create: nodeResults.map((r) => ({
          nodeId: r.nodeId,
          nodeType: r.nodeType,
          nodeLabel: r.nodeLabel,
          status: r.status,
          inputs: r.inputs as object,
          output: r.output as object ?? undefined,
          error: r.error,
          durationMs: r.durationMs,
        })),
      },
    },
    include: { nodeRuns: true },
  });

  return NextResponse.json({ run, outputs });
  } catch (err) {
    console.error("[run route error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
