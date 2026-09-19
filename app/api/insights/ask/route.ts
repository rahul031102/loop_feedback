import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, ApiError } from "@/lib/rbac";
import { askQuestionSchema } from "@/lib/validations/ai";
import { askLoop } from "@/lib/services/ai-processing.service";

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth();
    const body = await request.json();
    const { question } = askQuestionSchema.parse(body);

    const { response, citedFeedback } = await askLoop(workspaceId, question);

    return NextResponse.json({
      answer: response.answer,
      hasSufficientContext: response.hasSufficientContext,
      citedFeedback,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json(
        { error: "Couldn't generate an answer right now. Please try again." },
        { status: 502 }
      );
    }
    return handleApiError(error);
  }
}
