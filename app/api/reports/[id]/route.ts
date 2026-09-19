import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { getReportById } from "@/lib/services/report.service";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireAuth();
    const report = await getReportById(workspaceId, params.id);

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}
