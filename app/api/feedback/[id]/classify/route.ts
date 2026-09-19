import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError, ApiError } from "@/lib/rbac";
import { reclassifyFeedback } from "@/lib/services/ai-processing.service";
import { getFeedbackById } from "@/lib/services/feedback.service";

// AI1 AC4: "A manual 're-classify' action exists for corrections."
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);

    const result = await reclassifyFeedback(workspaceId, params.id);
    if (!result.success) {
      throw new ApiError(422, result.error ?? "Classification failed.");
    }

    const feedback = await getFeedbackById(workspaceId, params.id);
    return NextResponse.json({ feedback });
  } catch (error) {
    return handleApiError(error);
  }
}
