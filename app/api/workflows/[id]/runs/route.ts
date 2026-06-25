import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: id, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ runs });
}
