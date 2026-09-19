import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { listThemesWithCounts } from "@/lib/services/theme.service";

export async function GET() {
  try {
    const { workspaceId } = await requireAuth();
    const themes = await listThemesWithCounts(workspaceId);
    return NextResponse.json({ themes });
  } catch (error) {
    return handleApiError(error);
  }
}
