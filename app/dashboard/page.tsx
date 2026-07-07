"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  updatedAt: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[NextFlow] Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL}`);
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    const res = await fetch("/api/workflows");
    const data = await res.json() as { workflows: Workflow[] };
    setWorkflows(data.workflows || []);
    setLoading(false);
  }

  async function loadSampleWorkflow() {
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json() as { workflow: Workflow };
    router.push(`/workflow/${data.workflow.id}`);
  }

  async function createWorkflow() {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Workflow" }),
    });
    const data = await res.json() as { workflow: Workflow };
    router.push(`/workflow/${data.workflow.id}`);
  }

  async function deleteWorkflow(id: string) {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    setOpenMenuId(null);
  }

  async function renameWorkflow(id: string) {
    if (!renameValue.trim()) return;
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name: renameValue } : w)));
    setRenamingId(null);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 bg-white flex flex-col py-4 px-3 gap-1 fixed h-full z-10">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-[15px] text-gray-900">NextFlow</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-900 text-left">
            Workflows
          </button>
        </nav>
        <div className="mt-auto">
          <UserButton />
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {user?.firstName ? `Welcome back, ${user.firstName}` : "Your AI workflows"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSampleWorkflow}
                className="flex items-center gap-2 border border-purple-300 text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Zap size={16} />
                Load Sample Workflow
              </button>
              <button
                onClick={createWorkflow}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                New Workflow
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Zap size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No workflows yet</h3>
              <p className="text-sm text-gray-500 mb-6">Create your first workflow to get started</p>
              <button
                onClick={createWorkflow}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Create Workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition-all group cursor-pointer relative"
                  onClick={() => router.push(`/workflow/${wf.id}`)}
                >
                  <div className="flex items-start justify-between">
                    {renamingId === wf.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameWorkflow(wf.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameWorkflow(wf.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-gray-900 border-b border-purple-400 outline-none bg-transparent text-sm w-full"
                      />
                    ) : (
                      <h3 className="font-medium text-gray-900 text-sm truncate flex-1">{wf.name}</h3>
                    )}
                    <div className="relative ml-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === wf.id ? null : wf.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all"
                      >
                        <MoreHorizontal size={14} className="text-gray-500" />
                      </button>
                      {openMenuId === wf.id && (
                        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-36 py-1">
                          <button
                            onClick={() => router.push(`/workflow/${wf.id}`)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            <ExternalLink size={13} /> Open
                          </button>
                          <button
                            onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setOpenMenuId(null); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            <Pencil size={13} /> Rename
                          </button>
                          <button
                            onClick={() => deleteWorkflow(wf.id)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
                    </span>
                    {wf.status === "running" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Running
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
