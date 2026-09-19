import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { getThemeTrends } from "@/lib/services/theme.service";

export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const periodDays = Number(searchParams.get("period") ?? 30);
    const validPeriod = [7, 30, 90].includes(periodDays) ? periodDays : 30;

    const trends = await getThemeTrends(workspaceId, validPeriod);
    return NextResponse.json({ trends, periodDays: validPeriod });
  } catch (error) {
    return handleApiError(error);
  }
}
