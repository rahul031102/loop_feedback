import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError, ApiError } from "@/lib/rbac";
import { updateMemberRoleSchema } from "@/lib/validations/workspace";
import { updateMemberRole, removeMember } from "@/lib/services/workspace.service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId, userId } = await requireAuth(Role.ADMIN);
    const body = await request.json();
    const input = updateMemberRoleSchema.parse(body);

    const member = await updateMemberRole(workspaceId, params.id, input, userId);
    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { workspaceId, userId } = await requireAuth(Role.ADMIN);
    await removeMember(workspaceId, params.id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
