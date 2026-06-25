"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Plus, RotateCcw, Trash2, Upload, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { InputField } from "@/lib/types";
import { NodeWrapper } from "./NodeWrapper";

interface RequestInputsNodeData {
  fields: InputField[];
  [key: string]: unknown;
}

export const RequestInputsNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as RequestInputsNodeData;
  const { updateNodeData } = useWorkflowStore();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const { runNode } = useWorkflowStore();

  const addField = useCallback((type: "text_field" | "image_field") => {
    const existing = nodeData.fields.filter((f) => f.type === type);
    const suffix = existing.length > 0 ? `_${existing.length + 1}` : "";
    const label = type === "text_field" ? `text_field${suffix}` : `image_field${suffix}`;
    const newField: InputField = { id: `${type}_${Date.now()}`, type, label, value: "" };
    updateNodeData(id, { fields: [...nodeData.fields, newField] });
  }, [id, nodeData.fields, updateNodeData]);

  const removeField = useCallback((fieldId: string) => {
    updateNodeData(id, { fields: nodeData.fields.filter((f) => f.id !== fieldId) });
  }, [id, nodeData.fields, updateNodeData]);

  const updateField = useCallback((fieldId: string, key: keyof InputField, value: string) => {
    updateNodeData(id, {
      fields: nodeData.fields.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)),
    });
  }, [id, nodeData.fields, updateNodeData]);

  async function uploadImage(fieldId: string, file: File) {
    setUploadingIds((prev) => new Set(prev).add(fieldId));
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    updateField(fieldId, "value", localUrl);
    const params = {
      auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
      steps: { ":original": { robot: "/upload/handle" } },
    };
    const formData = new FormData();
    formData.append("params", JSON.stringify(params));
    formData.append("file", file);
    try {
      const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body: formData });
      const data = await res.json() as {
        assembly_ssl_url: string;
        ok?: string;
        uploads?: Array<{ ssl_url: string }>;
        results?: { ":original"?: Array<{ ssl_url: string }> };
      };
      console.log("[RequestInputs] upload response:", data.ok);
      let result = data;
      let attempts = 0;
      while (result.ok !== "ASSEMBLY_COMPLETED" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000));
        const poll = await fetch(result.assembly_ssl_url);
        result = await poll.json() as typeof data;
        attempts++;
      }
      const url = result.uploads?.[0]?.ssl_url || result.results?.[":original"]?.[0]?.ssl_url;
      console.log("[RequestInputs] final url:", url);
      if (url) updateField(fieldId, "value", url);
    } catch (err) {
      console.error("[RequestInputs] upload failed:", err);
      // Keep local preview already set
    } finally {
      setUploadingIds((prev) => { const s = new Set(prev); s.delete(fieldId); return s; });
    }
  }

  return (
    <NodeWrapper id={id} type="request-inputs" selected={selected} title="Request-Inputs" undeletable onRun={() => runNode(id)}>
      <div className="flex flex-col gap-2 pt-1">
        {nodeData.fields.map((field, idx) => (
          <div key={field.id} className="relative">
            <div className="flex items-center gap-1 mb-1">
              <input
                value={field.label}
                onChange={(e) => updateField(field.id, "label", e.target.value)}
                className="text-[10px] font-mono text-gray-500 bg-transparent border-none outline-none flex-1 min-w-0"
              />
              <button onClick={() => updateField(field.id, "value", "")} className="text-gray-300 hover:text-gray-500">
                <RotateCcw size={10} />
              </button>
              <button onClick={() => removeField(field.id)} className="text-gray-300 hover:text-red-400">
                <Trash2 size={10} />
              </button>
            </div>

            {field.type === "text_field" ? (
              <textarea
                value={field.value}
                onChange={(e) => updateField(field.id, "value", e.target.value)}
                placeholder="Enter text..."
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2 resize-none h-16 outline-none focus:border-purple-300 nodrag"
              />
            ) : (
              <div>
                <div
                  onClick={() => !uploadingIds.has(field.id) && fileInputRefs.current[field.id]?.click()}
                  className="w-full h-14 bg-gray-50 border border-gray-200 border-dashed rounded-md flex items-center justify-center gap-1.5 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors nodrag"
                >
                  {uploadingIds.has(field.id) ? (
                    <>
                      <Loader2 size={11} className="text-purple-400 animate-spin" />
                      <span className="text-[10px] text-purple-400">Uploading...</span>
                    </>
                  ) : field.value ? (
                    <img src={field.value} alt="preview" className="h-12 object-contain rounded" />
                  ) : (
                    <>
                      <Upload size={11} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400">Upload Image</span>
                    </>
                  )}
                </div>
                <input
                  ref={(el) => { fileInputRefs.current[field.id] = el; }}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(field.id, file);
                  }}
                />
              </div>
            )}

            {/* Output handle per field */}
            <Handle
              type="source"
              position={Position.Right}
              id={field.id}
              style={{
                right: -8,
                top: idx === 0 ? "40%" : "60%",
                background: field.type === "image_field" ? "#3b82f6" : "#f97316",
                width: 10, height: 10, border: "2px solid white",
              }}
            />
          </div>
        ))}

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => addField("text_field")}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-purple-600 transition-colors"
          >
            <Plus size={10} /> text
          </button>
          <button
            onClick={() => addField("image_field")}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-purple-600 transition-colors"
          >
            <Plus size={10} /> image
          </button>
        </div>
      </div>
    </NodeWrapper>
  );
});

RequestInputsNode.displayName = "RequestInputsNode";
