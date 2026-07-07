import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  imageUrls?: string[];
  temperature?: number;
  maxTokens?: number;
}

export const geminiTask = task({
  id: "gemini-run",
  maxDuration: 120,
  run: async (payload: GeminiInput): Promise<{ response: string }> => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: payload.model || "gemini-2.5-flash",
      systemInstruction: payload.systemPrompt,
      generationConfig: {
        temperature: payload.temperature ?? 0.7,
        maxOutputTokens: payload.maxTokens ?? 2048,
      },
    });

    const contentParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [];
    contentParts.push(payload.prompt);

    if (payload.imageUrls?.length) {
      for (const url of payload.imageUrls) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const base64 = Buffer.from(buf).toString("base64");
        const mime = res.headers.get("content-type") || "image/jpeg";
        contentParts.push({ inlineData: { mimeType: mime, data: base64 } });
      }
    }

    const result = await model.generateContent(contentParts);
    const text = result.response.text();
    return { response: text };
  },
});
