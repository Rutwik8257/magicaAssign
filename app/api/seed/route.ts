import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SAMPLE_NODES = [
  {
    id: "node-request-inputs", type: "request-inputs",
    position: { x: 60, y: 280 },
    data: {
      fields: [
        { id: "text_field", type: "text_field", label: "text_field", value: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design." },
        { id: "image_field", type: "image_field", label: "image_field", value: "" },
      ],
    },
    deletable: false,
  },
  { id: "node-crop-1", type: "crop-image", position: { x: 340, y: 330 }, data: { label: "Crop Image #1", x: 20, y: 20, width: 60, height: 60 } },
  { id: "node-crop-2", type: "crop-image", position: { x: 340, y: 520 }, data: { label: "Crop Image #2", x: 0, y: 0, width: 100, height: 50 } },
  { id: "node-gemini-1", type: "gemini", position: { x: 340, y: 60 }, data: { label: "Gemini 3.1 Pro #1", model: "gemini-2.5-flash", prompt: "", systemPrompt: "You are a marketing copywriter. Write a one-paragraph product description." } },
  { id: "node-gemini-2", type: "gemini", position: { x: 660, y: 60 }, data: { label: "Gemini 3.1 Pro #2", model: "gemini-2.5-flash", prompt: "", systemPrompt: "Condense the following product description into a tweet-length hook (under 240 characters)." } },
  { id: "node-gemini-3", type: "gemini", position: { x: 980, y: 220 }, data: { label: "Gemini 3.1 Pro #3 (Final)", model: "gemini-2.5-flash", prompt: "", systemPrompt: "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post." } },
  { id: "node-response", type: "response", position: { x: 1180, y: 300 }, data: { results: [] }, deletable: false },
];

const SAMPLE_EDGES = [
  { id: "e1", type: "deletable", source: "node-request-inputs", sourceHandle: "text_field", target: "node-gemini-1", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  { id: "e2", type: "deletable", source: "node-request-inputs", sourceHandle: "image_field", target: "node-crop-1", targetHandle: "input-image", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e3", type: "deletable", source: "node-request-inputs", sourceHandle: "image_field", target: "node-crop-2", targetHandle: "input-image", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e4", type: "deletable", source: "node-gemini-1", sourceHandle: "response", target: "node-gemini-2", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  { id: "e5", type: "deletable", source: "node-gemini-2", sourceHandle: "response", target: "node-gemini-3", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  { id: "e6", type: "deletable", source: "node-crop-1", sourceHandle: "output-image", target: "node-gemini-3", targetHandle: "image-vision", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e7", type: "deletable", source: "node-crop-2", sourceHandle: "output-image", target: "node-gemini-3", targetHandle: "image-vision", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e8", type: "deletable", source: "node-gemini-3", sourceHandle: "response", target: "node-response", targetHandle: "result", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  { id: "e9", type: "deletable", source: "node-crop-2", sourceHandle: "output-image", target: "node-response", targetHandle: "result", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
];

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.workflow.findFirst({ where: { userId, name: "Trial Task Workflow" } });
  if (existing) return NextResponse.json({ workflow: existing });

  const workflow = await prisma.workflow.create({
    data: { userId, name: "Trial Task Workflow", nodes: SAMPLE_NODES, edges: SAMPLE_EDGES },
  });

  return NextResponse.json({ workflow });
}
