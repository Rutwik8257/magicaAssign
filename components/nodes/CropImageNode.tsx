"use client";

import { memo, useCallback, useRef } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { RotateCcw, Plus, Minus, Upload, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { NodeWrapper } from "./NodeWrapper";
import { useState } from "react";

interface CropImageData {
  x: number;
  y: number;
  width: number;
  height: number;
  inputImage?: string;
  outputImage?: string;
  [key: string]: unknown;
}

const sliders = [
  { key: "x", label: "X Position (%)", color: "#ec4899", default: 0 },
  { key: "y", label: "Y Position (%)", color: "#22c55e", default: 0 },
  { key: "width", label: "Width (%)", color: "#8b5cf6", default: 100 },
  { key: "height", label: "Height (%)", color: "#3b82f6", default: 100 },
] as const;

export const CropImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CropImageData;
  const { updateNodeData, runNode } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const update = useCallback((key: string, value: number) => {
    updateNodeData(id, { [key]: Math.min(100, Math.max(0, value)) });
  }, [id, updateNodeData]);

  async function uploadImage(file: File) {
    setUploading(true);
    // Use local object URL immediately for preview, upload in background
    const localUrl = URL.createObjectURL(file);
    updateNodeData(id, { inputImage: localUrl });
    try {
      const params = {
        auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
        steps: { ":original": { robot: "/upload/handle" } },
      };
      const formData = new FormData();
      formData.append("params", JSON.stringify(params));
      formData.append("file", file);
      const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body: formData });
      const data = await res.json() as {
        assembly_ssl_url: string;
        ok?: string;
        uploads?: Array<{ ssl_url: string }>;
        results?: { ":original"?: Array<{ ssl_url: string }> };
      };
      console.log("[CropImage] upload response:", data.ok, "uploads:", data.uploads?.length);
      let result = data;
      let attempts = 0;
      while (result.ok !== "ASSEMBLY_COMPLETED" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000));
        const poll = await fetch(result.assembly_ssl_url);
        result = await poll.json() as typeof data;
        console.log("[CropImage] poll attempt", attempts, "ok:", result.ok);
        attempts++;
      }
      // Try uploads array first, then results
      const url = result.uploads?.[0]?.ssl_url || result.results?.[":original"]?.[0]?.ssl_url;
      console.log("[CropImage] final url:", url);
      if (url) updateNodeData(id, { inputImage: url });
    } catch (err) {
      console.error("[CropImage] upload failed:", err);
      // Keep local preview
    } finally {
      setUploading(false);
    }
  }

  return (
    <NodeWrapper id={id} type="crop-image" selected={selected} title="Crop Image" estimatedCost="~0.005 M" onRun={() => runNode(id)}>
      {/* Input Image */}
      <div className="mb-3 relative">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ec4899]" />
            <span className="text-xs text-gray-600 font-medium">Input Image*</span>
          </div>
          <div className="flex items-center gap-1">
            {nodeData.inputImage && (
              <button
                onClick={() => updateNodeData(id, { inputImage: "" })}
                className="text-xs text-red-400 hover:text-red-600"
              >
                ✕ Clear
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-gray-400 flex items-center gap-0.5 hover:text-purple-500"
            >
              <Upload size={10} /> Upload
            </button>
          </div>
          <Handle
            type="target"
            position={Position.Left}
            id="input-image"
            style={{ left: -8, top: "50%", background: "#ec4899", width: 10, height: 10, border: "2px solid white" }}
          />
        </div>
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="w-full h-14 bg-gray-50 border border-dashed border-gray-200 rounded-md flex items-center justify-center cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors nodrag"
        >
          {uploading ? (
            <><Loader2 size={11} className="text-purple-400 animate-spin" /><span className="text-[10px] text-purple-400 ml-1">Uploading...</span></>
          ) : nodeData.inputImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={nodeData.inputImage} alt="input" className="h-12 object-contain rounded" />
              {nodeData.inputImage.startsWith("blob:") && (
                <span className="absolute bottom-0 text-[9px] text-orange-400">uploading to server...</span>
              )}
            </div>
          ) : (
            <><Upload size={11} className="text-gray-400" /><span className="text-[10px] text-gray-400 ml-1">Click or connect image</span></>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
        />
      </div>

      {/* Sliders */}
      {sliders.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5 mb-2 nodrag">
          <Handle
            type="target"
            position={Position.Left}
            id={s.key}
            style={{ left: -8, background: s.color, width: 10, height: 10, border: "2px solid white" }}
          />
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
          <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">{s.label}</span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => update(s.key, (nodeData[s.key] ?? s.default) - 1)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <Minus size={9} />
          </button>
          <input
            type="range" min={0} max={100}
            value={nodeData[s.key] ?? s.default}
            onChange={(e) => update(s.key, Number(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 h-1 accent-purple-500 nodrag"
          />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => update(s.key, (nodeData[s.key] ?? s.default) + 1)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <Plus size={9} />
          </button>
          <span className="text-[10px] text-gray-700 w-5 text-right flex-shrink-0">{nodeData[s.key] ?? s.default}</span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => update(s.key, s.default)}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0"
          >
            <RotateCcw size={9} />
          </button>
        </div>
      ))}

      {/* Output Image */}
      <div className="mt-3 pt-2 border-t border-gray-100 relative">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-xs text-gray-600">Output Image</span>
        </div>
        {nodeData.outputImage ? (
          <img src={nodeData.outputImage as string} alt="output" className="w-full h-16 object-contain rounded border border-gray-100" />
        ) : (
          <div className="text-[10px] text-gray-400 italic">No output yet</div>
        )}
        <Handle
          type="source"
          position={Position.Right}
          id="output-image"
          style={{ right: -8, background: "#3b82f6", width: 10, height: 10, border: "2px solid white" }}
        />
      </div>
    </NodeWrapper>
  );
});

CropImageNode.displayName = "CropImageNode";
