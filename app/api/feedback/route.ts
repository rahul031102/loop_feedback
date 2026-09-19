import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { createFeedbackSchema, feedbackFiltersSchema } from "@/lib/validations/feedback";
import { createFeedback, listFeedbackPaginated } from "@/lib/services/feedback.service";
import { processSingleFeedbackItem } from "@/lib/services/ai-processing.service";
import { prisma } from "@/lib/db";

// GET /api/feedback - C4: server-side pagination, filters, full-text
// search. Any authenticated role may read (Viewers are read-only, not
// blocked entirely - C2 AC2).
export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const filters = feedbackFiltersSchema.parse(Object.fromEntries(searchParams));

    const result = await listFeedbackPaginated(workspaceId, filters);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

// POST /api/feedback - C2 AC2: "Analysts ingest and manage feedback;
// Viewers are read-only." ANALYST is therefore the minimum role.
export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);
    const body = await request.json();
    const input = createFeedbackSchema.parse(body);

    const feedback = await createFeedback(workspaceId, input);

    // AI1 AC1: "On ingestion, each item is sent to Claude." Best-effort -
    // see processSingleFeedbackItem's own comment for why this never
    // throws. Re-fetch afterward so the response reflects the enriched
    // record (sentiment/theme) when classification succeeded, rather than
    // the pre-AI snapshot from the create call above.
    await processSingleFeedbackItem(workspaceId, feedback);
    const enriched = await prisma.feedback.findUnique({ where: { id: feedback.id } });

    return NextResponse.json({ feedback: enriched ?? feedback }, { status: 201 });
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
