import { NextResponse } from "next/server";
import { z } from "zod";
import { signUpSchema } from "@/lib/validations/auth";
import { signUpNewWorkspace } from "@/lib/services/workspace.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = signUpSchema.parse(body);

    const { workspace, user } = await signUpNewWorkspace(input);

    // passwordHash never leaves the server, even on the happy path.
    return NextResponse.json(
      {
        workspace: { id: workspace.id, name: workspace.name },
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      { status: 201 }
    );
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

    console.error("[api/auth/signup] unhandled error:", error);
    return NextResponse.json(
      { error: "Something went wrong creating your account. Please try again." },
      { status: 500 }
    );
  }
}
