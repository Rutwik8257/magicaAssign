import { task } from "@trigger.dev/sdk";

interface CropImageInput {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 120,
  run: async (payload: CropImageInput): Promise<{ outputUrl: string }> => {
    // MANDATORY: 30+ second artificial delay (hard requirement)
    await new Promise((resolve) => setTimeout(resolve, 31000));

    // Use Transloadit to crop the image via FFmpeg
    const assemblyParams = {
      auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
      steps: {
        ":original": { robot: "/upload/handle" },
        cropped: {
          use: ":original",
          robot: "/image/resize",
          crop_x1: payload.x / 100,
          crop_y1: payload.y / 100,
          crop_x2: (payload.x + payload.width) / 100,
          crop_y2: (payload.y + payload.height) / 100,
          imagemagick_stack: "v3.0.1",
          output_meta: { aspect_ratio: false },
        },
      },
    };

    // Fetch the image and upload to Transloadit
    const imageRes = await fetch(payload.imageUrl);
    const imageBlob = await imageRes.blob();

    const formData = new FormData();
    formData.append("params", JSON.stringify(assemblyParams));
    formData.append("file", imageBlob, "image.jpg");

    const response = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: formData,
    });

    const assembly = await response.json() as {
      assembly_id: string;
      assembly_ssl_url: string;
      results?: { cropped?: Array<{ ssl_url: string }> };
    };

    // Poll for assembly completion
    let result = assembly;
    while (result.results?.cropped === undefined) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(assembly.assembly_ssl_url);
      result = await pollRes.json() as typeof assembly;
      if (
        (result as unknown as { error?: string }).error ||
        (result as unknown as { ok?: string }).ok === "ASSEMBLY_COMPLETED"
      )
        break;
    }

    const outputUrl = result.results?.cropped?.[0]?.ssl_url || payload.imageUrl;
    return { outputUrl };
  },
});
