import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { processPendingBatch, countPendingFeedback } from "@/lib/services/ai-processing.service";

export async function POST() {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);
    const result = await processPendingBatch(workspaceId, 10);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { workspaceId } = await requireAuth();
    const remaining = await countPendingFeedback(workspaceId);
    return NextResponse.json({ remaining });
  } catch (error) {
    return handleApiError(error);
  }
}
