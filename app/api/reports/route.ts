import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError, ApiError } from "@/lib/rbac";
import { generateReportSchema } from "@/lib/validations/reports";
import { generateVoCReport, listReports } from "@/lib/services/report.service";
import { formatDate } from "@/lib/utils";

export async function GET() {
  try {
    const { workspaceId } = await requireAuth();
    const reports = await listReports(workspaceId);
    return NextResponse.json({ reports });
  } catch (error) {
    return handleApiError(error);
  }
}

// AI4 AC1: "One click generates a report for a chosen period."
export async function POST(request: Request) {
  try {
    const { workspaceId, userId } = await requireAuth(Role.ANALYST);
    const body = await request.json();
    const { periodDays } = generateReportSchema.parse(body);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const title = `Voice of Customer — ${formatDate(periodStart)} to ${formatDate(periodEnd)}`;

    try {
      const report = await generateVoCReport(workspaceId, userId, periodStart, periodEnd, title);
      return NextResponse.json({ report }, { status: 201 });
    } catch (error) {
      throw new ApiError(
        502,
        error instanceof Error
          ? `Couldn't generate the report: ${error.message}`
          : "Couldn't generate the report."
      );
    }
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
