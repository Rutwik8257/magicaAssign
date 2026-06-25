import { NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const { imageUrl, x, y, width, height } = await req.json() as {
      imageUrl: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };

    // Fetch the image
    const res = await fetch(imageUrl);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image dimensions
    const metadata = await sharp(buffer).metadata();
    const imgWidth = metadata.width || 100;
    const imgHeight = metadata.height || 100;

    // Convert percentage to pixels
    const left = Math.round((x / 100) * imgWidth);
    const top = Math.round((y / 100) * imgHeight);
    const cropWidth = Math.round((width / 100) * imgWidth);
    const cropHeight = Math.round((height / 100) * imgHeight);

    console.log("[crop] image size:", imgWidth, "x", imgHeight);
    console.log("[crop] crop px:", { left, top, cropWidth, cropHeight });

    // Crop using sharp
    const cropped = await sharp(buffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .toBuffer();

    // Return as base64 data URL
    const base64 = cropped.toString("base64");
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (err) {
    console.error("[crop] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
