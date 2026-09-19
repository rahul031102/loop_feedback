import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { getDashboardStats, type DashboardRangeDays } from "@/lib/services/dashboard.service";

const VALID_RANGES = new Set([7, 30, 90]);

export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const rangeParam = Number(searchParams.get("range") ?? 30);
    const range = (VALID_RANGES.has(rangeParam) ? rangeParam : 30) as DashboardRangeDays;

    const stats = await getDashboardStats(workspaceId, range);
    return NextResponse.json({ stats, range });
  } catch (error) {
    return handleApiError(error);
  }
}
