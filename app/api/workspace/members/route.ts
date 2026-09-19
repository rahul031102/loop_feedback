import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { addMemberSchema } from "@/lib/validations/workspace";
import { listMembers, addMember } from "@/lib/services/workspace.service";

export async function GET() {
  try {
    const { workspaceId } = await requireAuth(Role.ADMIN);
    const members = await listMembers(workspaceId);
    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth(Role.ADMIN);
    const body = await request.json();
    const input = addMemberSchema.parse(body);

    const member = await addMember(workspaceId, input);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return handleApiError(error);
  }
}
