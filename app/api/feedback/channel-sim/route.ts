import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, handleApiError } from "@/lib/rbac";
import { SIMULATED_SOURCES, generateSimulatedBatch } from "@/lib/simulated-channels";
import { bulkCreateFeedback } from "@/lib/services/feedback.service";
import { classifyAllPendingFeedback } from "@/lib/services/ai-processing.service";
import { prisma } from "@/lib/db";

const simulateChannelSchema = z.object({
  source: z.enum(["support_inbox", "app_store"], {
    errorMap: () => ({ message: "Unknown simulated source" }),
  }),
});

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth(Role.ANALYST);
    const body = await request.json();
    const { source } = simulateChannelSchema.parse(body);

    const meta = SIMULATED_SOURCES.find((s) => s.id === source)!;

    // Used only to rotate through the content pool so repeated clicks
    // don't always produce an identical batch - not a real "have we
    // already imported this" dedupe, which would need sourceRef uniqueness
    // this milestone doesn't require.
    const previousImportCount = await prisma.feedback.count({
      where: { workspaceId, channel: meta.channel, sourceRef: { not: null } },
    });

    const batch = generateSimulatedBatch(source, previousImportCount);
    const result = await bulkCreateFeedback(workspaceId, batch);

    // Same reasoning as the CSV import route: bulkCreateFeedback doesn't
    // auto-classify, so the simulated batch needs an explicit pass.
    await classifyAllPendingFeedback(workspaceId);

    return NextResponse.json({ imported: result.count, source: meta.label }, { status: 201 });
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
