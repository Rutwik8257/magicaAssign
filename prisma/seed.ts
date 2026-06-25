import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_NODES = [
  {
    id: "node-request-inputs",
    type: "request-inputs",
    position: { x: 60, y: 280 },
    data: {
      label: "Request-Inputs",
      fields: [
        {
          id: "text_field",
          type: "text_field",
          label: "text_field",
          value: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
        },
        {
          id: "image_field",
          type: "image_field",
          label: "image_field",
          value: "",
        },
      ],
    },
    deletable: false,
  },
  {
    id: "node-crop-1",
    type: "crop-image",
    position: { x: 340, y: 330 },
    data: { label: "Crop Image #1", x: 20, y: 20, width: 60, height: 60 },
  },
  {
    id: "node-crop-2",
    type: "crop-image",
    position: { x: 340, y: 520 },
    data: { label: "Crop Image #2", x: 0, y: 0, width: 100, height: 50 },
  },
  {
    id: "node-gemini-1",
    type: "gemini",
    position: { x: 340, y: 60 },
    data: {
      label: "Gemini 3.1 Pro #1",
      model: "gemini-1.5-pro",
      prompt: "",
      systemPrompt: "You are a marketing copywriter. Write a one-paragraph product description.",
    },
  },
  {
    id: "node-gemini-2",
    type: "gemini",
    position: { x: 660, y: 60 },
    data: {
      label: "Gemini 3.1 Pro #2",
      model: "gemini-1.5-pro",
      prompt: "",
      systemPrompt: "Condense the following product description into a tweet-length hook (under 240 characters).",
    },
  },
  {
    id: "node-gemini-3",
    type: "gemini",
    position: { x: 900, y: 200 },
    data: {
      label: "Gemini 3.1 Pro #3 (Final)",
      model: "gemini-1.5-pro",
      prompt: "",
      systemPrompt: "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
    },
  },
  {
    id: "node-response",
    type: "response",
    position: { x: 1180, y: 300 },
    data: { label: "Response", results: [] },
    deletable: false,
  },
];

const SAMPLE_EDGES = [
  // Request-Inputs.text_field -> Gemini #1 Prompt
  { id: "e1", source: "node-request-inputs", sourceHandle: "text_field", target: "node-gemini-1", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  // Request-Inputs.image_field -> Crop #1 Input Image
  { id: "e2", source: "node-request-inputs", sourceHandle: "image_field", target: "node-crop-1", targetHandle: "input-image", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  // Request-Inputs.image_field -> Crop #2 Input Image
  { id: "e3", source: "node-request-inputs", sourceHandle: "image_field", target: "node-crop-2", targetHandle: "input-image", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  // Gemini #1 Response -> Gemini #2 Prompt
  { id: "e4", source: "node-gemini-1", sourceHandle: "response", target: "node-gemini-2", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  // Gemini #2 Response -> Gemini #3 Prompt
  { id: "e5", source: "node-gemini-2", sourceHandle: "response", target: "node-gemini-3", targetHandle: "prompt", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  // Crop #1 Output -> Gemini #3 Image Vision
  { id: "e6", source: "node-crop-1", sourceHandle: "output-image", target: "node-gemini-3", targetHandle: "image-vision", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  // Crop #2 Output -> Gemini #3 Image Vision
  { id: "e7", source: "node-crop-2", sourceHandle: "output-image", target: "node-gemini-3", targetHandle: "image-vision", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  // Gemini #3 Response -> Response node
  { id: "e8", source: "node-gemini-3", sourceHandle: "response", target: "node-response", targetHandle: "result", animated: true, style: { stroke: "#f97316", strokeWidth: 2 } },
  // Crop #2 Output -> Response node
  { id: "e9", source: "node-crop-2", sourceHandle: "output-image", target: "node-response", targetHandle: "result", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
];

async function seed(userId: string) {
  const existing = await prisma.workflow.findFirst({
    where: { userId, name: "Trial Task Workflow" },
  });

  if (existing) {
    console.log("Sample workflow already exists for this user.");
    return;
  }

  await prisma.workflow.create({
    data: {
      userId,
      name: "Trial Task Workflow",
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
    },
  });

  console.log("✅ Sample workflow created: Trial Task Workflow");
}

// Run with: npx ts-node --project tsconfig.json prisma/seed.ts <userId>
const userId = process.argv[2];
if (!userId) {
  console.error("Usage: npx ts-node prisma/seed.ts <clerk-user-id>");
  process.exit(1);
}

seed(userId).then(() => prisma.$disconnect());
