import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError, ApiError } from "@/lib/rbac";
import { parseFeedbackCsv } from "@/lib/csv";
import { bulkCreateFeedback } from "@/lib/services/feedback.service";
import { classifyAllPendingFeedback } from "@/lib/services/ai-processing.service";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "No file was uploaded.");
    }
    if (file.size === 0) {
      throw new ApiError(400, "The uploaded file is empty.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(400, "File is too large. Maximum size is 5MB.");
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new ApiError(400, "Please upload a .csv file.");
    }

    const text = await file.text();
    const { validRows, failedRows } = parseFeedbackCsv(text);

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          imported: 0,
          failed: failedRows.length,
          errors: failedRows.slice(0, 20),
        },
        { status: failedRows.length > 0 ? 422 : 400 }
      );
    }

    const result = await bulkCreateFeedback(
      workspaceId,
      validRows.map((row) => ({
        content: row.content,
        channel: row.channel,
        customerLabel: row.customer_label || null,
        createdAt: row.created_at,
      }))
    );

    // AI1 AC1: imported rows need classification just as much as a
    // single-entry create does - createMany doesn't return the inserted
    // rows, so this picks up every still-unclassified item in the
    // workspace (which, immediately after an import, is exactly the batch
    // that was just inserted).
    await classifyAllPendingFeedback(workspaceId);

    return NextResponse.json(
      {
        imported: result.count,
        failed: failedRows.length,
        errors: failedRows.slice(0, 20), // cap the echoed error list, not the import itself
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return handleApiError(error);
    }
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string"
    ) {
      throw error;
    }
    console.error("[api/feedback/import] unhandled error:", error);
    return NextResponse.json(
      { error: "Something went wrong processing that file. Please try again." },
      { status: 500 }
    );
  }
}
