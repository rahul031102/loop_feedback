import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { updateFeedbackStatusSchema } from "@/lib/validations/feedback";
import { getFeedbackById, updateFeedbackStatus } from "@/lib/services/feedback.service";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireAuth();
    const feedback = await getFeedbackById(workspaceId, params.id);

    if (!feedback) {
      // Deliberately identical to a cross-tenant lookup: a caller can't
      // distinguish "doesn't exist" from "belongs to another workspace,"
      // which is what Section 06's isolation rule requires.
      return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    return handleApiError(error);
  }
}

// C4 AC4: "Status workflow: NEW -> REVIEWED -> ACTIONED, changeable
// inline." C2 AC2: Analysts manage feedback, Viewers are read-only.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);
    const body = await request.json();
    const { status } = updateFeedbackStatusSchema.parse(body);

    const feedback = await updateFeedbackStatus(workspaceId, params.id, status);
    if (!feedback) {
      return NextResponse.json({ error: "Feedback item not found." }, { status: 404 });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
