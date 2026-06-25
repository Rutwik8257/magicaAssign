"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, Image as ImageIcon, Sparkles } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Node } from "@xyflow/react";

interface NodePickerProps {
  onClose: () => void;
}

const NODE_CATEGORIES = {
  Image: [
    {
      type: "crop-image",
      label: "Crop Image",
      description: "Crop an image using FFmpeg via Trigger.dev",
      icon: <ImageIcon size={16} className="text-blue-500" />,
    },
  ],
  LLM: [
    {
      type: "gemini",
      label: "Gemini 3.1 Pro",
      description: "Google Gemini LLM with vision support",
      icon: <Sparkles size={16} className="text-orange-500" />,
    },
  ],
};

const ALL_NODES = Object.values(NODE_CATEGORIES).flat();

export function NodePicker({ onClose }: NodePickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const { nodes, setNodes } = useWorkflowStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const tabs = ["All", "Recent", "Image", "Video", "Audio", "Others"];

  const filtered = ALL_NODES.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  function addNode(type: string, label: string) {
    const count = nodes.filter((n) => n.type === type).length;
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: type === "crop-image"
        ? { x: 0, y: 0, width: 100, height: 100, label: `${label} #${count + 1}` }
        : { prompt: "", systemPrompt: "", model: "gemini-2.0-flash", label: `${label} #${count + 1}` },
    };
    setNodes([...nodes, newNode]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-16" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[480px] max-h-[420px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search size={14} className="text-gray-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeTab === t
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Nodes */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
          {filtered.map((node) => (
            <button
              key={node.type}
              onClick={() => addNode(node.type, node.label)}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
                {node.icon}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{node.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{node.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
