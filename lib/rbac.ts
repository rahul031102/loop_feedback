import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

// Higher number = more privilege. ADMIN > ANALYST > VIEWER, matching C2's
// role descriptions (Section 08).
const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3,
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: Role;
}

/**
 * The single entry point every route handler and protected Server Component
 * uses to authenticate a request and obtain a workspace-scoped context.
 *
 * This is where Section 06's non-negotiable rule ("every query MUST be
 * filtered by the authenticated user's workspaceId") becomes structural
 * rather than a convention someone has to remember: callers get back a
 * `workspaceId` that came from the verified session, not from anything the
 * client sent, and every service function requires that argument to run a
 * query at all (see lib/services/*.ts).
 *
 * `minimumRole`, when passed, enforces C2 AC3 ("The API enforces roles
 * server-side") - throws a 403 ApiError rather than letting the caller
 * proceed, satisfying AC4 ("Attempting a forbidden action returns 403, not
 * a crash") once combined with handleApiError below.
 */
export async function requireAuth(minimumRole?: Role): Promise<AuthContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new ApiError(401, "You must be signed in to do that.");
  }

  const { id: userId, workspaceId, role } = session.user;

  if (minimumRole && ROLE_RANK[role] < ROLE_RANK[minimumRole]) {
    throw new ApiError(
      403,
      `This action requires the ${minimumRole} role or higher. Your role is ${role}.`
    );
  }

  return { userId, workspaceId, role };
}

/**
 * Converts a caught error into a well-formed API response. ApiError carries
 * an intentional status code (401/403/etc.); anything else is logged
 * server-side and reported to the client as a generic 500, per Section
 * 15.1 ("Handle errors explicitly; show users a friendly message, log the
 * detail").
 *
 * Next.js signals its own internal control flow (redirect(), notFound(),
 * and build-time dynamic-usage detection) by throwing an error tagged with
 * a `digest` property, which must propagate uncaught for the framework to
 * handle correctly - swallowing it into a generic response here would be a
 * real bug, not just a caught exception. That case is re-thrown rather
 * than converted.
 */
export function handleApiError(error: unknown): NextResponse {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string"
  ) {
    throw error;
  }

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: "Something went wrong on our end. Please try again." },
    { status: 500 }
  );
}
